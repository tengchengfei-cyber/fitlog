/**
 * 确定性规则层（阶段 4）。
 *
 * analyzeSession({ session, sessions, exercises, muscles, evidence, now }) → AnalysisFacts
 *
 * 设计约束（契约 3.8 / 4.5 / 硬约束）：
 * - 纯函数、无副作用：不读 localStorage、不写 DOM、不调用 Date.now()（除非调用方未提供 now 且会话无时间）；
 * - 完全确定性：同一输入（含 now）两次调用结果深比较相等；
 * - 只统计 kind === 'working' 且已完成的组；热身组不计入正式训练量；
 * - 肌群分布是「动作通常涉及的肌群映射」的估计，不是精确剂量，也不推断个体激活程度；
 * - 样本不足（窗口内已完成训练 < 3 次）时只陈述本次事实，不产出长期分布结论；
 * - 安全优先：记录中出现危险信号或 postCheck.status === 'red-flag' 时进入安全拦截。
 *
 * 数据口径：
 * - 直接组：动作主肌群每完成 1 个正式组 +1；
 * - 间接组：动作次肌群每完成 1 个正式组 +0.5（estimatedSets = directSets + indirectSets × 0.5，保留 1 位小数）；
 * - 吨位：weightKg × reps 求和；perSide 时 ×2；缺重量或次数的组不计吨位，也不做推测；
 * - 历史窗口：以 now（或当前会话结束时间）为锚点，按 startedAt 聚合近 7 / 14 天已完成的训练，
 *   窗口包含当前会话（结果中注明），不重复累加。
 */

import { stretchesFor } from '../../data/stretches.js';
import { RULES_VERSION } from '../../data/evidence.js';
import {
  MUSCLES,
  MUSCLES_BY_ID,
  MUSCLE_GROUPS
} from '../../data/muscles.js';
import { detectRedFlags, detectDiscomfort, redFlagLabels } from '../../data/safety.js';
// 数据版本从动作库聚合入口统一导出，避免分析快照与内容数据版本漂移。
import { DATA_VERSION } from '../../data/exercises/index.js';

/** 分析引擎版本（分析快照的 engineVersion）。 */
export const RULES_ENGINE_VERSION = 'rules-2026.10.22';
/** 分析快照 schema 版本。 */
export const ANALYSIS_SCHEMA_VERSION = 1;
/** 数据版本（re-export 自 src/data/exercises/index.js；分析快照可复现需要固定数据版本）。 */
export { DATA_VERSION };
/** 历史聚合窗口（天）。 */
export const HISTORY_WINDOW_DAYS = 14;
/** 短期聚合窗口（天）。 */
export const HISTORY_SHORT_WINDOW_DAYS = 7;
/** 样本充足的最小窗口内训练次数。 */
export const MIN_HISTORY_SESSIONS = 3;

const DIRECT_WEIGHT = 1;
const INDIRECT_WEIGHT = 0.5;
const DAY_MS = 24 * 60 * 60 * 1000;

const GOAL_LABELS = {
  hypertrophy: '增肌',
  strength: '力量',
  fatloss: '减脂 / 体能',
  general: '综合健康'
};

const COMPLETENESS_LABELS = {
  complete: '完整',
  partial: '部分完整',
  'sets-only': '仅记录组数'
};

const MISSING_FIELD_LABELS = {
  weight: '重量',
  reps: '次数',
  rpe: 'RPE',
  rest: '休息时间'
};

// 规则引用的固定顺序：保证 ruleIds 的顺序确定。
const RULE_ORDER = [
  'E-DATA-001',
  'E-SAMPLE-001',
  'E-FREQ-001',
  'E-VOL-001',
  'E-CONS-001',
  'E-EFFORT-001',
  'E-PROG-001',
  'E-RECOV-001',
  'E-MOB-001',
  'E-SAFE-001',
  'E-DISCLAIM-001'
];

// ---------- 通用小工具 ----------

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function compareStr(a, b) {
  const x = a === null || a === undefined ? '' : String(a);
  const y = b === null || b === undefined ? '' : String(b);
  if (x < y) return -1;
  if (x > y) return 1;
  return 0;
}

function toValidDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function uniqueStrings(values) {
  const list = Array.isArray(values) ? values : [];
  const seen = new Set();
  const result = [];
  for (const value of list) {
    if (typeof value !== 'string' || !value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function uniqueInOrder(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

// ---------- 输入归一化 ----------

function buildMuscleContext(musclesInput) {
  let list = [];
  let byId = null;
  let groupList = [];

  if (Array.isArray(musclesInput)) {
    list = musclesInput;
  } else if (musclesInput && typeof musclesInput === 'object') {
    if (Array.isArray(musclesInput.MUSCLES)) list = musclesInput.MUSCLES;
    if (musclesInput.MUSCLES_BY_ID && typeof musclesInput.MUSCLES_BY_ID === 'object') {
      byId = musclesInput.MUSCLES_BY_ID;
    }
    if (Array.isArray(musclesInput.MUSCLE_GROUPS)) groupList = musclesInput.MUSCLE_GROUPS;
  }
  if (!list.length) list = MUSCLES;
  if (!byId) byId = MUSCLES_BY_ID;
  if (!groupList.length) groupList = MUSCLE_GROUPS;

  const groupNames = {};
  for (const group of groupList) {
    if (group && group.id) groupNames[group.id] = group.name || group.id;
  }
  return { list, byId, groupNames };
}

function buildExerciseIndex(exercisesInput) {
  let list = [];
  if (Array.isArray(exercisesInput)) {
    list = exercisesInput;
  } else if (exercisesInput && Array.isArray(exercisesInput.EXERCISES)) {
    list = exercisesInput.EXERCISES;
  }
  const map = new Map();
  for (const exercise of list) {
    if (exercise && exercise.id && !map.has(exercise.id)) map.set(exercise.id, exercise);
  }
  return { list, map };
}

function normalizeSessions(sessionsInput, session) {
  const list = Array.isArray(sessionsInput) && sessionsInput.length ? sessionsInput : [session];
  const map = new Map();
  for (const item of list) {
    if (item && item.id && !map.has(item.id)) map.set(item.id, item);
  }
  if (session && session.id && !map.has(session.id)) map.set(session.id, session);
  return [...map.values()];
}

function sessionExercises(session) {
  return session && Array.isArray(session.exercises) ? session.exercises : [];
}

function workingSetsOf(sessionExercise) {
  if (!sessionExercise || !Array.isArray(sessionExercise.sets)) return [];
  return sessionExercise.sets.filter(
    (set) => set && set.completed !== false && (!set.kind || set.kind === 'working')
  );
}

function warmupSetsOf(sessionExercise) {
  if (!sessionExercise || !Array.isArray(sessionExercise.sets)) return [];
  return sessionExercise.sets.filter((set) => set && set.kind === 'warmup');
}

// ---------- 单会话统计 ----------

function computeSetStats(session) {
  const exercises = sessionExercises(session);
  let workingSetCount = 0;
  let warmupSetCount = 0;
  let volume = 0;
  let volumeSetCount = 0;
  let weightRepsCount = 0;
  let rpeCount = 0;
  let restCount = 0;
  let weightMissing = false;
  let repsMissing = false;

  for (const sessionExercise of exercises) {
    const sets = Array.isArray(sessionExercise.sets) ? sessionExercise.sets : [];
    for (const set of sets) {
      if (!set) continue;
      if (set.kind === 'warmup') {
        warmupSetCount += 1;
        continue;
      }
      if (set.completed === false) continue;
      workingSetCount += 1;

      const weightRecorded = hasValue(set.weightKg);
      const repsRecorded = hasValue(set.reps);
      if (!weightRecorded) weightMissing = true;
      if (!repsRecorded) repsMissing = true;

      if (weightRecorded && repsRecorded) {
        weightRepsCount += 1;
        const weight = Number(set.weightKg);
        const reps = Number(set.reps);
        if (Number.isFinite(weight) && Number.isFinite(reps)) {
          const sideMultiplier = set.perSide ? 2 : 1;
          volume += weight * reps * sideMultiplier;
          volumeSetCount += 1;
        }
      }
      if (hasValue(set.rpe)) rpeCount += 1;
      if (hasValue(set.restSec)) restCount += 1;
    }
  }

  const total = workingSetCount;
  const coverage = (count) => (total > 0 ? round3(count / total) : 0);

  const weightRepsCoverage = coverage(weightRepsCount);
  const rpeCoverage = coverage(rpeCount);
  const restCoverage = coverage(restCount);

  // 与训练记录模块（src/features/log/sessionOps.js coverage）保持同一口径：
  // 重量/次数与 RPE 都齐 → complete；有负荷记录但 RPE 不全 → partial；无负荷记录 → sets-only。
  // 休息时间属于可选记录项，只体现在 missingFields / restCoverage 中，不单独降级。
  let level = 'partial';
  if (total === 0 || weightRepsCoverage === 0) {
    level = 'sets-only';
  } else if (weightRepsCoverage === 1 && rpeCoverage === 1) {
    level = 'complete';
  }

  const missingFields = [];
  if (total === 0 || weightMissing) missingFields.push('weight');
  if (total === 0 || repsMissing) missingFields.push('reps');
  if (rpeCoverage < 1) missingFields.push('rpe');
  if (restCoverage < 1) missingFields.push('rest');

  return {
    exercises,
    workingSetCount,
    warmupSetCount,
    weightRepsCoverage,
    rpeCoverage,
    restCoverage,
    weightRepsCount,
    rpeCount,
    restCount,
    volume: volumeSetCount > 0 ? round1(volume) : null,
    volumeSetCount,
    level,
    missingFields
  };
}

function buildCompletenessNote(stats) {
  if (stats.workingSetCount === 0) {
    return '本次没有已完成的正式组，无法计算训练量与分布。';
  }
  const percent = (value) => `${Math.round(value * 100)}%`;
  if (stats.level === 'sets-only') {
    return (
      `本次共 ${stats.workingSetCount} 个正式组，均未同时记录重量与次数，` +
      '只能描述组数分布与完成情况，无法判断负荷与强度。'
    );
  }
  const missing = stats.missingFields.map((field) => MISSING_FIELD_LABELS[field] || field).join('、');
  const base =
    `本次共 ${stats.workingSetCount} 个正式组，其中 ${stats.weightRepsCount} 个同时记录了重量与次数` +
    `（${percent(stats.weightRepsCoverage)}）；RPE 覆盖 ${percent(stats.rpeCoverage)}，` +
    `休息时间覆盖 ${percent(stats.restCoverage)}。`;
  if (stats.level === 'complete' && !missing) {
    return `${base}用于分析的重量与次数记录完整。`;
  }
  if (stats.level === 'complete') {
    return `${base}用于分析的重量与次数记录完整；未记录：${missing}。`;
  }
  return `${base}缺失字段：${missing}。未记录的数据不参与对应判断，也不做推测。`;
}

function computeMuscleExposure(session, muscleContext) {
  const directByMuscle = new Map();
  const indirectByMuscle = new Map();

  for (const sessionExercise of sessionExercises(session)) {
    const setCount = workingSetsOf(sessionExercise).length;
    if (setCount === 0) continue;
    const primary = uniqueStrings(sessionExercise.primaryMuscles);
    const secondary = uniqueStrings(sessionExercise.secondaryMuscles).filter(
      (muscleId) => !primary.includes(muscleId)
    );
    for (const muscleId of primary) {
      directByMuscle.set(muscleId, (directByMuscle.get(muscleId) || 0) + setCount * DIRECT_WEIGHT);
    }
    for (const muscleId of secondary) {
      indirectByMuscle.set(muscleId, (indirectByMuscle.get(muscleId) || 0) + setCount * 1);
    }
  }

  const muscleIds = new Set([...directByMuscle.keys(), ...indirectByMuscle.keys()]);
  const exposure = [];
  for (const muscleId of muscleIds) {
    const directSets = directByMuscle.get(muscleId) || 0;
    const indirectSets = indirectByMuscle.get(muscleId) || 0;
    const info = muscleContext.byId[muscleId] || null;
    const groupId = info && info.groupId ? info.groupId : 'other';
    exposure.push({
      muscleId,
      name: (info && info.name) || muscleId,
      groupId,
      groupName: muscleContext.groupNames[groupId] || (groupId === 'other' ? '其他' : groupId),
      directSets,
      indirectSets,
      estimatedSets: round1(directSets * DIRECT_WEIGHT + indirectSets * INDIRECT_WEIGHT)
    });
  }

  exposure.sort((a, b) => {
    if (b.estimatedSets !== a.estimatedSets) return b.estimatedSets - a.estimatedSets;
    if (compareStr(a.groupId, b.groupId) !== 0) return compareStr(a.groupId, b.groupId);
    return compareStr(a.muscleId, b.muscleId);
  });
  return exposure;
}

function buildGroupExposure(muscleExposure, muscleContext) {
  const groups = new Map();
  for (const entry of muscleExposure) {
    const current = groups.get(entry.groupId) || {
      groupId: entry.groupId,
      groupName: muscleContext.groupNames[entry.groupId] || entry.groupName,
      directSets: 0,
      indirectSets: 0,
      rawEstimated: 0
    };
    current.directSets += entry.directSets;
    current.indirectSets += entry.indirectSets;
    current.rawEstimated += entry.directSets * DIRECT_WEIGHT + entry.indirectSets * INDIRECT_WEIGHT;
    groups.set(entry.groupId, current);
  }
  const totalEstimated = [...groups.values()].reduce((sum, group) => sum + group.rawEstimated, 0);
  const result = [...groups.values()].map((group) => ({
    groupId: group.groupId,
    groupName: group.groupName,
    directSets: group.directSets,
    indirectSets: group.indirectSets,
    estimatedSets: round1(group.rawEstimated),
    share: totalEstimated > 0 ? round3(group.rawEstimated / totalEstimated) : 0
  }));
  result.sort((a, b) => {
    if (b.estimatedSets !== a.estimatedSets) return b.estimatedSets - a.estimatedSets;
    return compareStr(a.groupId, b.groupId);
  });
  return result;
}

function buildPatterns(session, exerciseIndex) {
  const counts = new Map();
  for (const sessionExercise of sessionExercises(session)) {
    const setCount = workingSetsOf(sessionExercise).length;
    if (setCount === 0) continue;
    const definition = exerciseIndex.map.get(sessionExercise.exerciseId) || null;
    const pattern = (definition && definition.pattern) || 'unknown';
    const label =
      (sessionExercise.patternLabel && String(sessionExercise.patternLabel)) ||
      (definition && definition.patternLabel) ||
      '其他';
    const current = counts.get(pattern) || { pattern, label, workingSetCount: 0 };
    current.workingSetCount += setCount;
    counts.set(pattern, current);
  }
  return [...counts.values()].sort((a, b) => {
    if (b.workingSetCount !== a.workingSetCount) return b.workingSetCount - a.workingSetCount;
    return compareStr(a.pattern, b.pattern);
  });
}

// ---------- 历史窗口 ----------

function inWindow(session, nowDate, windowDays) {
  if (!session || session.status === 'draft') return false;
  const startedAt = toValidDate(session.startedAt);
  if (!startedAt) return false;
  const start = nowDate.getTime() - windowDays * DAY_MS;
  const time = startedAt.getTime();
  return time >= start && time <= nowDate.getTime();
}

function computeGroupFrequency(sessions, nowDate, windowDays, muscleContext) {
  const windowSessions = sessions.filter((item) => inWindow(item, nowDate, windowDays));
  const groups = new Map();

  for (const item of windowSessions) {
    const exposure = computeMuscleExposure(item, muscleContext);
    const byGroup = new Map();
    for (const entry of exposure) {
      const current = byGroup.get(entry.groupId) || { rawEstimated: 0 };
      current.rawEstimated += entry.directSets * DIRECT_WEIGHT + entry.indirectSets * INDIRECT_WEIGHT;
      byGroup.set(entry.groupId, current);
    }
    const dateKey = String(item.startedAt).slice(0, 10);
    for (const [groupId, value] of byGroup) {
      if (value.rawEstimated <= 0) continue;
      const current = groups.get(groupId) || {
        groupId,
        groupName: muscleContext.groupNames[groupId] || groupId,
        days: new Set(),
        sessionCount: 0,
        rawEstimated: 0
      };
      current.sessionCount += 1;
      current.rawEstimated += value.rawEstimated;
      current.days.add(dateKey);
      groups.set(groupId, current);
    }
  }

  const groupFrequency = [...groups.values()]
    .map((group) => ({
      groupId: group.groupId,
      groupName: group.groupName,
      daysTrained: group.days.size,
      sessionCount: group.sessionCount,
      estimatedSets: round1(group.rawEstimated)
    }))
    .sort((a, b) => {
      if (b.estimatedSets !== a.estimatedSets) return b.estimatedSets - a.estimatedSets;
      return compareStr(a.groupId, b.groupId);
    });

  return {
    windowDays,
    sessionCount: windowSessions.length,
    groupFrequency
  };
}

function buildHistoryNote(history, isFirstSession, currentIncluded) {
  const inclusion = currentIncluded ? '（含本次训练）' : '（本次训练不在窗口内）';
  const prefix = `近 ${history.windowDays} 天窗口内有 ${history.sessionCount} 次已完成训练${inclusion}`;
  if (isFirstSession) {
    return `${prefix}。这是首次完成训练，当前样本不足以判断近期训练分布；窗口内仅陈述本次训练事实，不做长期结论。`;
  }
  if (!history.sufficient) {
    return `${prefix}，少于 ${MIN_HISTORY_SESSIONS} 次，样本不足以判断近期训练分布；窗口聚合仅作记录展示，不做长期结论。`;
  }
  const dedupe = currentIncluded ? '按 startedAt 聚合，本次只计入一次' : '按 startedAt 聚合';
  return `${prefix}，${dedupe}；可作为近期训练分布的初步参考。`;
}

// ---------- 规则 / 安全 ----------

function collectSessionNotes(session) {
  const parts = [];
  if (typeof session.note === 'string' && session.note.trim()) parts.push(session.note.trim());
  if (session.postCheck && typeof session.postCheck.note === 'string' && session.postCheck.note.trim()) {
    parts.push(session.postCheck.note.trim());
  }
  for (const sessionExercise of sessionExercises(session)) {
    if (typeof sessionExercise.note === 'string' && sessionExercise.note.trim()) {
      parts.push(sessionExercise.note.trim());
    }
    const sets = Array.isArray(sessionExercise.sets) ? sessionExercise.sets : [];
    for (const set of sets) {
      if (set && typeof set.note === 'string' && set.note.trim()) parts.push(set.note.trim());
    }
  }
  return parts.join('\n');
}

function buildFlags(session) {
  const status = (session.postCheck && session.postCheck.status) || 'ok';
  const notesText = collectSessionNotes(session);
  const detectedIds = detectRedFlags(notesText);
  const labels = redFlagLabels(detectedIds);
  if (status === 'red-flag' && labels.length === 0) {
    labels.push('训练后状态自查标记为危险信号');
  }
  const safetyIntercepted = status === 'red-flag' || detectedIds.length > 0;
  const discomfort = status === 'discomfort' || detectDiscomfort(notesText);
  return {
    redFlags: uniqueInOrder(labels),
    safetyIntercepted,
    discomfort,
    detectedIds,
    status,
    notesText
  };
}

function collectRuleIds({ flags, history, volumeKg, warmupSetCount }) {
  const used = new Set(['E-DATA-001', 'E-SAMPLE-001', 'E-MOB-001', 'E-SAFE-001', 'E-DISCLAIM-001']);
  if (history.sufficient) {
    used.add('E-FREQ-001');
    used.add('E-CONS-001');
  }
  if (volumeKg !== null) used.add('E-VOL-001');
  if (history.sufficient && !flags.safetyIntercepted) {
    used.add('E-EFFORT-001');
    used.add('E-PROG-001');
  }
  if (warmupSetCount > 0) used.add('E-RECOV-001');
  return RULE_ORDER.filter((id) => used.has(id));
}

function buildLimitations({ flags, history, stats, volumeKg, isFirstSession, stretchIds }) {
  const limitations = [
    {
      code: 'estimation-basis',
      text:
        '肌群分布为「动作通常涉及的肌群映射」的估计：直接组按 1、间接组按 0.5 折算，' +
        '不是肌电测量或精确剂量，也不能用于判断个体激活程度或训练效果。'
    },
    {
      code: 'not-medical',
      text: '本分析不构成医疗诊断、治疗或康复处方；如有疼痛、伤病或疾病，请咨询专业医疗人员。'
    }
  ];

  if (stats.workingSetCount === 0) {
    limitations.push({ code: 'no-working-sets', text: '本次没有已完成的正式组，训练量与分布均无法计算。' });
  } else if (stats.level !== 'complete') {
    const missing = stats.missingFields.map((field) => MISSING_FIELD_LABELS[field] || field).join('、');
    limitations.push({
      code: 'incomplete-data',
      text: `数据完整度为「${COMPLETENESS_LABELS[stats.level]}」，缺少：${missing}；相关判断受限，未记录的数据不做推测。`
    });
  }
  if (volumeKg === null) {
    limitations.push({
      code: 'volume-unavailable',
      text: '没有同时记录重量与次数的正式组，无法计算总吨位，本次不判断负荷水平或变化。'
    });
  }
  if (!history.sufficient) {
    limitations.push({
      code: 'insufficient-sample',
      text:
        `近 ${history.windowDays} 天窗口内仅有 ${history.sessionCount} 次已完成训练` +
        `（少于 ${MIN_HISTORY_SESSIONS} 次），不产出长期训练分布或频率结论。`
    });
  }
  if (isFirstSession) {
    limitations.push({ code: 'first-session', text: '这是首次完成训练，缺少可对比的历史基线。' });
  }
  if (flags.safetyIntercepted) {
    limitations.push({
      code: 'safety-intercepted',
      text: '本次记录包含危险信号，已进入安全拦截：不提供训练优化或加量建议，请停止训练并寻求专业医疗意见。'
    });
  }
  if (!stretchIds.length) {
    limitations.push({
      code: 'stretch-unavailable',
      text: '本次未匹配到可用的拉伸条目，可参考一般训练后温和放松建议；如有不适请先咨询专业人士。'
    });
  }
  return limitations;
}

// ---------- 主入口 ----------

/**
 * 分析一次训练，返回 AnalysisFacts（契约 3.8）。
 * @param {{
 *   session: object,
 *   sessions?: object[],
 *   exercises?: object[],
 *   muscles?: object,
 *   evidence?: object,
 *   now?: string|Date,
 *   dataVersion?: string
 * }} input
 * @returns {object} AnalysisFacts
 */
export function analyzeSession(input = {}) {
  const { session } = input;
  if (!session || typeof session !== 'object' || !session.id) {
    throw new TypeError('analyzeSession 需要包含 id 的 session 对象');
  }

  const nowDate =
    toValidDate(input.now) || toValidDate(session.endedAt) || toValidDate(session.startedAt) || new Date();

  const muscleContext = buildMuscleContext(input.muscles);
  const exerciseIndex = buildExerciseIndex(input.exercises);
  const sessions = normalizeSessions(input.sessions, session);
  const stats = computeSetStats(session);
  const goal = session.goal || 'general';
  const goalLabel = GOAL_LABELS[goal] || '综合健康';

  const durationMin = (() => {
    const startedAt = toValidDate(session.startedAt);
    const endedAt = toValidDate(session.endedAt);
    if (!startedAt || !endedAt) return null;
    const minutes = (endedAt.getTime() - startedAt.getTime()) / 60000;
    return minutes > 0 ? Math.round(minutes) : null;
  })();

  const muscleExposure = computeMuscleExposure(session, muscleContext);
  const groupExposure = buildGroupExposure(muscleExposure, muscleContext);
  const patterns = buildPatterns(session, exerciseIndex);

  const history14 = computeGroupFrequency(sessions, nowDate, HISTORY_WINDOW_DAYS, muscleContext);
  const history7 = computeGroupFrequency(sessions, nowDate, HISTORY_SHORT_WINDOW_DAYS, muscleContext);
  const historySufficient = history14.sessionCount >= MIN_HISTORY_SESSIONS;
  const currentIncluded = inWindow(session, nowDate, HISTORY_WINDOW_DAYS);
  const isFirstSession = sessions.filter(
    (item) => item.id !== session.id && item.status !== 'draft'
  ).length === 0;

  const flags = buildFlags(session);

  const ruleIds = collectRuleIds({
    flags,
    history: { ...history14, sufficient: historySufficient },
    volumeKg: stats.volume,
    warmupSetCount: stats.warmupSetCount
  });

  const facts = {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    engineVersion: RULES_ENGINE_VERSION,
    rulesVersion: resolveRulesVersion(input.evidence),
    dataVersion: typeof input.dataVersion === 'string' && input.dataVersion ? input.dataVersion : DATA_VERSION,
    generatedAt: nowDate.toISOString(),
    sessionId: session.id,
    scope: {
      isFirstSession,
      historySessions: sessions.filter((item) => item.id !== session.id && item.status !== 'draft').length,
      windowDays: HISTORY_WINDOW_DAYS,
      windowSessionCount: history14.sessionCount
    },
    session: {
      goal,
      goalLabel,
      exerciseCount: sessionExercises(session).length,
      workingSetCount: stats.workingSetCount,
      totalVolumeKg: stats.volume,
      // 有重量与次数、可计入吨位的正式组数（用于「已记录组估算吨位」的覆盖说明）。
      volumeSetCount: stats.volumeSetCount,
      durationMin
    },
    dataCompleteness: {
      level: stats.level,
      weightRepsCoverage: stats.weightRepsCoverage,
      // 覆盖的重量/次数组数（如 2/4）：页面用来说明吨位是否完整。
      weightRepsCount: stats.weightRepsCount,
      rpeCoverage: stats.rpeCoverage,
      restCoverage: stats.restCoverage,
      missingFields: stats.missingFields,
      note: buildCompletenessNote(stats)
    },
    muscleExposure,
    groupExposure,
    patterns,
    history: {
      windowDays: HISTORY_WINDOW_DAYS,
      sessionCount: history14.sessionCount,
      sufficient: historySufficient,
      groupFrequency: history14.groupFrequency,
      note: buildHistoryNote({ ...history14, sufficient: historySufficient }, isFirstSession, currentIncluded),
      // 扩展字段：近 7 天聚合（同一口径，包含当前会话，窗口内不重复累加）。
      window7: {
        windowDays: HISTORY_SHORT_WINDOW_DAYS,
        sessionCount: history7.sessionCount,
        groupFrequency: history7.groupFrequency
      },
      includesCurrentSession: currentIncluded
    },
    flags: {
      redFlags: flags.redFlags,
      safetyIntercepted: flags.safetyIntercepted,
      discomfort: flags.discomfort
    },
    ruleIds,
    limitations: [],
    stretchIds: []
  };

  // 拉伸推荐：调用 src/data/stretches.js 的 stretchesFor(facts)，最多 3 条。
  let stretchIds = [];
  try {
    const selected = stretchesFor(facts);
    if (Array.isArray(selected)) {
      stretchIds = uniqueInOrder(selected.map((stretch) => stretch && stretch.id)).slice(0, 3);
    }
  } catch (err) {
    stretchIds = [];
  }
  facts.stretchIds = stretchIds;

  facts.limitations = buildLimitations({
    flags,
    history: { ...history14, sufficient: historySufficient },
    stats,
    volumeKg: stats.volume,
    isFirstSession,
    stretchIds
  });

  return facts;
}

function resolveRulesVersion(evidenceInput) {
  if (!evidenceInput) return RULES_VERSION;
  if (typeof evidenceInput === 'string') return evidenceInput;
  if (typeof evidenceInput.RULES_VERSION === 'string') return evidenceInput.RULES_VERSION;
  return RULES_VERSION;
}

/** 便捷导出：数据完整度的中文标签（供页面复用）。 */
export function completenessLabel(level) {
  return COMPLETENESS_LABELS[level] || level;
}

/** 便捷导出：缺失字段的中文标签（供页面复用）。 */
export function missingFieldLabel(field) {
  return MISSING_FIELD_LABELS[field] || field;
}

/**
 * 训练会话纯逻辑（不依赖 DOM / store，可在 Node 中直接单测）。
 *
 * 职责边界：
 * - 只负责 Session / SessionExercise / SessionSet 的结构创建、增删改、复制、排序、
 *   统计与完整性判定（契约 docs/CONTRACTS.md 3.7 / 4.4）；
 * - 不读写 localStorage，不调用 store，也不 import 动作库数据（动作对象由调用方传入），
 *   因此 tests/log.test.mjs 可在无浏览器环境下确定性运行；
 * - 所有函数都尽量「原地修改并返回可判定的结果」，页面层拿到结果后再调用
 *   store.saveDraft / store.updateSession 持久化。
 *
 * 约定：
 * - id 前缀：会话 s_ / 训练动作 se_ / 组 set_（由 newId 生成）；
 * - 时间一律 ISO 8601 字符串；
 * - 「计划组」用 plannedSets 表示，「完成组」= sets 数组（只存已完成的组），
 *   UI 必须区分展示，见 countPlannedSets / countCompletedSets。
 */
import { newId, toDate, isSameDay, addDays } from '../../app/format.js';

export const DEFAULT_PLANNED_SETS = 3;

/** 契约 3.7 允许的目标枚举；未知值回退综合健康。 */
export const GOAL_VALUES = ['hypertrophy', 'strength', 'fatloss', 'general'];

/** 契约 3.8 的数据完整度等级。 */
export const COMPLETENESS_LEVELS = ['complete', 'partial', 'sets-only'];

export const COMPLETENESS_LABELS = {
  complete: '完整',
  partial: '部分完整',
  'sets-only': '仅组数'
};

export const POST_CHECK_VALUES = ['ok', 'discomfort', 'red-flag'];

const POST_CHECK_LABELS = {
  ok: '无不适',
  discomfort: '轻微不适',
  'red-flag': '需要谨慎对待的信号'
};

// ---------- 基础工具 ----------

function nowISO(now) {
  return now || new Date().toISOString();
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampNumberOrNull(value, min, max) {
  const n = toNumberOrNull(value);
  if (n === null) return null;
  return Math.min(Math.max(n, min), max);
}

function toIntOrNull(value) {
  const n = toNumberOrNull(value);
  return n === null ? null : Math.round(n);
}

function toRepsOrNull(value) {
  const n = toNumberOrNull(value);
  return n === null ? null : Math.round(Math.min(Math.max(n, 0), 999));
}

/** 吸附到指定步进（如 RPE 吸附到 0.5），并消除浮点误差。 */
function snapToStep(value, step) {
  const snapped = Math.round(value / step) * step;
  const digits = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  const factor = 10 ** digits;
  return Math.round(snapped * factor) / factor;
}

function normalizeGoal(goal) {
  return GOAL_VALUES.includes(goal) ? goal : 'general';
}

/** 原地重排数组内元素的 order 字段，保证 0..n-1 连续。 */
function renumber(list, key = 'order') {
  (Array.isArray(list) ? list : []).forEach((item, index) => {
    if (item && typeof item === 'object') item[key] = index;
  });
  return list;
}

function touch(session, now) {
  if (session && typeof session === 'object') session.updatedAt = nowISO(now);
  return session;
}

/** 取得训练动作在 session.exercises 中的下标；找不到返回 -1。 */
function indexOfSessionExercise(session, target) {
  if (!session || !Array.isArray(session.exercises)) return -1;
  if (target && typeof target === 'object') return session.exercises.indexOf(target);
  if (typeof target === 'number') {
    return Number.isInteger(target) && target >= 0 && target < session.exercises.length ? target : -1;
  }
  return session.exercises.findIndex((item) => item && (item.id === target || item.exerciseId === target));
}

/** 按 sessionExerciseId / exerciseId 取训练动作；找不到返回 null。 */
export function getSessionExercise(session, target) {
  const index = indexOfSessionExercise(session, target);
  return index >= 0 ? session.exercises[index] : null;
}

/** 该会话是否已经包含某个动作（按 exerciseId 去重）。 */
export function hasExercise(session, exerciseId) {
  return Boolean(
    session &&
      Array.isArray(session.exercises) &&
      session.exercises.some((item) => item && item.exerciseId === exerciseId)
  );
}

// ---------- 创建 ----------

/**
 * 新建草稿会话（契约 3.7 结构）。
 * @param {{ goal?: string, title?: string, now?: string, id?: string }} [options]
 */
export function createDraftSession({ goal = 'general', title = '', now, id } = {}) {
  const timestamp = nowISO(now);
  return {
    id: id || newId('s'),
    schemaVersion: 1,
    status: 'draft',
    startedAt: timestamp,
    endedAt: null,
    goal: normalizeGoal(goal),
    title: typeof title === 'string' ? title : '',
    note: '',
    postCheck: { status: 'ok', note: '' },
    exercises: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

/**
 * 由动作库对象生成训练动作快照（名称/器械/模式/肌群快照，历史展示稳定）。
 *
 * @param {object} exercise 动作库中的动作对象（至少含 id/name）
 * @param {{
 *   order?: number, plannedSets?: number|null,
 *   equipmentLabel?: string, patternLabel?: string,
 *   sideMode?: 'bilateral'|'unilateral', note?: string
 * }} [options]
 *   equipmentLabel / patternLabel 由页面层从动作库索引取中文标签后传入，
 *   使本模块不依赖动作库数据、可独立单测。
 */
export function createSessionExercise(exercise, options = {}) {
  if (!exercise || typeof exercise !== 'object' || !exercise.id) {
    throw new Error('createSessionExercise 需要有效的动作对象（含 id）');
  }
  const plannedSets =
    options.plannedSets === null || options.plannedSets === undefined
      ? DEFAULT_PLANNED_SETS
      : clampNumberOrNull(options.plannedSets, 0, 30);
  const primary = Array.isArray(exercise.primaryMuscles) ? [...exercise.primaryMuscles] : [];
  const secondary = Array.isArray(exercise.secondaryMuscles) ? [...exercise.secondaryMuscles] : [];
  const sideMode = options.sideMode || (exercise.unilateral ? 'unilateral' : 'bilateral');
  return {
    id: newId('se'),
    exerciseId: exercise.id,
    exerciseName: exercise.name || exercise.exerciseName || exercise.id,
    equipmentLabel: options.equipmentLabel || exercise.equipmentLabel || '',
    patternLabel: options.patternLabel || exercise.patternLabel || '',
    primaryMuscles: primary,
    secondaryMuscles: secondary,
    order: Number.isInteger(options.order) ? options.order : 0,
    sideMode: sideMode === 'unilateral' ? 'unilateral' : 'bilateral',
    plannedSets,
    note: typeof options.note === 'string' ? options.note : '',
    sets: []
  };
}

/**
 * 新建一组记录（默认已完成 working 组）。
 * @param {object} [partial]
 */
export function createSet(partial = {}) {
  const timestamp = nowISO(partial.now);
  const kind = partial.kind === 'warmup' ? 'warmup' : 'working';
  return {
    id: partial.id || newId('set'),
    order: Number.isInteger(partial.order) ? partial.order : 0,
    kind,
    weightKg: clampNumberOrNull(partial.weightKg, 0, 1000),
    reps: toRepsOrNull(partial.reps),
    perSide: Boolean(partial.perSide),
    rpe: clampNumberOrNull(partial.rpe, 1, 10) === null ? null : snapToStep(clampNumberOrNull(partial.rpe, 1, 10), 0.5),
    rir: toIntOrNull(partial.rir) === null ? null : Math.min(Math.max(toIntOrNull(partial.rir), 0), 10),
    restSec: toIntOrNull(partial.restSec) === null ? null : Math.min(Math.max(toIntOrNull(partial.restSec), 0), 3600),
    note: typeof partial.note === 'string' ? partial.note : '',
    completed: partial.completed !== false,
    completedAt: partial.completed === false ? null : partial.completedAt || timestamp
  };
}

// ---------- 动作增删 / 排序 ----------

/**
 * 向会话追加动作（默认按 exerciseId 去重）。
 * @returns {SessionExercise|null} 新加入的训练动作；重复或非法时返回 null。
 */
export function addExerciseToSession(session, exercise, options = {}) {
  if (!session || !Array.isArray(session.exercises)) return null;
  if (!exercise || !exercise.id) return null;
  if (!options.allowDuplicate && hasExercise(session, exercise.id)) return null;
  const sessionExercise = createSessionExercise(exercise, {
    ...options,
    order: session.exercises.length
  });
  session.exercises.push(sessionExercise);
  touch(session, options.now);
  return sessionExercise;
}

/** 删除动作并重排 order；返回是否删除成功。 */
export function removeExercise(session, target, now) {
  const index = indexOfSessionExercise(session, target);
  if (index < 0) return false;
  session.exercises.splice(index, 1);
  renumber(session.exercises);
  touch(session, now);
  return true;
}

/**
 * 移动动作位置（delta > 0 下移，< 0 上移），越界自动收敛。
 * @returns {boolean} 位置是否真的发生变化
 */
export function moveExercise(session, target, delta, now) {
  const index = indexOfSessionExercise(session, target);
  if (index < 0) return false;
  const step = Number(delta) || 0;
  if (!step) return false;
  const nextIndex = Math.min(Math.max(index + Math.trunc(step), 0), session.exercises.length - 1);
  if (nextIndex === index) return false;
  const [item] = session.exercises.splice(index, 1);
  session.exercises.splice(nextIndex, 0, item);
  renumber(session.exercises);
  touch(session, now);
  return true;
}

/** 把动作从 from 位置移到 to 位置（接受下标或 id）。 */
export function reorderExercise(session, from, to, now) {
  const fromIndex = indexOfSessionExercise(session, from);
  const toIndex = indexOfSessionExercise(session, to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return false;
  const [item] = session.exercises.splice(fromIndex, 1);
  session.exercises.splice(toIndex, 0, item);
  renumber(session.exercises);
  touch(session, now);
  return true;
}

// ---------- 组操作 ----------

/** 追加一组；返回新组。 */
export function addSet(sessionExercise, partial = {}, now) {
  if (!sessionExercise || !Array.isArray(sessionExercise.sets)) return null;
  const set = createSet({ ...partial, order: sessionExercise.sets.length, now: partial.now || now });
  sessionExercise.sets.push(set);
  return set;
}

function setIndexOf(sessionExercise, setId) {
  if (!sessionExercise || !Array.isArray(sessionExercise.sets)) return -1;
  return sessionExercise.sets.findIndex((item) => item && item.id === setId);
}

/**
 * 复制某一组到它后面（新 id、completed 重置为 true）。
 * @returns {SessionSet|null} 新组
 */
export function duplicateSet(sessionExercise, setId, now) {
  const index = setIndexOf(sessionExercise, setId);
  if (index < 0) return null;
  const source = sessionExercise.sets[index];
  const copy = createSet({
    kind: source.kind,
    weightKg: source.weightKg,
    reps: source.reps,
    perSide: source.perSide,
    rpe: source.rpe,
    rir: source.rir,
    restSec: source.restSec,
    note: source.note,
    completed: true,
    now: nowISO(now)
  });
  sessionExercise.sets.splice(index + 1, 0, copy);
  renumber(sessionExercise.sets);
  return copy;
}

/**
 * 复制最后一组（「复制上一组」按钮）。
 * @returns {SessionSet|null} 新组；没有历史组时返回 null
 */
export function duplicatePreviousSet(sessionExercise, now) {
  if (!sessionExercise || !Array.isArray(sessionExercise.sets) || !sessionExercise.sets.length) return null;
  const last = sessionExercise.sets[sessionExercise.sets.length - 1];
  return duplicateSet(sessionExercise, last.id, now);
}

/** 删除某组并重排 order；返回是否删除成功。 */
export function removeSet(sessionExercise, setId) {
  const index = setIndexOf(sessionExercise, setId);
  if (index < 0) return false;
  sessionExercise.sets.splice(index, 1);
  renumber(sessionExercise.sets);
  return true;
}

const SET_PATCH_KEYS = new Set([
  'weightKg',
  'reps',
  'rpe',
  'rir',
  'restSec',
  'perSide',
  'note',
  'kind',
  'completed',
  'completedAt'
]);

/**
 * 更新单组字段（白名单 + 合法值收敛）。weightKg/reps 传 null 表示清空。
 * @returns {SessionSet|null}
 */
export function updateSet(sessionExercise, setId, patch = {}, now) {
  const index = setIndexOf(sessionExercise, setId);
  if (index < 0) return null;
  const set = sessionExercise.sets[index];
  for (const [key, value] of Object.entries(patch)) {
    if (!SET_PATCH_KEYS.has(key)) continue;
    if (key === 'weightKg') set.weightKg = clampNumberOrNull(value, 0, 1000);
    else if (key === 'reps') set.reps = toRepsOrNull(value);
    else if (key === 'rpe') {
      const rpe = clampNumberOrNull(value, 1, 10);
      set.rpe = rpe === null ? null : snapToStep(rpe, 0.5);
    } else if (key === 'rir') {
      const rir = toIntOrNull(value);
      set.rir = rir === null ? null : Math.min(Math.max(rir, 0), 10);
    } else if (key === 'restSec') {
      const rest = toIntOrNull(value);
      set.restSec = rest === null ? null : Math.min(Math.max(rest, 0), 3600);
    } else if (key === 'perSide') set.perSide = Boolean(value);
    else if (key === 'note') set.note = typeof value === 'string' ? value : '';
    else if (key === 'kind') set.kind = value === 'warmup' ? 'warmup' : 'working';
    else if (key === 'completed') set.completed = value !== false;
    else if (key === 'completedAt') set.completedAt = value || null;
  }
  if (patch.completed === true && !set.completedAt) set.completedAt = nowISO(now);
  return set;
}

/**
 * 设置计划组数（0-30，传 null 表示未设定）。
 * @returns {number|null}
 */
export function setPlannedSets(sessionExercise, value) {
  if (!sessionExercise) return null;
  if (value === null || value === undefined || value === '') {
    sessionExercise.plannedSets = null;
    return null;
  }
  sessionExercise.plannedSets = Math.round(clampNumberOrNull(value, 0, 30));
  return sessionExercise.plannedSets;
}

// ---------- 统计 / 完整性 / 是否可结束 ----------

function allSets(session) {
  if (!session || !Array.isArray(session.exercises)) return [];
  const sets = [];
  for (const sessionExercise of session.exercises) {
    if (!sessionExercise || !Array.isArray(sessionExercise.sets)) continue;
    for (const set of sessionExercise.sets) {
      if (set && set.completed !== false) sets.push(set);
    }
  }
  return sets;
}

/** 已完成的组数（含热身组，用于「0 组不可结束」判定）。 */
export function countCompletedSets(session) {
  return allSets(session).length;
}

/** 有效的正式组数（kind !== 'warmup'，与分析的「工作组」口径一致）。 */
export function countWorkingSets(session) {
  return allSets(session).filter((set) => set.kind !== 'warmup').length;
}

/** 计划组数合计；未设定 plannedSets 的动作按 0 计。 */
export function countPlannedSets(session) {
  if (!session || !Array.isArray(session.exercises)) return 0;
  return session.exercises.reduce((sum, item) => {
    const planned = item && Number.isFinite(Number(item.plannedSets)) ? Number(item.plannedSets) : 0;
    return sum + Math.max(0, planned);
  }, 0);
}

/** 单个训练动作的计划组 / 完成组计数（UI 用「计划 3 组」「已完成 2 组」区分展示）。 */
export function exerciseSetCounts(sessionExercise) {
  const sets = sessionExercise && Array.isArray(sessionExercise.sets) ? sessionExercise.sets : [];
  const planned = sessionExercise ? sessionExercise.plannedSets : null;
  const hasPlanned =
    planned !== null && planned !== undefined && planned !== '' && Number.isFinite(Number(planned));
  return {
    plannedSets: hasPlanned ? Number(planned) : null,
    completedSets: sets.filter((set) => set && set.completed !== false).length,
    workingSets: sets.filter((set) => set && set.completed !== false && set.kind !== 'warmup').length
  };
}

/**
 * 总吨位（kg）：Σ 重量 × 次数，默认不计热身组、单侧组按两侧计。
 * 没有任何同时具备重量与次数的组时返回 null（UI 显示「—」而不是误导性的 0）。
 */
export function totalVolume(session, { includeWarmup = false, perSideMultiplier = 2 } = {}) {
  let volume = 0;
  let counted = 0;
  for (const set of allSets(session)) {
    if (!includeWarmup && set.kind === 'warmup') continue;
    if (set.weightKg === null || set.weightKg === undefined) continue;
    if (set.reps === null || set.reps === undefined) continue;
    const multiplier = set.perSide ? perSideMultiplier : 1;
    volume += Number(set.weightKg) * Number(set.reps) * multiplier;
    counted += 1;
  }
  return counted ? Math.round(volume * 10) / 10 : null;
}

/** 时长（分钟，四舍五入）；缺少 endedAt 时返回 null。 */
export function durationMinutes(session) {
  if (!session) return null;
  const start = toDate(session.startedAt);
  const end = toDate(session.endedAt);
  if (!start || !end) return null;
  const minutes = (end.getTime() - start.getTime()) / 60000;
  return minutes >= 0 ? Math.round(minutes) : null;
}

/**
 * 数据完整度（结束训练弹层与测试使用；分析模块会按契约 3.8 自行复算一份）。
 * level：complete 重量次数与 RPE 都齐 / partial 部分缺 / sets-only 只有组数（无负荷数据）。
 */
export function coverage(session) {
  const sets = allSets(session).filter((set) => set.kind !== 'warmup');
  const totalSets = sets.length;
  const weightRepsSets = sets.filter(
    (set) =>
      set.weightKg !== null &&
      set.weightKg !== undefined &&
      set.reps !== null &&
      set.reps !== undefined
  ).length;
  const rpeSets = sets.filter((set) => set.rpe !== null && set.rpe !== undefined).length;
  const restSets = sets.filter((set) => set.restSec !== null && set.restSec !== undefined).length;
  const missingWeight = sets.filter((set) => set.weightKg === null || set.weightKg === undefined).length;
  const missingReps = sets.filter((set) => set.reps === null || set.reps === undefined).length;
  const missingRpe = totalSets - rpeSets;
  const missingRest = totalSets - restSets;
  const ratio = (value) => (totalSets ? Math.round((value / totalSets) * 1000) / 1000 : 0);

  let level = 'sets-only';
  if (totalSets > 0) {
    if (weightRepsSets === totalSets && rpeSets === totalSets) level = 'complete';
    else if (weightRepsSets > 0) level = 'partial';
    else level = 'sets-only';
  }

  const missingFields = [];
  if (missingWeight > 0) missingFields.push('weight');
  if (missingReps > 0) missingFields.push('reps');
  if (missingRpe > 0) missingFields.push('rpe');
  if (missingRest > 0) missingFields.push('rest');

  return {
    totalSets,
    workingSetCount: totalSets,
    weightRepsSets,
    rpeSets,
    restSets,
    missingWeight,
    missingReps,
    missingRpe,
    missingRest,
    missingWeightOrReps: totalSets - weightRepsSets,
    weightRepsCoverage: ratio(weightRepsSets),
    rpeCoverage: ratio(rpeSets),
    restCoverage: ratio(restSets),
    missingFields,
    level,
    levelLabel: COMPLETENESS_LABELS[level] || level
  };
}

/**
 * 是否允许结束训练：必须至少完成 1 组（只记组数也允许，不要求重量/次数）。
 * @returns {{ ok: boolean, reason: string|null, message: string, completedSetCount: number }}
 */
export function canFinish(session) {
  const completedSetCount = countCompletedSets(session);
  if (!session || !Array.isArray(session.exercises) || session.exercises.length === 0) {
    return {
      ok: false,
      reason: 'no-exercises',
      message: '本次训练还没有动作，请先添加至少 1 个动作并完成 1 组。',
      completedSetCount
    };
  }
  if (completedSetCount === 0) {
    return {
      ok: false,
      reason: 'no-sets',
      message: '至少完成 1 组才能结束训练。可以先点「加组」记录一组，或只记录组数后完成。',
      completedSetCount
    };
  }
  return { ok: true, reason: null, message: '', completedSetCount };
}

/** 汇总统计（历史列表 / 详情 / 顶部状态条共用）。 */
export function sessionStats(session) {
  const exercises = session && Array.isArray(session.exercises) ? session.exercises : [];
  return {
    exerciseCount: exercises.length,
    completedSetCount: countCompletedSets(session),
    workingSetCount: countWorkingSets(session),
    plannedSetCount: countPlannedSets(session),
    totalVolumeKg: totalVolume(session),
    durationMin: durationMinutes(session)
  };
}

// ---------- 完成训练 ----------

/**
 * 校验并写入完成训练需要的字段（postCheck / endedAt / status）。
 * 持久化仍由页面层调用 store.completeSession(session) 完成。
 * @returns {{ ok: boolean, reason: string|null, message: string, session?: object }}
 */
export function prepareCompletion(session, { status = 'ok', note = '', now } = {}) {
  const readiness = canFinish(session);
  if (!readiness.ok) return { ok: false, reason: readiness.reason, message: readiness.message };
  const timestamp = nowISO(now);
  session.postCheck = {
    status: POST_CHECK_VALUES.includes(status) ? status : 'ok',
    note: typeof note === 'string' ? note.slice(0, 500) : ''
  };
  session.status = 'completed';
  session.endedAt = timestamp;
  session.updatedAt = timestamp;
  return { ok: true, reason: null, message: '', session };
}

/** 训练后状态自查的中文标签。 */
export function postCheckLabel(status) {
  return POST_CHECK_LABELS[status] || POST_CHECK_LABELS.ok;
}

// ---------- 历史分组 ----------

/**
 * 按「今天 / 昨天 / 更早」分组，保持传入顺序（store 已按 startedAt 倒序）。
 * @returns {Array<{ key: string, title: string, sessions: object[] }>}
 */
export function groupSessionsByDate(sessions, { now = new Date() } = {}) {
  const buckets = { today: [], yesterday: [], earlier: [] };
  for (const session of Array.isArray(sessions) ? sessions : []) {
    const started = toDate(session && session.startedAt);
    if (!started) {
      buckets.earlier.push(session);
      continue;
    }
    if (isSameDay(started, now)) buckets.today.push(session);
    else if (isSameDay(started, addDays(now, -1))) buckets.yesterday.push(session);
    else buckets.earlier.push(session);
  }
  return [
    { key: 'today', title: '今天', sessions: buckets.today },
    { key: 'yesterday', title: '昨天', sessions: buckets.yesterday },
    { key: 'earlier', title: '更早', sessions: buckets.earlier }
  ].filter((group) => group.sessions.length > 0);
}

// ---------- 其他 ----------

/** 会话内动作名称列表（分享/摘要用）。 */
export function exerciseNames(session) {
  if (!session || !Array.isArray(session.exercises)) return [];
  return session.exercises.map((item) => (item && item.exerciseName) || (item && item.exerciseId) || '').filter(Boolean);
}

/**
 * 深拷贝并重置为可继续编辑的草稿（用于已完成后「编辑」的本地副本，避免未保存修改污染 store）。
 */
export function cloneAsEditableSession(session) {
  if (!session) return null;
  const clone = JSON.parse(JSON.stringify(session));
  return clone;
}

/** 训练动作备注长度限制（统一 UI 与数据）。 */
export const NOTE_MAX_LENGTH = 500;

/**
 * 是否需要记录重量（kg）。
 * 产品决策（2026-10-23）：固定器械/绳索/史密斯/自重等受滑轮组与力臂影响，
 * 实际负荷无法和杠铃/哑铃直接比较，因此只有「杠铃 / 哑铃」动作显示重量输入，
 * 其余动作只记录组数 × 次数（weightKg 保持 null，不猜重量）。
 */
export const WEIGHT_TRACKED_EQUIPMENT_LABELS = new Set(['杠铃', '哑铃']);

export function tracksWeightKg(sessionExercise) {
  const label = sessionExercise && sessionExercise.equipmentLabel ? sessionExercise.equipmentLabel : '';
  return WEIGHT_TRACKED_EQUIPMENT_LABELS.has(String(label));
}

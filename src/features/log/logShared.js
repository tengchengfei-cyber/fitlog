/**
 * 训练记录功能共享工具（新建 / 编辑 / 历史 / 详情 + 完成训练分析流水线）。
 *
 * 设计要点：
 * - 只做「展示格式化 + 跨页面共享的小组件 + 分析快照生成」；
 * - 会话结构的增删改都在 sessionOps.js（纯逻辑、可单测）；
 * - 分析生成遵循 docs/CONTRACTS.md 3.8：动态 import（容错），失败不阻塞训练保存。
 */
import { el } from '../../app/dom.js';
import { badge, callout } from '../../ui/index.js';
import { getGoalLabel, saveAnalysis, getAnalysis } from '../../app/store.js';
import {
  formatDateTime,
  formatDuration,
  formatVolume,
  formatWeight,
  formatTime,
  relativeTime
} from '../../app/format.js';
import { EXERCISES, equipmentLabel, patternLabel } from '../../data/exercises/index.js';
import { MUSCLES, MUSCLES_BY_ID, MUSCLE_GROUPS } from '../../data/muscles.js';
import { STOP_TRAINING_MESSAGE, DISCOMFORT_MESSAGE, SAFETY_DISCLAIMER } from '../../data/safety.js';
import { summarizeVolume, volumeMeta } from '../../app/metrics.js';

export const ANALYSIS_PROMPT_VERSION = 'prompt-2026.10.1';

/** 训练后状态自查选项（结束训练 sheet / 详情页共用）。 */
export const POST_CHECK_OPTIONS = [
  {
    value: 'ok',
    label: '无不适',
    shortLabel: '无不适',
    hint: '训练后感觉正常，可以正常结束本次训练。'
  },
  {
    value: 'discomfort',
    label: '有轻微不适或疼痛',
    shortLabel: '轻微不适',
    hint: '如轻微酸痛、紧绷或活动时不适。分析会使用降级措辞，不提供加量建议。'
  },
  {
    value: 'red-flag',
    label: '出现胸痛、呼吸困难、眩晕、麻木、异常疲劳等',
    shortLabel: '需要谨慎对待的信号',
    hint: '请停止训练并尽快寻求专业医疗意见。完成后分析页会置顶安全提示，且不提供加练建议。'
  }
];

export const POST_CHECK_TONES = {
  ok: 'success',
  discomfort: 'warning',
  'red-flag': 'danger'
};

/** 训练后状态徽标。 */
export function postCheckBadge(status) {
  const option = POST_CHECK_OPTIONS.find((item) => item.value === status) || POST_CHECK_OPTIONS[0];
  return badge({ label: option.shortLabel, tone: POST_CHECK_TONES[option.value] || 'neutral' });
}

/**
 * 训练后状态提示块：red-flag 展示「停止训练 + 寻求医疗意见」固定文案，
 * discomfort 展示降级措辞，ok 返回 null。
 */
export function postCheckCallout(session) {
  const postCheck = (session && session.postCheck) || { status: 'ok', note: '' };
  if (postCheck.status === 'red-flag') {
    return callout({
      tone: 'danger',
      title: '本次训练记录了需要谨慎对待的信号',
      children: [
        el('p', { textContent: STOP_TRAINING_MESSAGE }),
        postCheck.note
          ? el('p', { className: 'mt-2', textContent: `你的备注：${postCheck.note}` })
          : null
      ]
    });
  }
  if (postCheck.status === 'discomfort') {
    return callout({
      tone: 'warning',
      title: '本次训练记录了轻中度不适',
      children: [
        el('p', { textContent: DISCOMFORT_MESSAGE }),
        postCheck.note
          ? el('p', { className: 'mt-2', textContent: `你的备注：${postCheck.note}` })
          : null
      ]
    });
  }
  return null;
}

/** 目标徽标。 */
export function goalBadge(goal) {
  return badge({ label: getGoalLabel(goal), tone: 'accent', iconName: 'target' });
}

/** 把动作库对象转换为 SessionExercise 快照所需的器械/模式中文标签。 */
export function exerciseSnapshotLabels(exercise) {
  return {
    equipmentLabel: exercise ? equipmentLabel(exercise.equipment) : '',
    patternLabel: exercise ? patternLabel(exercise.pattern) : ''
  };
}

/** muscleId 数组 → 中文名（忽略未知 id）。 */
export function muscleNames(ids) {
  return (Array.isArray(ids) ? ids : [])
    .map((id) => MUSCLES_BY_ID[id])
    .filter(Boolean)
    .map((muscle) => muscle.name);
}

/** 训练动作的副标题：器械 · 肌群（主要/次要）。 */
export function sessionExerciseSubtitle(sessionExercise) {
  const parts = [];
  if (sessionExercise && sessionExercise.equipmentLabel) parts.push(sessionExercise.equipmentLabel);
  const primary = muscleNames(sessionExercise && sessionExercise.primaryMuscles);
  if (primary.length) parts.push(primary.slice(0, 2).join('、'));
  return parts.join(' · ') || '未标注器械';
}

/** 历史页动作标题：优先展示动作名列表。 */
export function sessionTitleText(session, max = 2) {
  const names = ((session && session.exercises) || []).map((item) => item.exerciseName).filter(Boolean);
  if (!names.length) return session && session.title ? session.title : '训练记录';
  return names.slice(0, max).join(' · ') + (names.length > max ? ` 等 ${names.length} 个动作` : '');
}

/** 总吨位展示：没有有效负荷数据时显示「—」。 */
export function volumeLabel(totalVolumeKg) {
  if (totalVolumeKg === null || totalVolumeKg === undefined) return '—';
  return formatVolume(totalVolumeKg);
}

/**
 * 训练量展示口径（项目总监 P1 整改）：
 * 只有在重量与次数 100% 覆盖全部正式组时才使用「总吨位」；
 * 否则显示「已记录组估算吨位」并给出覆盖比例。
 */
export function sessionVolumeMeta(session) {
  return volumeMeta(summarizeVolume(session));
}

/** 单组重量展示。 */
export function setWeightLabel(set) {
  if (!set || set.weightKg === null || set.weightKg === undefined) return '—';
  return `${formatWeight(set.weightKg)}${set.perSide ? ' / 侧' : ''}`;
}

/** 单组摘要（详情页只读展示）：40 kg × 10 · RPE 8 · 休息 90 秒 */
export function setSummaryText(set) {
  if (!set) return '';
  const parts = [];
  parts.push(setWeightLabel(set));
  parts.push(set.reps === null || set.reps === undefined ? '次数 —' : `× ${set.reps}`);
  if (set.rpe !== null && set.rpe !== undefined) parts.push(`RPE ${set.rpe}`);
  if (set.restSec !== null && set.restSec !== undefined) parts.push(`休息 ${set.restSec} 秒`);
  if (set.kind === 'warmup') parts.unshift('热身');
  return parts.join(' · ');
}

/** 会话开始时间展示。 */
export function sessionTimeText(session) {
  if (!session) return '—';
  return relativeTime(session.startedAt);
}

/** 会话结束时间展示。 */
export function sessionEndText(session) {
  if (!session || !session.endedAt) return '—';
  return formatDateTime(session.endedAt);
}

/** 时长展示。 */
export function durationLabel(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  return formatDuration(minutes);
}

/** 训练备注摘要（列表/详情）。 */
export function sessionNote(session) {
  return (session && typeof session.note === 'string' && session.note.trim()) || '';
}

/**
 * 分析快照是否早于训练的最后修改（用于「分析基于上次保存的版本」提示）。
 */
export function isAnalysisStale(session, analysis) {
  if (!session || !analysis || !analysis.meta) return false;
  const generatedAt = analysis.meta.generatedAt;
  if (!generatedAt || !session.updatedAt) return false;
  return String(session.updatedAt) > String(generatedAt);
}

/** 读取会话分析状态（含是否早于最后修改）。 */
export function analysisState(session) {
  if (!session) return { analysis: null, meta: null, hasAnalysis: false, stale: false };
  const analysis = getAnalysis(session.id);
  return {
    analysis,
    meta: analysis && analysis.meta ? analysis.meta : null,
    hasAnalysis: Boolean(analysis),
    stale: isAnalysisStale(session, analysis)
  };
}

/**
 * 调用分析模块生成并保存分析快照（契约 3.8）。
 *
 * 流程（按安全性排序）：
 * 1. 规则层 analyzeSession + 模板文案 generateNarrative，先保存一份确定性快照（即使 AI 失败也不丢分析）；
 * 2. 若用户在设置页配置了自有模型（BYOK），再尝试 AI 表达层增强；
 * 3. AI 结果需通过引用/数字/禁用表述/加量约束校验；失败则保留模板快照并记录回退原因。
 *
 * 动态 import + 容错：规则层失败抛出，由调用方 toast 提示，不阻塞训练保存。
 *
 * @param {object} session 已完成的会话（必须先经过 store.completeSession / updateSession 写入）
 * @param {{useAi?: boolean}} options
 * @returns {Promise<{ facts: object, narrative: object, meta: object }>}
 */
export async function generateAnalysisSnapshot(session, { useAi = true } = {}) {
  const [rulesModule, narrativeModule, evidenceModule, stretchesModule, storeModule] = await Promise.all([
    import('../analysis/rules.js'),
    import('../analysis/narrative.js'),
    import('../../data/evidence.js').catch(() => null),
    import('../../data/stretches.js').catch(() => null),
    import('../../app/store.js')
  ]);
  if (!rulesModule || typeof rulesModule.analyzeSession !== 'function') {
    throw new Error('分析规则模块 analyzeSession 未就绪');
  }
  if (!narrativeModule || typeof narrativeModule.generateNarrative !== 'function') {
    throw new Error('分析文案模块 generateNarrative 未就绪');
  }
  const { analyzeSession } = rulesModule;
  const { generateNarrative } = narrativeModule;
  const EVIDENCE_RULES = evidenceModule && evidenceModule.EVIDENCE_RULES;
  const EVIDENCE_VERSION = evidenceModule && evidenceModule.RULES_VERSION;
  const stretchesFor = stretchesModule && stretchesModule.stretchesFor;
  const now = new Date().toISOString();
  const evidence = EVIDENCE_RULES
    ? { EVIDENCE_RULES, ...(EVIDENCE_VERSION ? { RULES_VERSION: EVIDENCE_VERSION } : {}) }
    : undefined;

  const facts = analyzeSession({
    session,
    sessions: storeModule.listSessions(),
    exercises: EXERCISES,
    muscles: { MUSCLES, MUSCLES_BY_ID, MUSCLE_GROUPS },
    evidence,
    now
  });
  if (!facts || typeof facts !== 'object') throw new Error('分析事实生成失败');

  const narrative = generateNarrative(facts, {
    evidence: EVIDENCE_RULES || undefined,
    stretches: stretchesFor || undefined,
    now: facts.generatedAt || now
  });
  if (!narrative || typeof narrative !== 'object') throw new Error('分析文案生成失败');

  const meta = {
    engine: 'template',
    rulesVersion: facts.rulesVersion || null,
    dataVersion: facts.dataVersion || null,
    promptVersion: ANALYSIS_PROMPT_VERSION,
    model: null,
    providerLabel: null,
    knowledgeSources: [],
    aiFallbackReason: null,
    aiError: null,
    generatedAt: facts.generatedAt || now
  };
  // 先保存确定性模板快照：AI 失败时仍有一份可解释的分析。
  saveAnalysis(session.id, { facts, narrative, meta });
  if (!useAi) return { facts, narrative, meta };

  try {
    const [{ loadAiConfig, isAiConfigured }, aiModule] = await Promise.all([
      import('../ai/config.js'),
      import('../ai/analysis.js')
    ]);
    const config = loadAiConfig();
    if (!isAiConfigured(config)) {
      meta.aiFallbackReason = 'not-configured';
      saveAnalysis(session.id, { facts, narrative, meta });
      return { facts, narrative, meta };
    }
    const aiResult = await aiModule.generateAiEnhancedNarrative({
      facts,
      session,
      templateNarrative: narrative,
      config,
      timeoutMs: 30000
    });
    if (aiResult.engine === 'model') {
      meta.engine = 'model';
      meta.model = aiResult.model;
      meta.providerLabel = aiResult.providerLabel;
      meta.promptVersion = aiResult.promptVersion;
      meta.knowledgeSources = aiResult.knowledgeSources || [];
      meta.aiFallbackReason = null;
      meta.aiError = null;
      saveAnalysis(session.id, { facts, narrative: aiResult.narrative, meta });
      return { facts, narrative: aiResult.narrative, meta };
    }
    meta.aiFallbackReason = aiResult.fallbackReason;
    meta.aiError = aiResult.error || null;
    saveAnalysis(session.id, { facts, narrative, meta });
    return { facts, narrative, meta };
  } catch (err) {
    console.warn('[analysis] AI 增强失败，保留规则模板快照', err);
    meta.aiFallbackReason = 'enhance-error';
    meta.aiError = String(err && err.message ? err.message : err);
    saveAnalysis(session.id, { facts, narrative, meta });
    return { facts, narrative, meta };
  }
}

/** 分析不可用时的统一提示文案（完成训练 / 详情页重试共用）。 */
export const ANALYSIS_UNAVAILABLE_MESSAGE = '分析暂不可用，可在分析页重试';

/** 分析快照的简版状态文本（详情页展示版本信息）。 */
export function analysisMetaText(meta) {
  if (!meta) return '';
  const engineLabel =
    meta.engine === 'model'
      ? `AI 模型${meta.providerLabel ? ` · ${meta.providerLabel}` : ''}${meta.model ? ` · ${meta.model}` : ''}`
      : meta.engine === 'template'
        ? meta.aiFallbackReason && meta.aiFallbackReason !== 'not-configured'
          ? '规则模板（AI 回退）'
          : '规则模板'
        : meta.engine || '未知引擎';
  const parts = [];
  if (meta.rulesVersion) parts.push(`规则 ${meta.rulesVersion}`);
  if (meta.dataVersion) parts.push(`数据 ${meta.dataVersion}`);
  parts.push(engineLabel);
  if (meta.generatedAt) parts.push(`生成于 ${formatDateTime(meta.generatedAt)}`);
  return parts.join(' · ');
}

/** 安全与证据的通用说明（历史/详情页底部）。 */
export function safetyDisclaimerText() {
  return SAFETY_DISCLAIMER;
}

/** 时间格式化成 HH:mm:ss（自动保存状态用）。 */
export function savedAtText(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatTime(d)}:${String(d.getSeconds()).padStart(2, '0')}`;
}

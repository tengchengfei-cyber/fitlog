/**
 * 规则化文案层（AI 表达层的确定性替代实现）。
 *
 * generateNarrative(facts, { evidence, stretches, now, promptVersion }) → Narrative（契约 3.8）
 *
 * 硬约束：
 * - 只使用 AnalysisFacts 中已有的数字与事实，不推断个体生理属性；
 * - 不出现「精准激活百分比」「保证增肌/减脂」「修复疼痛」「慢肌纤维」等表述；
 * - 每条建议结构固定：observation（观察到什么）→ why（为什么，引用规则）→
 *   adjustment（低风险、可撤回的调整）→ premise（适用前提）；
 * - 建议最多 3 条，按优先级；同一建议只调整一个变量，不叠加重量/组数/频率的激进增长；
 * - 数据不足时建议聚焦「记录一致性 / 补全数据」，不产出长期不足结论；
 * - 安全拦截时 suggestions = []，summary 与 safety.message 明确停止训练并寻求专业医疗意见；
 * - 输出完全确定：相同 facts 与参数 → 深比较相等。
 */

import { getRule, getRules } from '../../data/evidence.js';
import {
  DISCOMFORT_MESSAGE,
  SAFETY_DISCLAIMER,
  STOP_TRAINING_MESSAGE
} from '../../data/safety.js';
import {
  completenessLabel,
  missingFieldLabel
} from './rules.js';
import { formatDuration, formatVolume, percent } from '../../app/format.js';

/** 文案模板版本（写入分析快照 meta.promptVersion）。 */
export const PROMPT_VERSION = 'prompt-2026.10.22';
/** 表达层引擎标识（本阶段为确定性模板）。 */
export const NARRATIVE_ENGINE = 'template';

const MAX_SUGGESTIONS = 3;
const MAX_SECTIONS = 4;
const DEFAULT_RULE = 'E-DISCLAIM-001';

/**
 * 吨位表述（项目总监 P1 整改）：
 * 仅当重量与次数 100% 覆盖全部正式组时才可称「总吨位」；
 * 否则只能称「已记录组估算吨位」，并给出覆盖组数/比例，避免把局部记录误解为完整总量。
 */
function isVolumeComplete(facts) {
  return Boolean(facts && facts.dataCompleteness && facts.dataCompleteness.weightRepsCoverage === 1);
}

function volumeCoveredCount(facts) {
  const completeness = facts.dataCompleteness || {};
  if (Number.isFinite(completeness.weightRepsCount)) return completeness.weightRepsCount;
  const total = (facts.session && facts.session.workingSetCount) || 0;
  return Math.round((completeness.weightRepsCoverage || 0) * total);
}

function volumeClause(facts) {
  const session = facts.session;
  if (!session || session.totalVolumeKg === null || session.totalVolumeKg === undefined) return '';
  if (isVolumeComplete(facts)) {
    return `，本次总吨位约 ${formatVolume(session.totalVolumeKg)}`;
  }
  return (
    `，本次已记录组估算吨位约 ${formatVolume(session.totalVolumeKg)}` +
    `（${volumeCoveredCount(facts)}/${session.workingSetCount} 组有重量与次数，不是完整训练总量）`
  );
}

function volumeFactsLine(facts) {
  const session = facts.session;
  if (!session || session.totalVolumeKg === null || session.totalVolumeKg === undefined) {
    return '吨位：—（缺少重量或次数，无法计算）';
  }
  if (isVolumeComplete(facts)) {
    return `总吨位：约 ${formatVolume(session.totalVolumeKg)}`;
  }
  return (
    `已记录组估算吨位：约 ${formatVolume(session.totalVolumeKg)}` +
    `（仅 ${volumeCoveredCount(facts)}/${session.workingSetCount} 组有重量与次数，不是完整总量）`
  );
}

function resolveRule(id, evidenceIndex) {
  if (evidenceIndex && typeof evidenceIndex.get === 'function') {
    const fromContext = evidenceIndex.get(id);
    if (fromContext) return fromContext;
  }
  return getRule(id);
}

function buildEvidenceIndex(evidence) {
  if (!evidence) return null;
  if (typeof evidence.getRule === 'function') {
    return { get: (id) => evidence.getRule(id) };
  }
  if (Array.isArray(evidence)) {
    const map = new Map(evidence.filter((rule) => rule && rule.id).map((rule) => [rule.id, rule]));
    return { get: (id) => map.get(id) || null };
  }
  if (Array.isArray(evidence.EVIDENCE_RULES)) {
    const map = new Map(evidence.EVIDENCE_RULES.filter((rule) => rule && rule.id).map((rule) => [rule.id, rule]));
    return { get: (id) => map.get(id) || null };
  }
  return null;
}

/** 过滤并去重 ruleIds，只保留证据库中真实存在的 id；为空时回退到免责规则。 */
function safeRuleIds(ids, evidenceIndex) {
  const result = [];
  const seen = new Set();
  for (const id of Array.isArray(ids) ? ids : []) {
    if (!id || seen.has(id)) continue;
    if (!resolveRule(id, evidenceIndex)) continue;
    seen.add(id);
    result.push(id);
  }
  return result.length ? result : [DEFAULT_RULE];
}

function rulesText(ids, evidenceIndex) {
  const rules = [];
  for (const id of safeRuleIds(ids, evidenceIndex)) {
    const rule = resolveRule(id, evidenceIndex);
    if (rule) rules.push(rule.title);
  }
  return rules.map((title) => `「${title}」`).join('、');
}

function buildWhy(ids, explanation, evidenceIndex) {
  const titles = rulesText(ids, evidenceIndex);
  return `依据${titles}：${explanation}`;
}

function groupSummary(groupExposure) {
  return groupExposure
    .slice(0, 3)
    .map((group) => `${group.groupName}约 ${group.estimatedSets} 组`)
    .join('、');
}

function patternSummary(patterns) {
  return patterns
    .slice(0, 3)
    .map((pattern) => `${pattern.label} ${pattern.workingSetCount} 组`)
    .join('、');
}

function missingText(missingFields) {
  return (Array.isArray(missingFields) ? missingFields : [])
    .map((field) => missingFieldLabel(field))
    .join('、');
}

function buildSuggestion({
  id,
  observation,
  why,
  adjustment,
  premise,
  ruleIds,
  evidenceIndex
}) {
  return {
    id,
    priority: 0,
    observation,
    why,
    adjustment,
    premise,
    ruleIds: safeRuleIds(ruleIds, evidenceIndex)
  };
}

// ---------- 建议候选 ----------

function suggestionDiscomfort(facts, ctx) {
  const { evidenceIndex } = ctx;
  return buildSuggestion({
    id: 'suggestion-discomfort-caution',
    observation: '本次训练记录到了轻中度不适的描述，属于需要谨慎处理的信号。',
    why: buildWhy(
      ['E-SAFE-001', 'E-DISCLAIM-001'],
      '安全优先于训练优化；出现不适时应先降低刺激、观察变化，而不是继续加量。',
      evidenceIndex
    ),
    adjustment:
      '下一次训练先降低强度或减少 1 个动作的组数，观察症状是否缓解；本次不提供加量建议。' +
      '如果不适持续、加重或反复出现，请停止训练并咨询专业医疗人员。',
    premise: '以症状为轻中度、且没有胸痛、呼吸困难、眩晕等危险信号为前提；如出现这些信号请立即停止训练并寻求专业医疗意见。',
    ruleIds: ['E-SAFE-001', 'E-DISCLAIM-001'],
    evidenceIndex
  });
}

function suggestionRecordCompleteness(facts, ctx) {
  const { evidenceIndex } = ctx;
  const completeness = facts.dataCompleteness;
  const weightRepsPercent = percent(completeness.weightRepsCoverage);
  const rpePercent = percent(completeness.rpeCoverage);
  const restPercent = percent(completeness.restCoverage);
  const missingWeightReps = completeness.missingFields.filter(
    (field) => field === 'weight' || field === 'reps'
  );
  const missing = missingText(missingWeightReps);

  if (missingWeightReps.length > 0 || completeness.weightRepsCoverage < 1) {
    const observation =
      `本次 ${facts.session.workingSetCount} 个正式组中，同时记录重量与次数的比例为 ${weightRepsPercent}` +
      (missing ? `，缺少${missing}的记录` : '') +
      '。';
    return buildSuggestion({
      id: 'suggestion-record-completeness',
      observation,
      why: buildWhy(
        ['E-DATA-001'],
        '缺少重量或次数时，分析只能描述组数分布，无法判断负荷、强度或进步幅度；补全记录后才能做更可靠的分析。',
        evidenceIndex
      ),
      adjustment:
        '下一次训练先为 2–3 个主要动作补记重量与次数（自重动作可记 0 kg 或备注说明），' +
        '暂不调整重量与组数；如记录本身影响训练，可只补记主要动作。',
      premise: '以当前训练安排与记录习惯基本可行为前提；记录目的是便于回顾，不要求每个动作都记录完整。',
      ruleIds: ['E-DATA-001'],
      evidenceIndex
    });
  }

  return buildSuggestion({
    id: 'suggestion-record-completeness',
    observation:
      `本次 ${facts.session.workingSetCount} 个正式组的重量与次数已完整记录（${weightRepsPercent}），` +
      `但 RPE 覆盖 ${rpePercent}、休息时间覆盖 ${restPercent}。`,
    why: buildWhy(
      ['E-DATA-001'],
      '缺少 RPE 与休息时间时，分析只能描述做了多少，无法判断每组有多接近力竭以及组间恢复是否充分。',
      evidenceIndex
    ),
    adjustment:
      '下一次训练可先为主要动作的正式组补记 RPE（主观用力程度，1–10）与组间休息秒数，' +
      '暂不调整重量、组数与训练频率。',
    premise: '以记录负担可接受为前提；如不方便每组记录，可只记录最后 1–2 个正式组作为参考。',
    ruleIds: ['E-DATA-001'],
    evidenceIndex
  });
}

function suggestionBuildSample(facts, ctx) {
  const { evidenceIndex } = ctx;
  const history = facts.history;
  return buildSuggestion({
    id: 'suggestion-build-sample',
    observation: `近 ${history.windowDays} 天窗口内只有 ${history.sessionCount} 次已完成训练，当前样本不足以判断近期训练分布。`,
    why: buildWhy(
      ['E-SAMPLE-001'],
      '少量记录无法区分偶然波动与稳定趋势；先建立可对比的基线，再讨论分布或频率更可靠。',
      evidenceIndex
    ),
    adjustment:
      '接下来 2 次训练尽量保持动作与重量不变，完整记录组数、重量与次数，' +
      '积累至少 3 次记录后再参考近期分布；暂不增加训练量。',
    premise: '以身体状态稳定、无疼痛或不适为前提；如出现不适，请先停止训练并咨询专业医疗人员。',
    ruleIds: ['E-SAMPLE-001'],
    evidenceIndex
  });
}

function suggestionRecordingConsistency(facts, ctx) {
  const { evidenceIndex } = ctx;
  const history = facts.history;
  return buildSuggestion({
    id: 'suggestion-recording-consistency',
    observation: `近 ${history.windowDays} 天已完成 ${history.sessionCount} 次训练，记录频率尚不稳定。`,
    why: buildWhy(
      ['E-CONS-001'],
      '规律记录与规律训练比频繁更换计划更重要；先把「可坚持」的节奏固定下来，后续分析才有可比性。',
      evidenceIndex
    ),
    adjustment:
      '可以先固定每周 2 个训练日、保持 2–3 周，并只记录组数、重量与次数这三项；' +
      '暂不增加动作、组数或训练频率。',
    premise: '以时间安排与恢复情况允许为前提；如果每周 2 天难以坚持，可先降到 1–2 天但保持连续。',
    ruleIds: ['E-CONS-001'],
    evidenceIndex
  });
}

function suggestionProgression(facts, ctx) {
  const { evidenceIndex } = ctx;
  const volumeText = volumeClause(facts);
  return buildSuggestion({
    id: 'suggestion-progressive-overload',
    observation: `近 14 天有 ${facts.history.sessionCount} 次已完成训练${volumeText}，已具备可对比的近期基线。`,
    why: buildWhy(
      ['E-PROG-001', 'E-EFFORT-001'],
      '渐进应从稳定的基线出发，一次只调整一个变量；一般健康成人不必每组都练到力竭。',
      evidenceIndex
    ),
    adjustment:
      '接下来 1–2 次训练保持重量与组数不变，只尝试把 1 个主要动作的每组次数增加 1–2 次；' +
      '确认动作质量与恢复稳定后，再考虑调整重量。',
    premise: '以动作质量稳定、无疼痛或不适为前提；若恢复变差、动作变形或出现不适，回退到当前水平。',
    ruleIds: ['E-PROG-001', 'E-EFFORT-001'],
    evidenceIndex
  });
}

function suggestionDistributionFocus(facts, ctx) {
  const { evidenceIndex } = ctx;
  const least = [...facts.groupExposure]
    .filter((group) => group.estimatedSets > 0)
    .sort((a, b) => {
      if (a.estimatedSets !== b.estimatedSets) return a.estimatedSets - b.estimatedSets;
      return a.groupId < b.groupId ? -1 : a.groupId > b.groupId ? 1 : 0;
    })
    .slice(0, 2);
  const leastText = least.map((group) => `${group.groupName}（约 ${group.estimatedSets} 组）`).join('、');
  return buildSuggestion({
    id: 'suggestion-distribution-focus',
    observation: `本次估计组数较少的肌群组为${leastText || '（数据不足）'}，训练分布存在可调整空间。`,
    why: buildWhy(
      ['E-FREQ-001', 'E-CONS-001'],
      '一般健康成人每周至少 2 天覆盖主要肌群；在保持总训练量不变的前提下调整分配，比直接增加总组数更稳妥。',
      evidenceIndex
    ),
    adjustment:
      '如果有时间安排下一次训练，可先为覆盖较少的 1 个肌群组增加 1 个动作，' +
      '同时把其他动作各减少约 1 组，保持总组数基本不变。',
    premise: '以本次训练恢复良好、时间允许为前提；调整后若恢复变差，应回退到当前安排。',
    ruleIds: ['E-FREQ-001', 'E-CONS-001'],
    evidenceIndex
  });
}

function suggestionMaintainConsistency(facts, ctx) {
  const { evidenceIndex } = ctx;
  return buildSuggestion({
    id: 'suggestion-maintain-consistency',
    observation:
      `近 ${facts.history.windowDays} 天已完成 ${facts.history.sessionCount} 次训练，` +
      `估计覆盖 ${facts.groupExposure.length} 个肌群组。`,
    why: buildWhy(
      ['E-CONS-001', 'E-SAMPLE-001'],
      '持续、可比较的记录是后续分析的前提；在基线稳定前，维持当前节奏比增加变量更有价值。',
      evidenceIndex
    ),
    adjustment:
      '接下来 2 周保持当前训练频率与动作安排不变，训练后补记 1 条主观感受备注，' +
      '暂不同时增加重量、组数或频率。',
    premise: '以当前安排可坚持、无明显不适为前提；若时间紧张，优先保留每周至少 2 天力量训练。',
    ruleIds: ['E-CONS-001', 'E-SAMPLE-001'],
    evidenceIndex
  });
}

function buildSuggestions(facts, evidenceIndex) {
  if (facts.flags.safetyIntercepted) return [];

  const completenessGap =
    facts.dataCompleteness.level !== 'complete' ||
    facts.dataCompleteness.missingFields.some((field) => field === 'weight' || field === 'reps');
  const sufficient = facts.history.sufficient;
  const discomfort = facts.flags.discomfort;
  const volumeAvailable = facts.session.totalVolumeKg !== null;

  const candidates = [];
  if (discomfort) candidates.push(suggestionDiscomfort(facts, { evidenceIndex }));
  if (completenessGap) candidates.push(suggestionRecordCompleteness(facts, { evidenceIndex }));

  if (!sufficient) {
    candidates.push(suggestionBuildSample(facts, { evidenceIndex }));
    candidates.push(suggestionRecordingConsistency(facts, { evidenceIndex }));
  } else {
    if (!discomfort && volumeAvailable && facts.dataCompleteness.weightRepsCoverage === 1) {
      candidates.push(suggestionProgression(facts, { evidenceIndex }));
    }
    if (!discomfort) {
      candidates.push(suggestionDistributionFocus(facts, { evidenceIndex }));
      candidates.push(suggestionMaintainConsistency(facts, { evidenceIndex }));
    } else {
      candidates.push(suggestionMaintainConsistency(facts, { evidenceIndex }));
    }
  }

  return candidates.slice(0, MAX_SUGGESTIONS).map((suggestion, index) => ({
    ...suggestion,
    priority: index + 1
  }));
}

// ---------- 分区 ----------

function sectionSessionFacts(facts) {
  const session = facts.session;
  const parts = [
    `目标：${session.goalLabel}`,
    `动作：${session.exerciseCount} 个`,
    `正式组：${session.workingSetCount} 组（热身组不计入）`,
    volumeFactsLine(facts),
    `用时：${session.durationMin !== null ? formatDuration(session.durationMin) : '—'}`
  ];
  return {
    id: 'session-facts',
    title: '本次记录事实',
    body: `${parts.join('；')}。以上数字直接来自本次训练记录。`,
    ruleIds: safeRuleIds(['E-DATA-001'], null)
  };
}

function sectionDistribution(facts) {
  const groups = facts.groupExposure;
  const patterns = facts.patterns;
  const lines = [];
  if (groups.length) {
    lines.push(
      `按动作与组数估计，本次训练涉及 ${groups.length} 个肌群组：` +
        groups
          .slice(0, 6)
          .map((group) => `${group.groupName}约 ${group.estimatedSets} 组（直接 ${group.directSets}、间接折算后约 ${group.indirectSets * 0.5}）`)
          .join('、') +
        '。'
    );
  } else {
    lines.push('本次没有可估计的肌群分布。');
  }
  if (patterns.length) {
    lines.push(`动作模式分布：${patternSummary(patterns)}。`);
  }
  lines.push('肌群分布是「动作通常涉及的肌群映射」估计，不是精确剂量，也不能说明个体激活程度。');
  const ruleIds = ['E-DATA-001', 'E-SAMPLE-001'];
  if (facts.session.totalVolumeKg !== null) ruleIds.push('E-VOL-001');
  return {
    id: 'distribution',
    title: '训练分布估计',
    body: lines.join(' '),
    ruleIds: safeRuleIds(ruleIds, null)
  };
}

function sectionHistory(facts) {
  const history = facts.history;
  const lines = [
    `近 ${history.windowDays} 天窗口内有 ${history.sessionCount} 次已完成训练（含本次，按 startedAt 聚合且不重复累加）。`
  ];
  if (history.groupFrequency.length) {
    lines.push(
      '窗口内估计组数较多的肌群组：' +
        history.groupFrequency
          .slice(0, 5)
          .map((group) => `${group.groupName}约 ${group.estimatedSets} 组、训练 ${group.daysTrained} 天`)
          .join('、') +
        '。'
    );
  }
  if (history.window7) {
    lines.push(`近 7 天窗口内有 ${history.window7.sessionCount} 次已完成训练（同一口径）。`);
  }
  lines.push('窗口聚合只作记录展示与初步参考，不作为个体处方。');
  return {
    id: 'history',
    title: '近期训练分布（估计）',
    body: lines.join(' '),
    ruleIds: safeRuleIds(['E-FREQ-001', 'E-CONS-001', 'E-SAMPLE-001'], null)
  };
}

function sectionSample(facts) {
  const history = facts.history;
  const lines = [
    `近 ${history.windowDays} 天窗口内只有 ${history.sessionCount} 次已完成训练（含本次），少于 3 次。`,
    '当前样本不足以判断近期训练分布，以下只陈述本次训练事实，不产出长期分布或频率结论。'
  ];
  if (history.window7) {
    lines.push(`近 7 天窗口内有 ${history.window7.sessionCount} 次已完成训练。`);
  }
  return {
    id: 'sample',
    title: '样本与数据完整度',
    body: lines.join(' '),
    ruleIds: safeRuleIds(['E-SAMPLE-001', 'E-DATA-001'], null)
  };
}

function sectionDataQuality(facts) {
  const completeness = facts.dataCompleteness;
  const missing = missingText(completeness.missingFields);
  const lines = [
    `数据完整度：${completenessLabel(completeness.level)}` +
      `（重量与次数覆盖 ${percent(completeness.weightRepsCoverage)}，RPE 覆盖 ${percent(completeness.rpeCoverage)}，` +
      `休息时间覆盖 ${percent(completeness.restCoverage)}）。`
  ];
  if (missing) lines.push(`缺失字段：${missing}；未记录的数据不做推测。`);
  lines.push(completeness.note);
  lines.push('统计口径：只统计 working 组，直接组按 1、间接组按 0.5 折算为估计组数。');
  return {
    id: 'data-quality',
    title: '数据完整度与统计口径',
    body: lines.join(' '),
    ruleIds: safeRuleIds(['E-DATA-001', 'E-SAMPLE-001'], null)
  };
}

function sectionSafety(facts) {
  const redFlags = facts.flags.redFlags;
  const lines = [];
  if (redFlags.length) {
    lines.push(`记录中出现的需要谨慎对待的信号：${redFlags.join('、')}。`);
  }
  lines.push(STOP_TRAINING_MESSAGE);
  return {
    id: 'safety',
    title: '安全提示：请停止训练并寻求专业医疗意见',
    body: lines.join(' '),
    ruleIds: safeRuleIds(['E-SAFE-001', 'E-DISCLAIM-001'], null)
  };
}

function buildSections(facts) {
  if (facts.flags.safetyIntercepted) {
    return [
      sectionSafety(facts),
      sectionSessionFacts(facts),
      sectionDistribution(facts),
      sectionDataQuality(facts)
    ].slice(0, MAX_SECTIONS);
  }
  const sections = [sectionSessionFacts(facts), sectionDistribution(facts)];
  if (facts.history.sufficient) {
    sections.push(sectionHistory(facts));
  } else {
    sections.push(sectionSample(facts));
  }
  sections.push(sectionDataQuality(facts));
  return sections.slice(0, MAX_SECTIONS);
}

// ---------- 摘要 ----------

function buildSummary(facts) {
  const session = facts.session;
  const flags = facts.flags;
  const history = facts.history;
  const completeness = facts.dataCompleteness;

  if (flags.safetyIntercepted) {
    const labels = flags.redFlags.length ? flags.redFlags.join('、') : '训练后自查异常';
    return (
      `本次训练记录包含需要谨慎对待的不适信号（${labels}），分析已进入安全拦截，不提供训练优化或加量建议。` +
      '请停止常规训练，并尽快寻求专业医疗意见；本应用不做诊断，也无法判断这些症状的原因。'
    );
  }

  const parts = [];
  const volumeText =
    session.totalVolumeKg !== null ? volumeClause(facts) : '，未记录重量与次数、吨位无法计算';
  const durationText = session.durationMin !== null ? `，用时约 ${formatDuration(session.durationMin)}` : '';
  parts.push(
    `本次「${session.goalLabel}」训练共 ${session.exerciseCount} 个动作、${session.workingSetCount} 个正式组${durationText}${volumeText}。`
  );

  if (facts.groupExposure.length) {
    parts.push(`按动作与组数估计，本次训练涉及 ${facts.groupExposure.length} 个肌群组，${groupSummary(facts.groupExposure)}。`);
  } else {
    parts.push('本次没有可估计的肌群分布。');
  }

  const completenessPart = `数据完整度为「${completenessLabel(completeness.level)}」`;
  if (history.sufficient) {
    parts.push(`${completenessPart}；近 ${history.windowDays} 天有 ${history.sessionCount} 次已完成训练，可作为近期频率的初步参考。`);
  } else {
    parts.push(`${completenessPart}；当前样本不足以判断近期训练分布（近 ${history.windowDays} 天 ${history.sessionCount} 次已完成训练）。`);
  }
  return parts.join('');
}

// ---------- 主入口 ----------

/**
 * 基于 AnalysisFacts 生成确定性中文说明。
 * @param {object} facts analyzeSession() 的输出
 * @param {{ evidence?: object, stretches?: object, now?: string|Date, promptVersion?: string }} options
 * @returns {object} Narrative（契约 3.8）
 */
export function generateNarrative(facts, options = {}) {
  if (!facts || typeof facts !== 'object' || !facts.session || !facts.dataCompleteness) {
    throw new TypeError('generateNarrative 需要 analyzeSession 生成的 facts 对象');
  }
  const evidenceIndex = buildEvidenceIndex(options.evidence);
  // promptVersion / now 保留给未来可替换的表达层；本实现输出不依赖当前时间，保证可复现。
  void options.now;
  void options.promptVersion;

  const suggestions = buildSuggestions(facts, evidenceIndex);
  const sections = buildSections(facts).map((section) => ({
    id: section.id,
    title: section.title,
    body: section.body,
    ruleIds: safeRuleIds(section.ruleIds, evidenceIndex)
  }));

  const limitations = [];
  for (const item of Array.isArray(facts.limitations) ? facts.limitations : []) {
    if (item && item.code && item.text) limitations.push({ code: item.code, text: item.text });
  }
  limitations.push({
    code: 'template-narrative',
    text:
      '本说明由确定性模板生成（engine: template），不包含模型自由生成内容；所有数字与结论均来自本次分析事实快照，可由相同输入复现。'
  });
  if (suggestions.length) {
    limitations.push({
      code: 'single-variable',
      text: '每条建议一次只调整一个变量，且都可以撤回；不建议同时增加重量、组数或训练频率。'
    });
  }

  const intercepted = Boolean(facts.flags.safetyIntercepted);
  const discomfort = Boolean(facts.flags.discomfort);
  const redFlags = Array.isArray(facts.flags.redFlags) ? facts.flags.redFlags : [];
  const safetyMessage = intercepted
    ? `${redFlags.length ? `记录中出现的信号：${redFlags.join('、')}。` : ''}${STOP_TRAINING_MESSAGE}`
    : discomfort
      ? DISCOMFORT_MESSAGE
      : SAFETY_DISCLAIMER;

  return {
    summary: buildSummary(facts),
    sections,
    suggestions,
    limitations,
    safety: {
      intercepted,
      level: intercepted ? 'stop' : discomfort ? 'caution' : 'none',
      message: safetyMessage,
      ruleIds: safeRuleIds(['E-SAFE-001', 'E-DISCLAIM-001'], evidenceIndex)
    }
  };
}

/** 供页面/测试复用的规则查询（与 generateNarrative 同一来源）。 */
export function narrativeRuleTitles(ids, evidence) {
  const evidenceIndex = buildEvidenceIndex(evidence);
  return getRules(ids).map((rule) => rule.title);
}

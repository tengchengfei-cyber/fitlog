/**
 * 训练分析页（路由 #/analysis/:sessionId，契约 4.5）。
 *
 * 结构固定为 6 个分区：
 * ① 安全提示区（拦截时红色置顶；常规时轻提示 + 免责声明）
 * ② 本次记录事实
 * ③ 训练分布估计（直接/间接训练暴露，含图例与口径说明）
 * ④ 建议（≤3，观察→原因→低风险调整→适用前提，可展开依据）
 * ⑤ 拉伸与放松
 * ⑥ 证据与局限（规则 id、版本、来源、审核日期、适用人群、数据不足项、不确定性）
 *
 * 数据来源：
 * - 分析快照：store.getAnalysis(sessionId) → { facts, narrative, meta }；
 * - 快照缺失时由本页点击「生成分析」调用 analyzeSession + generateNarrative 并 store.saveAnalysis；
 * - 若用户在设置页配置了自有模型（BYOK），会在规则层之后尝试 AI 表达层增强；
 *   模型输出必须通过引用/数字/禁用表述校验，否则回退模板；安全拦截时完全不调用模型。
 *
 * 所有数值只来自 facts；本页不推断任何个体生理属性，也不做医疗诊断。
 */

import { el } from '../../app/dom.js';
import * as store from '../../app/store.js';
import { navigate } from '../../app/router.js';
import {
  screen,
  sectionTitle,
  card,
  button,
  badge,
  icon,
  statTile,
  meterRow,
  callout,
  disclosure,
  emptyState,
  toast,
  confirmDialog
} from '../../ui/index.js';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatVolume,
  percent
} from '../../app/format.js';
import { EXERCISES } from '../../data/exercises/index.js';
import { MUSCLES, MUSCLES_BY_ID, MUSCLE_GROUPS } from '../../data/muscles.js';
import {
  EVIDENCE_CATEGORY_LABELS,
  EVIDENCE_LEVEL_LABELS,
  REVIEW_STATUS_LABELS,
  RULES_VERSION,
  getRule
} from '../../data/evidence.js';
import { SAFETY_DISCLAIMER } from '../../data/safety.js';
import {
  analyzeSession,
  RULES_ENGINE_VERSION,
  DATA_VERSION,
  completenessLabel,
  missingFieldLabel
} from './rules.js';
import { generateNarrative, PROMPT_VERSION, NARRATIVE_ENGINE } from './narrative.js';
import * as stretchData from '../../data/stretches.js';
import { generateAnalysisSnapshot } from '../log/logShared.js';
import { AI_FALLBACK_LABELS } from '../ai/analysis.js';

// 拉伸库导出兼容：契约 3.11 用 stretches，Lead/内容同学也可能导出 STRETCHES。
const STRETCH_LIST = Array.isArray(stretchData.STRETCHES)
  ? stretchData.STRETCHES
  : Array.isArray(stretchData.stretches)
    ? stretchData.stretches
    : [];
const STRETCH_BY_ID = Object.fromEntries(
  STRETCH_LIST.filter((stretch) => stretch && stretch.id).map((stretch) => [stretch.id, stretch])
);
const stretchesFor = typeof stretchData.stretchesFor === 'function' ? stretchData.stretchesFor : null;

const SUGGESTION_TITLES = {
  'suggestion-discomfort-caution': '先处理训练后的不适',
  'suggestion-record-completeness': '补全训练记录',
  'suggestion-build-sample': '先积累可对比的样本',
  'suggestion-recording-consistency': '固定可坚持的节奏',
  'suggestion-progressive-overload': '只调整一个变量',
  'suggestion-distribution-focus': '调整训练分布',
  'suggestion-maintain-consistency': '保持当前节奏'
};

const POST_CHECK_LABELS = {
  ok: '无不适',
  discomfort: '轻微不适',
  'red-flag': '需要谨慎对待的信号'
};

// ---------- 小工具 ----------

function sessionWorkingSetCount(session) {
  let count = 0;
  for (const exercise of Array.isArray(session.exercises) ? session.exercises : []) {
    for (const set of Array.isArray(exercise.sets) ? exercise.sets : []) {
      if (set && set.completed !== false && (!set.kind || set.kind === 'working')) count += 1;
    }
  }
  return count;
}

function sessionExerciseWorkingSets(exercise) {
  return (Array.isArray(exercise.sets) ? exercise.sets : []).filter(
    (set) => set && set.completed !== false && (!set.kind || set.kind === 'working')
  ).length;
}

function metaRow(label, value) {
  return el('div', { className: 'analysis-meta__row' }, el('dt', { textContent: label }), el('dd', { textContent: value }));
}

function rulePathLabel(ids) {
  const titles = (Array.isArray(ids) ? ids : [])
    .map((id) => getRule(id))
    .filter(Boolean)
    .map((rule) => rule.title);
  return titles.join('、');
}

function externalLink({ href, label, className = 'analysis-source' }) {
  return el(
    'a',
    {
      className,
      href,
      target: '_blank',
      rel: 'noopener noreferrer'
    },
    icon('external', { size: 13 }),
    el('span', { textContent: label })
  );
}

function buildSourceNode(source) {
  if (!source) {
    return el('p', { className: 'analysis-source analysis-source--pending', textContent: '来源信息缺失，暂不展示。' });
  }
  if (!source.url) {
    return el(
      'p',
      { className: 'analysis-source analysis-source--pending' },
      `来源待补充审核：${source.label || '未标注'}（${source.publisher || '未标注'}）。该规则尚未绑定可公开访问的来源页面。`
    );
  }
  const meta = [source.publisher, source.publishedAt && source.publishedAt !== 'n.d.' ? `发布/复核 ${source.publishedAt}` : null, `访问 ${source.accessedAt || '—'}`]
    .filter(Boolean)
    .join(' · ');
  return el(
    'div',
    { className: 'analysis-source-wrap' },
    externalLink({ href: source.url, label: source.label || source.url }),
    el('p', { className: 'analysis-source__meta', textContent: meta })
  );
}

function ruleCard(rule) {
  return card({
    className: 'analysis-rule',
    padded: true,
    children: [
      el(
        'div',
        { className: 'analysis-rule__head' },
        el('h4', { className: 'analysis-rule__title', textContent: rule.title }),
        el(
          'div',
          { className: 'analysis-rule__badges' },
          badge({ label: EVIDENCE_LEVEL_LABELS[rule.evidenceLevel] || rule.evidenceLevel, tone: 'info' }),
          badge({
            label: REVIEW_STATUS_LABELS[rule.reviewStatus] || rule.reviewStatus,
            tone: rule.reviewStatus === 'reviewed' ? 'success' : 'warning'
          })
        )
      ),
      el('p', { className: 'analysis-rule__statement', textContent: rule.statement }),
      el(
        'dl',
        { className: 'analysis-rule__meta' },
        metaRow('分类', EVIDENCE_CATEGORY_LABELS[rule.category] || rule.category),
        metaRow('审核日期', rule.reviewedAt || '—'),
        metaRow('适用人群', rule.applicability || '—'),
        metaRow('内容版本', rule.contentVersion || '—')
      ),
      buildSourceNode(rule.source),
      el('p', { className: 'analysis-rule__limitations', textContent: `局限：${rule.limitations || '—'}` })
    ]
  });
}

function rulesDisclosure(ids, summary) {
  const rules = (Array.isArray(ids) ? ids : [])
    .map((id) => getRule(id))
    .filter(Boolean);
  if (!rules.length) return null;
  return disclosure({
    summary: summary || `查看依据规则（${rules.length} 条）`,
    children: el(
      'div',
      { className: 'stack' },
      rules.map((rule) => ruleCard(rule)),
      el('p', {
        className: 'analysis-note',
        textContent: '以上规则用于解释建议来源，不构成医疗诊断或个体处方；如与专业医疗意见冲突，以专业医疗意见为准。'
      })
    )
  });
}

// ---------- 快照生成 ----------

/**
 * 生成并保存分析快照：规则层 + 模板文案先落库，再尝试用用户配置的模型增强表达。
 * AI 失败时保留模板快照并记录回退原因，不影响页面展示。
 */
async function createSnapshot(session) {
  return generateAnalysisSnapshot(session);
}

// ---------- 分区 ① 安全提示 ----------

function safetySection(narrative) {
  const safety = narrative.safety || { intercepted: false, level: 'none', message: SAFETY_DISCLAIMER, ruleIds: [] };
  if (safety.intercepted || safety.level === 'stop') {
    return callout({
      tone: 'danger',
      title: '安全提示：请停止训练并寻求专业医疗意见',
      children: [
        el('p', { textContent: safety.message }),
        el('p', {
          className: 'analysis-note',
          textContent: '安全拦截期间，本页不提供训练优化或加量建议；请先由专业医疗人员评估。'
        })
      ]
    });
  }
  if (safety.level === 'caution') {
    return callout({
      tone: 'warning',
      title: '训练后不适提示',
      children: [el('p', { textContent: safety.message })]
    });
  }
  return callout({
    tone: 'info',
    title: '安全提示',
    children: [
      el('p', { textContent: SAFETY_DISCLAIMER }),
      el('p', {
        className: 'analysis-note',
        textContent: '本次记录未检测到需要立即停止训练的危险信号；以下内容为一般性训练参考，不构成诊断。'
      })
    ]
  });
}

// ---------- 分区 ② 本次记录事实 ----------

function factsSection(facts, session, narrative) {
  const sessionFacts = facts.session;
  const completeness = facts.dataCompleteness;
  const completenessTone =
    completeness.level === 'complete' ? 'success' : completeness.level === 'partial' ? 'warning' : 'danger';

  const summaryCard = card({
    className: 'analysis-summary',
    children: [
      el('h3', { className: 'analysis-card-title', textContent: '分析摘要' }),
      el('p', { textContent: narrative.summary })
    ]
  });

  const statGrid = el(
    'div',
    { className: 'grid-2 analysis-stat-grid' },
    statTile({ label: '动作数', value: String(sessionFacts.exerciseCount), hint: '本次记录的动作数量' }),
    statTile({ label: '正式组', value: String(sessionFacts.workingSetCount), hint: '不含热身组' }),
    statTile({
      label: completeness.weightRepsCoverage === 1 ? '总吨位' : '已记录组估算吨位',
      value: sessionFacts.totalVolumeKg !== null ? formatVolume(sessionFacts.totalVolumeKg) : '—',
      hint:
        completeness.weightRepsCoverage === 1
          ? '重量 × 次数的完整总量；单侧组按两侧计'
          : `仅 ${Number.isFinite(completeness.weightRepsCount) ? completeness.weightRepsCount : '—'}/${sessionFacts.workingSetCount} 组有重量与次数；不是完整训练总量`
    }),
    statTile({
      label: '用时',
      value: sessionFacts.durationMin !== null ? formatDuration(sessionFacts.durationMin) : '—',
      hint: '开始到结束的时长'
    })
  );

  const metaCard = card({
    className: 'analysis-facts-meta',
    children: [
      el(
        'div',
        { className: 'row row--between row--wrap' },
        el('span', { className: 'analysis-label', textContent: '训练目标' }),
        badge({ label: sessionFacts.goalLabel, tone: 'accent' })
      ),
      el(
        'div',
        { className: 'row row--between row--wrap' },
        el('span', { className: 'analysis-label', textContent: '训练后状态自查' }),
        badge({
          label: POST_CHECK_LABELS[session.postCheck && session.postCheck.status ? session.postCheck.status : 'ok'],
          tone:
            session.postCheck && session.postCheck.status === 'red-flag'
              ? 'danger'
              : session.postCheck && session.postCheck.status === 'discomfort'
                ? 'warning'
                : 'success'
        })
      ),
      el(
        'div',
        { className: 'row row--between row--wrap' },
        el('span', { className: 'analysis-label', textContent: '数据完整度' }),
        badge({ label: completenessLabel(completeness.level), tone: completenessTone })
      )
    ]
  });

  const coverageList = el(
    'div',
    { className: 'analysis-meter-list' },
    meterRow({ label: '重量与次数覆盖', value: completeness.weightRepsCoverage, max: 1, valueLabel: percent(completeness.weightRepsCoverage) }),
    meterRow({ label: 'RPE 覆盖', value: completeness.rpeCoverage, max: 1, valueLabel: percent(completeness.rpeCoverage) }),
    meterRow({ label: '休息时间覆盖', value: completeness.restCoverage, max: 1, valueLabel: percent(completeness.restCoverage) })
  );

  const missing = (completeness.missingFields || []).map((field) => missingFieldLabel(field)).join('、');
  const completenessNote = el(
    'p',
    { className: 'analysis-note' },
    `${completeness.note}${missing ? `未记录字段：${missing}。` : ''}`
  );

  const exerciseList = el(
    'div',
    { className: 'analysis-exercise-list' },
    (Array.isArray(session.exercises) ? session.exercises : []).map((exercise) =>
      el(
        'div',
        { className: 'analysis-exercise-list__row' },
        el('span', { className: 'analysis-exercise-list__name', textContent: exercise.exerciseName || exercise.exerciseId || '未命名动作' }),
        el('span', {
          className: 'analysis-exercise-list__meta num',
          textContent: `正式 ${sessionExerciseWorkingSets(exercise)} 组${
            exercise.plannedSets !== null && exercise.plannedSets !== undefined ? ` / 计划 ${exercise.plannedSets} 组` : ''
          }`
        })
      )
    )
  );

  return el(
    'section',
    { className: 'analysis-section', 'aria-label': '本次记录事实' },
    sectionTitle({ title: '② 本次记录事实', hint: '来自本次训练记录；热身组不计入分析' }),
    summaryCard,
    statGrid,
    metaCard,
    card({ children: [el('h3', { className: 'analysis-card-title', textContent: '数据完整度' }), coverageList, completenessNote] }),
    card({
      children: [
        el('h3', { className: 'analysis-card-title', textContent: '动作与组数（原始记录）' }),
        exerciseList
      ]
    })
  );
}

// ---------- 分区 ③ 训练分布估计 ----------

function distributionSection(facts) {
  const groups = facts.groupExposure;
  const maxValue = groups.length ? Math.max(...groups.map((group) => group.estimatedSets), 1) : 1;
  const groupMeters = el(
    'div',
    { className: 'analysis-meter-list' },
    groups.map((group) =>
      meterRow({
        label: group.groupName,
        value: group.estimatedSets,
        max: maxValue,
        valueLabel: `约 ${group.estimatedSets} 组`,
        sublabel: `直接 ${group.directSets} / 间接折算后约 ${group.indirectSets * 0.5}`
      })
    )
  );

  const patterns = el(
    'div',
    { className: 'analysis-patterns' },
    facts.patterns.map((pattern) => badge({ label: `${pattern.label} · ${pattern.workingSetCount} 组`, tone: 'neutral' }))
  );

  const legend = el(
    'p',
    { className: 'analysis-note' },
    '口径：直接组按 1、间接组按 0.5 折算为估计组数，保留 1 位小数。这是「动作通常涉及的肌群映射」估计，不是肌电测量或精确剂量，也不能说明个体激活程度。'
  );

  const children = [
    sectionTitle({ title: '③ 训练分布估计', hint: '估计的直接 / 间接训练暴露，非精确剂量' }),
    card({
      children: [
        el('h3', { className: 'analysis-card-title', textContent: '按肌群组（估计）' }),
        groups.length ? groupMeters : el('p', { className: 'muted', textContent: '本次没有可估计的肌群分布。' }),
        legend
      ]
    })
  ];

  if (facts.patterns.length) {
    children.push(
      card({
        children: [el('h3', { className: 'analysis-card-title', textContent: '按动作模式（正式组数）' }), patterns]
      })
    );
  }

  if (!facts.history.sufficient) {
    children.push(
      callout({
        tone: 'info',
        title: '当前样本不足以判断近期训练分布',
        children: [
          el('p', {
            textContent: `近 ${facts.history.windowDays} 天窗口内只有 ${facts.history.sessionCount} 次已完成训练（含本次），少于 3 次。`
          }),
          el('p', {
            className: 'analysis-note',
            textContent: '下方只陈述本次训练事实；请先积累至少 3 次记录，再参考近期分布与频率。'
          })
        ]
      })
    );
  } else {
    const historyRows = el(
      'div',
      { className: 'analysis-history-list' },
      facts.history.groupFrequency.slice(0, 6).map((group) =>
        el(
          'div',
          { className: 'analysis-history-list__row' },
          el('span', { textContent: group.groupName }),
          el('span', {
            className: 'num muted',
            textContent: `约 ${group.estimatedSets} 组 · 训练 ${group.daysTrained} 天 / ${group.sessionCount} 次`
          })
        )
      )
    );
    children.push(
      card({
        children: [
          el('h3', { className: 'analysis-card-title', textContent: '近 14 天估计分布（含本次）' }),
          el('p', { className: 'analysis-note', textContent: facts.history.note }),
          historyRows,
          facts.history.window7
            ? el('p', {
                className: 'analysis-note',
                textContent: `近 7 天窗口内有 ${facts.history.window7.sessionCount} 次已完成训练（同一口径，含本次）。`
              })
            : null
        ]
      })
    );
  }

  return el('section', { className: 'analysis-section', 'aria-label': '训练分布估计' }, children);
}

// ---------- 分区 ④ 建议 ----------

function suggestionBlock(label, text) {
  return el(
    'div',
    { className: 'analysis-suggestion__block' },
    el('span', { className: 'analysis-block-label', textContent: label }),
    el('p', { textContent: text })
  );
}

function suggestionCard(suggestion) {
  const title = suggestion.title || SUGGESTION_TITLES[suggestion.id] || '训练建议';
  const path = rulePathLabel(suggestion.ruleIds);
  return card({
    className: 'analysis-suggestion',
    children: [
      el(
        'div',
        { className: 'analysis-suggestion__head' },
        badge({ label: `建议 ${suggestion.priority}`, tone: suggestion.priority === 1 ? 'accent' : 'neutral' }),
        el('h3', { className: 'analysis-suggestion__title', textContent: title })
      ),
      suggestionBlock('观察', suggestion.observation),
      suggestionBlock('原因', suggestion.why),
      suggestionBlock('低风险调整', suggestion.adjustment),
      suggestionBlock('适用前提', suggestion.premise),
      el('div', { className: 'analysis-suggestion__rules' }, badge({ label: `依据：${path || '—'}`, tone: 'info' })),
      rulesDisclosure(suggestion.ruleIds, `展开查看依据（${suggestion.ruleIds.length} 条规则、来源与审核日期）`)
    ]
  });
}

function suggestionsSection(facts, narrative) {
  const suggestions = narrative.suggestions || [];
  const children = [
    sectionTitle({
      title: '④ 训练建议',
      hint: facts.flags.safetyIntercepted
        ? '安全拦截期间不提供训练建议'
        : '最多 3 条，按优先级；每条只调整一个变量，可撤回'
    })
  ];

  if (facts.flags.safetyIntercepted) {
    children.push(
      callout({
        tone: 'danger',
        title: '安全拦截中：不提供训练建议',
        children: [
          el('p', { textContent: narrative.safety.message }),
          el('p', {
            className: 'analysis-note',
            textContent: '常规训练优化建议已在安全拦截状态下停用；请先处理身体信号并寻求专业医疗意见。'
          })
        ]
      })
    );
  } else if (!suggestions.length) {
    children.push(emptyState({ title: '暂无训练建议', text: '当前数据不足以给出可解释的建议。可以先记录更多训练信息。' }));
  } else {
    if (facts.flags.discomfort) {
      children.push(
        callout({
          tone: 'warning',
          title: '本次记录了轻中度不适',
          children: [
            el('p', { textContent: narrative.safety.message }),
            el('p', { className: 'analysis-note', textContent: '以下建议不包含加量内容，优先观察与恢复。' })
          ]
        })
      );
    }
    children.push(el('div', { className: 'stack' }, suggestions.map((suggestion) => suggestionCard(suggestion))));
    children.push(
      el('p', {
        className: 'analysis-note',
        textContent: '建议依据为一般健康成人参考，不是个体处方；同一时间只调整一个变量，若恢复变差或出现不适请回退并咨询专业人士。'
      })
    );
  }
  return el('section', { className: 'analysis-section', 'aria-label': '训练建议' }, children);
}

// ---------- 分区 ⑤ 拉伸与放松 ----------

function resolveStretches(facts, session) {
  const fromFacts = (facts.stretchIds || [])
    .map((id) => STRETCH_BY_ID[id])
    .filter(Boolean);
  if (fromFacts.length) return fromFacts;

  if (stretchesFor) {
    try {
      const selected = stretchesFor(facts);
      if (Array.isArray(selected) && selected.length) return selected.slice(0, 3);
    } catch (err) {
      console.warn('[analysis] stretchesFor(facts) 失败', err);
    }
    const firstExercise = Array.isArray(session.exercises) ? session.exercises[0] : null;
    if (firstExercise) {
      try {
        const selected = stretchesFor(firstExercise);
        if (Array.isArray(selected) && selected.length) return selected.slice(0, 3);
      } catch (err) {
        console.warn('[analysis] stretchesFor(exercise) 失败', err);
      }
    }
  }
  return [];
}

function stretchCard(stretch) {
  const targetNames = (Array.isArray(stretch.targetMuscles) ? stretch.targetMuscles : [])
    .map((muscleId) => (MUSCLES_BY_ID[muscleId] && MUSCLES_BY_ID[muscleId].name) || MUSCLES.find((m) => m.id === muscleId)?.name || muscleId)
    .filter(Boolean);
  const duration = stretch.durationSec
    ? `${stretch.durationSec.min ?? 20}–${stretch.durationSec.max ?? 30} 秒`
    : '20–30 秒';
  const intensityLabel = stretch.intensity === 'moderate' ? '中等强度（仍以无痛为限）' : '轻度';
  return card({
    className: 'analysis-stretch',
    children: [
      el(
        'div',
        { className: 'analysis-stretch__head' },
        el('h3', { className: 'analysis-stretch__title', textContent: stretch.name || stretch.id }),
        el(
          'div',
          { className: 'analysis-stretch__badges' },
          badge({ label: intensityLabel, tone: 'success' }),
          badge({ label: `保持 ${duration}`, tone: 'neutral' })
        )
      ),
      targetNames.length
        ? el('p', { className: 'analysis-label', textContent: `目标肌群：${targetNames.join('、')}` })
        : null,
      el('p', { textContent: stretch.description || '' }),
      disclosure({
        summary: '动作要领与停止条件',
        children: el(
          'div',
          { className: 'stack stack--sm' },
          Array.isArray(stretch.cues) && stretch.cues.length
            ? el('ul', { className: 'analysis-list' }, stretch.cues.map((cue) => el('li', { textContent: cue })))
            : null,
          Array.isArray(stretch.stopConditions) && stretch.stopConditions.length
            ? el(
                'div',
                { className: 'analysis-stop' },
                el('p', { className: 'analysis-block-label', textContent: '出现以下情况立即停止' }),
                el('ul', { className: 'analysis-list' }, stretch.stopConditions.map((item) => el('li', { textContent: item })))
              )
            : el('p', { className: 'analysis-note', textContent: '出现疼痛、麻木、眩晕等立即停止。' }),
          Array.isArray(stretch.safetyNotes) && stretch.safetyNotes.length
            ? el('ul', { className: 'analysis-list analysis-list--muted' }, stretch.safetyNotes.map((item) => el('li', { textContent: item })))
            : null,
          stretch.source
            ? buildSourceNode(stretch.source)
            : el('p', { className: 'analysis-source analysis-source--pending', textContent: '该拉伸条目的来源待补充审核。' })
        )
      })
    ]
  });
}

function stretchesSection(facts, session) {
  const list = resolveStretches(facts, session);
  return el(
    'section',
    { className: 'analysis-section', 'aria-label': '拉伸与放松' },
    sectionTitle({ title: '⑤ 拉伸与放松', hint: '训练后温和活动；低强度、无痛范围' }),
    list.length
      ? el('div', { className: 'stack' }, list.slice(0, 3).map((stretch) => stretchCard(stretch)))
      : el('p', { className: 'analysis-note', textContent: '本次未匹配到拉伸条目。训练后可进行 5 分钟低强度活动与温和拉伸，以无痛范围为限。' }),
    el('p', {
      className: 'analysis-note',
      textContent: '拉伸仅用于放松与活动度维持，不能治疗伤病；出现疼痛、麻木、眩晕等异常感觉请立即停止。'
    })
  );
}

// ---------- 分区 ⑥ 证据与局限 ----------

function evidenceSection(facts, narrative, snapshot) {
  const snapshotMeta = (snapshot && snapshot.meta) || {};
  const engineLabel =
    snapshotMeta.engine === 'model'
      ? `AI 模型${snapshotMeta.providerLabel ? ` · ${snapshotMeta.providerLabel}` : ''}${snapshotMeta.model ? ` · ${snapshotMeta.model}` : ''}`
      : '规则模板（未使用模型）';
  const meta = {
    engineVersion: facts.engineVersion,
    rulesVersion: facts.rulesVersion,
    dataVersion: facts.dataVersion,
    promptVersion: snapshotMeta.promptVersion || PROMPT_VERSION,
    engine: snapshotMeta.engine || NARRATIVE_ENGINE,
    generatedAt: facts.generatedAt
  };
  const metaGrid = el(
    'dl',
    { className: 'analysis-meta-grid' },
    metaRow('分析引擎版本', meta.engineVersion),
    metaRow('规则库版本', meta.rulesVersion),
    metaRow('数据版本', meta.dataVersion),
    metaRow('表达引擎', engineLabel),
    metaRow(meta.engine === 'model' ? 'AI 提示词版本' : '文案模板版本', meta.promptVersion),
    meta.engine === 'model' ? metaRow('引用知识片段', `${(snapshotMeta.knowledgeSources || []).length} 条`) : null,
    metaRow('生成时间', formatDateTime(meta.generatedAt))
  );

  const aiFallback = snapshotMeta.aiFallbackReason;
  let aiNotice = null;
  if (aiFallback && aiFallback !== 'not-configured') {
    aiNotice = callout({
      tone: 'warning',
      title: 'AI 增强未采用，已回退规则模板',
      children: [
        el('p', { textContent: AI_FALLBACK_LABELS[aiFallback] || aiFallback }),
        snapshotMeta.aiError ? el('p', { className: 'analysis-note', textContent: `原因：${snapshotMeta.aiError}` }) : null,
        el('p', { className: 'analysis-note', textContent: '可在「我的 → AI 分析」中检查提供方、Base URL、模型名与 API Key，或稍后重新生成。' })
      ]
    });
  } else if (aiFallback === 'not-configured') {
    aiNotice = el('p', {
      className: 'analysis-note',
      textContent: '当前未接入 AI 模型，分析使用确定性规则模板。可在「我的 → AI 分析（自带密钥）」中配置自己的模型提供方。'
    });
  }

  const stale =
    facts.engineVersion !== RULES_ENGINE_VERSION ||
    facts.rulesVersion !== RULES_VERSION ||
    facts.dataVersion !== DATA_VERSION;
  const staleNotice = stale
    ? callout({
        tone: 'warning',
        title: '分析快照可能来自旧版本',
        children: [el('p', { textContent: '本快照由不同版本的规则生成。建议使用右上角「重新生成」以匹配当前规则与数据版本。' })]
      })
    : null;

  const limitations = el(
    'ul',
    { className: 'analysis-list analysis-limitations' },
    (narrative.limitations || []).map((item) => el('li', { textContent: item.text }))
  );

  const usedRules = rulesDisclosure(facts.ruleIds, `查看本次引用的规则依据（${(facts.ruleIds || []).length} 条）`);

  return el(
    'section',
    { className: 'analysis-section', 'aria-label': '证据与局限' },
    sectionTitle({ title: '⑥ 证据与局限', hint: '版本、来源、审核日期、适用人群与不确定性' }),
    aiNotice,
    staleNotice,
    card({
      children: [
        el('h3', { className: 'analysis-card-title', textContent: '版本与生成信息' }),
        metaGrid,
        el('p', {
          className: 'analysis-note',
          textContent: `本分析为确定性规则输出（${RULES_ENGINE_VERSION}），所有数字来自本次分析事实快照，可由相同输入复现。`
        })
      ]
    }),
    card({
      children: [
        el('h3', { className: 'analysis-card-title', textContent: '数据不足与不确定性' }),
        limitations,
        el('p', {
          className: 'analysis-note',
          textContent:
        '肌群分布为「动作通常涉及的肌群」的估计训练暴露；吨位只统计同时记录重量与次数的组，未完整记录时只展示已记录组的估算值。本页不推断个体生理属性，也不预测伤病风险。'
        })
      ]
    }),
    usedRules
      ? card({
          children: [
            el('h3', { className: 'analysis-card-title', textContent: '本次引用的规则' }),
            el(
              'div',
              { className: 'analysis-rule-ids' },
              (facts.ruleIds || []).map((id) => {
                const rule = getRule(id);
                return badge({ label: rule ? `${id} · ${rule.title}` : id, tone: 'neutral' });
              })
            ),
            usedRules
          ]
        })
      : null,
    callout({ tone: 'info', title: '免责声明', children: [el('p', { textContent: SAFETY_DISCLAIMER })] }),
    el('p', {
      className: 'analysis-note',
      textContent: '原型阶段：训练记录与分析快照仅保存在本机浏览器（localStorage），不会上传到云端。'
    })
  );
}

// ---------- 页面外壳 ----------

function buildHeaderActions(ctx, session, hasSnapshot) {
  if (!hasSnapshot) return [];
  return [
    button({
      label: '重新生成',
      variant: 'ghost',
      size: 'sm',
      iconName: 'sync',
      onClick: () => {
        confirmDialog({
          title: '重新生成分析？',
          message:
            '将用当前记录重新计算规则事实；如果已在「我的」中配置 AI 模型，会尝试用该模型重写建议（可能产生模型费用），不通过校验时自动回退规则模板。',
          confirmLabel: '重新生成',
          onConfirm: async () => {
            const host = rootRef;
            const notice = toast('正在重新生成分析…', { duration: 5000 });
            try {
              const result = await createSnapshot(session);
              const usedModel = result && result.meta && result.meta.engine === 'model';
              toast(usedModel ? '已用你配置的模型重新生成分析' : '分析已重新生成（规则模板）', {
                tone: 'success'
              });
              const next = analysisPage(ctx);
              if (host && host.parentNode) host.replaceWith(next);
            } catch (err) {
              console.error('[analysis] 重新生成失败', err);
              toast('分析生成失败，请稍后重试', { tone: 'danger' });
            }
          }
        });
      }
    })
  ];
}

let rootRef = null;

function renderSnapshot(ctx, session, snapshot) {
  const facts = snapshot.facts;
  const narrative = snapshot.narrative;
  const root = screen({
    title: '训练分析',
    subtitle: `${formatDate(session.startedAt)} · ${session.exercises.length} 个动作 · ${sessionWorkingSetCount(session)} 个正式组`,
    back: `/history/${session.id}`,
    actions: buildHeaderActions(ctx, session, true),
    children: [
      safetySection(narrative),
      factsSection(facts, session, narrative),
      suggestionsSection(facts, narrative),
      disclosure({
        summary: '更多细节：训练分布、拉伸与证据局限',
        iconName: 'chart',
        children: el(
          'div',
          { className: 'stack' },
          distributionSection(facts),
          stretchesSection(facts, session),
          evidenceSection(facts, narrative, snapshot)
        )
      })
    ]
  });
  rootRef = root;
  return root;
}

function renderEmptyAnalysis(ctx, session) {
  const root = screen({
    title: '训练分析',
    subtitle: `${formatDate(session.startedAt)} · ${session.exercises.length} 个动作`,
    back: `/history/${session.id}`,
    children: [
      card({
        children: [
          el('h3', { className: 'analysis-card-title', textContent: '这次训练还没有分析快照' }),
          el('p', {
            className: 'analysis-note',
            textContent: '分析会在本机根据规则确定性生成并保存，不会上传到云端。生成后可查看安全提示、记录事实、训练分布、建议、拉伸与证据来源。'
          }),
          button({
            label: '生成分析',
            variant: 'primary',
            full: true,
            iconName: 'sparkles',
            onClick: async () => {
              const host = rootRef;
              const notice = toast('正在生成分析…', { duration: 5000 });
              try {
                const result = await createSnapshot(session);
                const usedModel = result && result.meta && result.meta.engine === 'model';
                toast(usedModel ? '已用你配置的模型生成分析' : '分析已生成（规则模板）', { tone: 'success' });
                const next = analysisPage(ctx);
                if (host && host.parentNode) host.replaceWith(next);
              } catch (err) {
                console.error('[analysis] 生成失败', err);
                toast('分析生成失败，请稍后重试', { tone: 'danger' });
              }
            }
          })
        ]
      }),
      emptyState({
        title: '分析内容由规则生成',
        text: '只统计已完成的正式组；数据不足时不会给出长期结论。',
        iconName: 'chart',
        action: button({
          label: '查看训练详情',
          variant: 'secondary',
          onClick: () => navigate(`/history/${session.id}`)
        })
      })
    ]
  });
  rootRef = root;
  return root;
}

function renderMissingSession() {
  return screen({
    title: '训练分析',
    back: '/history',
    children: [
      emptyState({
        title: '找不到这次训练',
        text: '训练记录可能已被删除，或链接不完整。',
        action: button({ label: '返回历史', href: '/history', variant: 'secondary' })
      })
    ]
  });
}

function renderDraftSession(session) {
  return screen({
    title: '训练分析',
    subtitle: '训练尚未完成',
    back: `/log/${session.id}`,
    children: [
      emptyState({
        title: '完成训练后才能查看分析',
        text: '先回到训练记录页完成本次训练；完成后会自动生成分析。',
        action: button({
          label: '继续训练',
          variant: 'primary',
          onClick: () => navigate('/log/active')
        })
      })
    ]
  });
}

/**
 * 分析页入口（契约：返回 HTMLElement，不直接操作 document.body）。
 * @param {{ params: object, query: URLSearchParams, path: string }} ctx
 */
export function analysisPage(ctx) {
  const sessionId = ctx && ctx.params ? ctx.params.sessionId : '';
  const session = sessionId ? store.getSession(sessionId) : null;
  if (!session) return renderMissingSession();
  if (session.status === 'draft') return renderDraftSession(session);
  const snapshot = store.getAnalysis(sessionId);
  if (!snapshot || !snapshot.facts || !snapshot.narrative) {
    return renderEmptyAnalysis(ctx, session);
  }
  return renderSnapshot(ctx, session, snapshot);
}

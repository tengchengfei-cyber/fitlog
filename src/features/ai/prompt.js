/**
 * 分析表达层提示词：把规则层 facts、可用规则与检索到的知识片段交给模型，
 * 要求它只用这些材料做中文改写，并输出严格 JSON。
 */
import { AI_PROMPT_VERSION } from './config.js';

export { AI_PROMPT_VERSION };

export const AI_ANALYSIS_SYSTEM_PROMPT = `你是健身训练记录应用里的「分析表达层」，负责把确定性规则层生成的 facts 改写成自然、可执行的中文说明。

硬性约束（必须全部遵守）：
1. 只能使用用户消息中「facts」提供的数字与事实；不得新增训练事实、不得计算新数字、不得改写数字。
2. 只能给出最多 3 条训练建议，每条建议只能使用用户消息「allowedRules」中列出的 ruleIds；不得编造规则、来源、文献或引用。
3. 不得做医疗诊断、分诊、康复处方或营养处方；不得推断慢肌纤维比例、激素水平、代谢状态、受伤风险或疾病风险；不得使用「精准激活百分比」「保证增肌/减脂」「修复疼痛」「治愈」等表述。
4. 当 facts.flags.safetyIntercepted 或 facts.flags.discomfort 为 true 时，不得出现加量、加重、提高强度、继续训练等建议；应以记录、恢复、停止训练或咨询专业人士为主。
5. 数据不足（dataCompleteness.level 不是 complete，或 history.sufficient 为 false）时，建议应优先「补全记录 / 积累样本 / 保持当前节奏」，不得做长期不足结论。
6. 语气保守、可撤回；每条建议只调整一个变量，必须写清适用前提。
7. 动作名称只能使用「exerciseNames」中出现的名称，或知识片段中明确列出的动作；不得编造动作。

只输出一个 JSON 对象（不要 markdown 代码围栏、不要解释），结构如下：
{
  "summary": "2-4 句中文摘要，只能使用给定事实",
  "suggestions": [
    {
      "title": "不超过 12 字的中文小标题",
      "observation": "观察到什么（引用给定事实）",
      "why": "为什么提出（引用 allowedRules 中的依据，可含规则 ID）",
      "adjustment": "低风险、可撤回的调整（一次只改一个变量）",
      "premise": "适用前提与停止条件",
      "ruleIds": ["E-XXX-001"]
    }
  ],
  "limitations": [{ "code": "short_code", "text": "本次分析的数据局限或不确定性" }]
}

要求：suggestions 最多 3 条（可为 0 条）；每条 ruleIds 必须非空且来自 allowedRules；limitations 最多 4 条。所有数字必须与 facts 或 allowedRules 中出现的数字一致。`;

function compactFacts(facts) {
  const session = facts.session || {};
  const completeness = facts.dataCompleteness || {};
  const history = facts.history || {};
  const flags = facts.flags || {};
  return {
    goal: session.goalLabel,
    exerciseCount: session.exerciseCount,
    workingSetCount: session.workingSetCount,
    totalVolumeKg: session.totalVolumeKg,
    volumeSetCount: session.volumeSetCount,
    durationMin: session.durationMin,
    dataCompleteness: {
      level: completeness.level,
      weightRepsCoverage: completeness.weightRepsCoverage,
      weightRepsCount: completeness.weightRepsCount,
      rpeCoverage: completeness.rpeCoverage,
      missingFields: completeness.missingFields,
      note: completeness.note
    },
    muscleExposure: (facts.muscleExposure || []).map((row) => ({
      name: row.name,
      directSets: row.directSets,
      indirectSets: row.indirectSets,
      estimatedSets: row.estimatedSets
    })),
    groupExposure: (facts.groupExposure || []).map((row) => ({
      groupName: row.groupName,
      directSets: row.directSets,
      indirectSets: row.indirectSets,
      estimatedSets: row.estimatedSets,
      share: row.share
    })),
    patterns: (facts.patterns || []).map((row) => ({ label: row.label, workingSetCount: row.workingSetCount })),
    history: {
      windowDays: history.windowDays,
      sessionCount: history.sessionCount,
      sufficient: history.sufficient,
      note: history.note
    },
    flags: {
      safetyIntercepted: flags.safetyIntercepted,
      discomfort: flags.discomfort,
      redFlags: flags.redFlags
    },
    limitations: (facts.limitations || []).map((item) => item.text)
  };
}

function compactTemplate(templateNarrative) {
  if (!templateNarrative) return null;
  return {
    summary: templateNarrative.summary,
    suggestions: (templateNarrative.suggestions || []).map((item) => ({
      observation: item.observation,
      why: item.why,
      adjustment: item.adjustment,
      premise: item.premise,
      ruleIds: item.ruleIds
    })),
    limitations: (templateNarrative.limitations || []).map((item) => item.text)
  };
}

/**
 * 组装发送给模型的 messages。
 * @param {{facts: object, templateNarrative: object, allowedRules: object[], knowledgeText: string, session: object}} input
 */
export function buildAnalysisMessages({ facts, templateNarrative, allowedRules, knowledgeText, session }) {
  const payload = {
    task: '把规则层 facts 改写为中文训练复盘，并给出不超过 3 条有依据的低风险建议。',
    facts: compactFacts(facts),
    templateNarrative: compactTemplate(templateNarrative),
    allowedRules: (allowedRules || []).map((rule) => ({
      id: rule.id,
      title: rule.title,
      statement: rule.statement,
      applicability: rule.applicability,
      limitations: rule.limitations
    })),
    exerciseNames: ((session && session.exercises) || []).map((item) => item.exerciseName).filter(Boolean),
    knowledge: knowledgeText || '（无额外知识片段）',
    outputLanguage: 'zh-CN'
  };
  return [
    { role: 'system', content: AI_ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(payload, null, 2) }
  ];
}

/** 宽松解析模型返回的 JSON（容忍 markdown 围栏与前后说明文字）。 */
export function parseJsonResponse(text) {
  if (typeof text !== 'string') return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** 收集允许出现的数字（facts、模板、可用规则、知识片段），用于数值一致性校验。 */
export function collectAllowedNumbers({ facts, templateNarrative, allowedRules, knowledgeText }) {
  const source = [
    JSON.stringify(facts || {}),
    JSON.stringify(compactTemplate(templateNarrative) || {}),
    JSON.stringify((allowedRules || []).map((rule) => ({ id: rule.id, statement: rule.statement, limitations: rule.limitations }))),
    String(knowledgeText || '')
  ].join('\n');
  const allowed = new Set();
  for (const match of source.match(/\d+(?:\.\d+)?/g) || []) {
    const value = Number(match);
    if (Number.isFinite(value)) allowed.add(value);
  }
  return allowed;
}

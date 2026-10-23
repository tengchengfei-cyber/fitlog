/**
 * 模型输出校验：模型可以改写成更自然的表达，但必须——
 * - 只使用规则层事实与允许的规则 ID；
 * - 数字不超出给定材料；
 * - 不出现医疗化、保证性、个体生理推断或禁用表述；
 * - 不适/安全拦截场景不给出加量建议；
 * - 数据不完整时不把估算吨位说成总吨位。
 *
 * 校验失败一律回退到确定性模板文案，并记录原因。
 */

const BANNED_PHRASES = [
  '慢肌纤维',
  '精准激活',
  '激活百分比',
  '保证增肌',
  '保证减脂',
  '修复疼痛',
  '治愈',
  '激素水平',
  '代谢状态',
  '受伤风险',
  '疾病风险',
  '个体处方',
  '医学诊断'
];

/** 允许出现的免责/边界表述（先剥离再做禁用词扫描）。 */
const EXEMPT_PATTERNS = [
  '不构成医疗诊断',
  '不构成诊断',
  '不做诊断',
  '不能诊断',
  '非诊断',
  '不构成处方',
  '不是处方',
  '非医疗',
  '不能替代'
];

const LOAD_TERMS = /加量|加重|增加重量|提高强度|增加组数|增加频率|冲重量|继续训练|突破极限/;

function stripExemptions(text) {
  let result = String(text || '');
  for (const pattern of EXEMPT_PATTERNS) result = result.split(pattern).join('');
  return result;
}

function cleanString(value, maxLength = 300) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function collectNumbers(text) {
  const numbers = [];
  for (const match of String(text || '').match(/\d+(?:\.\d+)?/g) || []) {
    const value = Number(match);
    if (Number.isFinite(value)) numbers.push(value);
  }
  return numbers;
}

/**
 * @param {object} parsed 模型返回并解析后的 JSON
 * @param {{facts: object, templateNarrative: object, allowedRules: object[], knowledgeText?: string}} context
 * @returns {{ok: boolean, errors: string[], narrative: object|null}}
 */
export function validateModelNarrative(parsed, { facts, templateNarrative, allowedRules, knowledgeText = '' }) {
  const errors = [];
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['模型输出不是 JSON 对象'], narrative: null };
  }
  const allowedRuleIds = new Set((allowedRules || []).map((rule) => rule.id).filter(Boolean));

  const summary = cleanString(parsed.summary, 800);
  if (summary.length < 15) errors.push('summary 过短或缺失');
  if (summary.length > 800) errors.push('summary 过长');

  const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : null;
  if (!rawSuggestions) errors.push('suggestions 必须是数组');
  if (rawSuggestions && rawSuggestions.length > 3) errors.push('建议超过 3 条');

  const suggestions = [];
  for (const [index, raw] of (rawSuggestions || []).slice(0, 3).entries()) {
    if (!raw || typeof raw !== 'object') {
      errors.push(`第 ${index + 1} 条建议格式不正确`);
      continue;
    }
    const fields = {
      observation: cleanString(raw.observation, 300),
      why: cleanString(raw.why, 300),
      adjustment: cleanString(raw.adjustment, 300),
      premise: cleanString(raw.premise, 300)
    };
    for (const [key, value] of Object.entries(fields)) {
      if (!value) errors.push(`第 ${index + 1} 条建议缺少「${key}」`);
    }
    const ruleIds = Array.isArray(raw.ruleIds) ? raw.ruleIds.map((id) => String(id)) : [];
    if (ruleIds.length === 0) errors.push(`第 ${index + 1} 条建议缺少 ruleIds`);
    if (ruleIds.length > 4) errors.push(`第 ${index + 1} 条建议引用规则过多`);
    for (const ruleId of ruleIds) {
      if (!allowedRuleIds.has(ruleId)) errors.push(`第 ${index + 1} 条建议引用了未提供的规则：${ruleId}`);
    }
    if (facts.flags && facts.flags.discomfort && LOAD_TERMS.test(fields.observation + fields.why + fields.adjustment + fields.premise)) {
      errors.push(`第 ${index + 1} 条建议在不适状态下包含加量表述`);
    }
    suggestions.push({
      id: `ai-suggestion-${index + 1}`,
      title: cleanString(raw.title, 20) || '训练建议',
      priority: index + 1,
      ...fields,
      ruleIds
    });
  }

  const rawLimitations = Array.isArray(parsed.limitations) ? parsed.limitations.slice(0, 4) : [];
  const modelLimitations = rawLimitations
    .map((item, index) => {
      if (typeof item === 'string') return { code: `ai-limitation-${index + 1}`, text: cleanString(item, 300) };
      if (item && typeof item === 'object') {
        return { code: cleanString(item.code, 40) || `ai-limitation-${index + 1}`, text: cleanString(item.text, 300) };
      }
      return null;
    })
    .filter((item) => item && item.text);

  const composed = {
    summary,
    suggestions: (rawSuggestions && rawSuggestions.length > 0 ? suggestions : templateNarrative.suggestions || []).slice(0, 3),
    limitations: [...(templateNarrative.limitations || []), ...modelLimitations].slice(0, 6)
  };

  // 数值一致性：模型输出中出现的数字必须能在 facts / 模板 / 允许规则 / 知识片段中找到。
  const allowedNumbers = new Set();
  const allowedSource = [
    JSON.stringify(facts || {}),
    JSON.stringify(templateNarrative || {}),
    JSON.stringify((allowedRules || []).map((rule) => ({ id: rule.id, statement: rule.statement, limitations: rule.limitations }))),
    knowledgeText
  ].join('\n');
  for (const value of collectNumbers(allowedSource)) allowedNumbers.add(value);
  const modelText = [summary, ...suggestions.map((item) => Object.values(item).join(' ')), ...modelLimitations.map((item) => item.text)].join(' ');
  for (const value of collectNumbers(modelText)) {
    if (!allowedNumbers.has(value)) errors.push(`出现材料中未提供的数字：${value}`);
  }

  // 吨位口径：未完整覆盖时不得出现「总吨位」。
  const coverage = facts.dataCompleteness && facts.dataCompleteness.weightRepsCoverage;
  if (coverage !== 1 && modelText.includes('总吨位')) errors.push('记录未完整覆盖时不得使用「总吨位」表述');

  // 禁用表述扫描（先剥离免责/边界说明）。
  const scanned = stripExemptions(modelText);
  for (const phrase of BANNED_PHRASES) {
    if (scanned.includes(phrase)) errors.push(`出现禁用表述：${phrase}`);
  }

  if (errors.length) return { ok: false, errors, narrative: null };

  return {
    ok: true,
    errors: [],
    narrative: {
      ...templateNarrative,
      summary,
      suggestions: composed.suggestions,
      limitations: composed.limitations
    }
  };
}

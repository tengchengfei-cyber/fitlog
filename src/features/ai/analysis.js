/**
 * AI 增强分析编排：规则层 → 检索知识 → 调用用户配置模型 → 严格校验 → 成功则采用，失败回退模板。
 *
 * 安全顺序：
 * 1. 先由确定性规则层生成 facts；
 * 2. 安全拦截（疼痛/危险信号）时完全不调用模型；
 * 3. 模型只接收结构化 facts、允许的规则与匹配到的知识片段，不发送原始备注；
 * 4. 模型输出必须通过引用/数字/禁用表述/加量约束校验，否则回退确定性模板。
 */
import { AI_PROMPT_VERSION, isAiConfigured } from './config.js';
import { chatCompletion } from './client.js';
import { buildAnalysisMessages, parseJsonResponse } from './prompt.js';
import { validateModelNarrative } from './validate.js';
import { buildKnowledgeQuery, retrieveKnowledge } from './knowledge.js';
import { getRule } from '../../data/evidence.js';

export const AI_FALLBACK_LABELS = {
  'not-configured': '未配置模型（使用规则模板）',
  'safety-intercepted': '安全拦截：不调用模型',
  'no-rules': '没有可用证据规则（已回退规则模板）',
  'request-failed': '模型请求失败（已回退规则模板）',
  'parse-failed': '模型返回内容无法解析（已回退规则模板）',
  'validation-failed': '模型输出未通过规则校验（已回退规则模板）'
};

function collectAllowedRules(facts, templateNarrative) {
  const ids = new Set();
  for (const id of (facts && facts.ruleIds) || []) ids.add(id);
  for (const suggestion of (templateNarrative && templateNarrative.suggestions) || []) {
    for (const id of suggestion.ruleIds || []) ids.add(id);
  }
  ids.add('E-SAFE-001');
  ids.add('E-DISCLAIM-001');
  return [...ids].map((id) => getRule(id)).filter(Boolean);
}

function fallbackResult(templateNarrative, reason, error) {
  return {
    ok: true,
    engine: 'template',
    narrative: templateNarrative,
    model: null,
    providerLabel: null,
    promptVersion: null,
    knowledgeSources: [],
    fallbackReason: reason,
    error: error || null
  };
}

/**
 * @param {{
 *   facts: object,
 *   session: object,
 *   templateNarrative: object,
 *   config?: object,
 *   fetchImpl?: Function,
 *   timeoutMs?: number,
 *   knowledgeMaxChars?: number
 * }} input
 * @returns {Promise<{ok:boolean, engine:'template'|'model', narrative:object, model:string|null, providerLabel:string|null, promptVersion:string|null, knowledgeSources:object[], fallbackReason:string|null, error:string|null}>}
 */
export async function generateAiEnhancedNarrative({
  facts,
  session,
  templateNarrative,
  config,
  fetchImpl,
  timeoutMs = 45000,
  knowledgeMaxChars = 4500
}) {
  if (!templateNarrative || typeof templateNarrative !== 'object') {
    throw new Error('缺少规则化模板文案，无法进行 AI 增强');
  }
  if (!isAiConfigured(config)) return fallbackResult(templateNarrative, 'not-configured');
  if (facts && facts.flags && facts.flags.safetyIntercepted) {
    return fallbackResult(templateNarrative, 'safety-intercepted');
  }

  const allowedRules = collectAllowedRules(facts, templateNarrative);
  if (!allowedRules.length) return fallbackResult(templateNarrative, 'no-rules');

  const knowledge = retrieveKnowledge(buildKnowledgeQuery(facts, session), { maxChars: knowledgeMaxChars });
  const messages = buildAnalysisMessages({
    facts,
    templateNarrative,
    allowedRules,
    knowledgeText: knowledge.text,
    session
  });

  let rawText = '';
  try {
    const response = await chatCompletion({ config, messages, fetchImpl, timeoutMs });
    rawText = response.text;
  } catch (err) {
    return fallbackResult(templateNarrative, 'request-failed', String(err && err.message ? err.message : err));
  }

  const parsed = parseJsonResponse(rawText);
  if (!parsed) return fallbackResult(templateNarrative, 'parse-failed', '模型返回内容无法解析为 JSON');

  const validation = validateModelNarrative(parsed, {
    facts,
    templateNarrative,
    allowedRules,
    knowledgeText: knowledge.text
  });
  if (!validation.ok) {
    return fallbackResult(templateNarrative, 'validation-failed', validation.errors.slice(0, 4).join('；'));
  }

  return {
    ok: true,
    engine: 'model',
    narrative: validation.narrative,
    model: config.model,
    providerLabel: config.providerLabel || (config.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI 兼容'),
    promptVersion: AI_PROMPT_VERSION,
    knowledgeSources: knowledge.sources,
    fallbackReason: null,
    error: null
  };
}

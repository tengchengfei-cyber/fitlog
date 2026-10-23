/**
 * AI 模型接入配置（BYOK：用户自带提供方与密钥）。
 *
 * 安全边界：
 * - 配置只保存在本机浏览器 localStorage（独立键，不进入训练数据导出）；
 * - API Key 只用于浏览器直接向用户填写的提供方发起请求，不经过本项目服务器（本项目没有服务器）；
 * - 清除本机数据 / 清除配置会一并删除 Key；
 * - 调用前先由确定性规则层生成 facts；模型只负责表达，不改变事实与安全结论。
 */
export const AI_CONFIG_KEY = 'fitlog.aiConfig.v1';
export const AI_PROMPT_VERSION = 'ai-prompt-2026.10.22';

export const AI_PROTOCOLS = [
  {
    value: 'openai',
    label: 'OpenAI 兼容',
    hint: '适用于 OpenAI、DeepSeek、Moonshot、通义兼容模式、Ollama、LM Studio 等提供 /chat/completions 的服务',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini'
  },
  {
    value: 'anthropic',
    label: 'Anthropic Messages',
    hint: 'Anthropic 官方 /v1/messages 接口（Claude 系列）',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-5'
  }
];

export function protocolMeta(value) {
  return AI_PROTOCOLS.find((item) => item.value === value) || AI_PROTOCOLS[0];
}

export function defaultAiConfig() {
  return {
    protocol: 'openai',
    providerLabel: '我的模型',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: '',
    temperature: 0.3,
    updatedAt: null
  };
}

function storageAvailable() {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

export function loadAiConfig() {
  const base = defaultAiConfig();
  if (!storageAvailable()) return base;
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return base;
    return {
      ...base,
      protocol: parsed.protocol === 'anthropic' ? 'anthropic' : 'openai',
      providerLabel: typeof parsed.providerLabel === 'string' ? parsed.providerLabel : base.providerLabel,
      baseUrl: typeof parsed.baseUrl === 'string' && parsed.baseUrl ? parsed.baseUrl : base.baseUrl,
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : base.model,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      temperature: Number.isFinite(Number(parsed.temperature)) ? Number(parsed.temperature) : base.temperature,
      updatedAt: parsed.updatedAt || null
    };
  } catch (err) {
    console.warn('[ai] 读取模型配置失败', err);
    return base;
  }
}

export function saveAiConfig(patch) {
  const next = { ...loadAiConfig(), ...(patch || {}), updatedAt: new Date().toISOString() };
  if (next.protocol !== 'anthropic') next.protocol = 'openai';
  next.temperature = Math.max(0, Math.min(2, Number(next.temperature) || 0));
  if (storageAvailable()) {
    try {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('[ai] 保存模型配置失败', err);
    }
  }
  return next;
}

export function clearAiConfig() {
  if (storageAvailable()) {
    try {
      localStorage.removeItem(AI_CONFIG_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function isAiConfigured(config = loadAiConfig()) {
  return Boolean(
    config &&
      typeof config.apiKey === 'string' &&
      config.apiKey.trim().length >= 8 &&
      typeof config.baseUrl === 'string' &&
      /^https?:\/\//i.test(config.baseUrl.trim()) &&
      typeof config.model === 'string' &&
      config.model.trim().length > 0
  );
}

/** 掩码展示：sk-****abcd；长度不足时全部打码。 */
export function maskApiKey(key) {
  const value = String(key || '');
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 3)}••••••${value.slice(-4)}`;
}

export function aiConfigSummary(config = loadAiConfig()) {
  if (!isAiConfigured(config)) return '未配置模型';
  return `${config.providerLabel || protocolMeta(config.protocol).label} · ${config.model}`;
}

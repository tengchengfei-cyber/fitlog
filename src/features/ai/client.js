/**
 * 极简 AI 提供方客户端（浏览器直连，零依赖）。
 * 支持两种协议：OpenAI 兼容 /chat/completions、Anthropic /v1/messages。
 *
 * 注意：浏览器直连要求提供方允许 CORS（本机原型没有后端代理）。
 */
import { protocolMeta } from './config.js';

function trimBase(baseUrl) {
  return String(baseUrl || '').trim().replace(/\/+$/, '');
}

function joinUrl(baseUrl, path) {
  const base = trimBase(baseUrl);
  if (!base) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

function splitMessages(messages) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const rest = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  return { system, rest };
}

/** 构造请求（便于单元测试与排错）。 */
export function buildRequest(config, messages, { maxTokens = 1400 } = {}) {
  const protocol = config.protocol === 'anthropic' ? 'anthropic' : 'openai';
  const temperature = Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : 0.3;
  if (protocol === 'anthropic') {
    const { system, rest } = splitMessages(messages);
    return {
      url: joinUrl(config.baseUrl || protocolMeta('anthropic').defaultBaseUrl, '/v1/messages'),
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: {
        model: config.model,
        max_tokens: maxTokens,
        temperature,
        ...(system ? { system } : {}),
        messages: rest.length ? rest : [{ role: 'user', content: '请回复 OK' }]
      }
    };
  }
  return {
    url: joinUrl(config.baseUrl || protocolMeta('openai').defaultBaseUrl, '/chat/completions'),
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`
    },
    body: {
      model: config.model,
      messages,
      temperature,
      stream: false
    }
  };
}

/** 从提供方响应里提取文本（兼容常见结构）。 */
export function extractText(protocol, data) {
  if (!data || typeof data !== 'object') return '';
  if (protocol === 'anthropic') {
    const content = data.content;
    if (Array.isArray(content)) {
      return content
        .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join('\n');
    }
    return typeof data.completion === 'string' ? data.completion : '';
  }
  const choice = Array.isArray(data.choices) ? data.choices[0] : null;
  if (choice && choice.message && typeof choice.message.content === 'string') return choice.message.content;
  if (choice && typeof choice.text === 'string') return choice.text;
  if (typeof data.output_text === 'string') return data.output_text;
  return '';
}

/**
 * 发起一次对话请求。
 * @param {{config: object, messages: object[], fetchImpl?: Function, timeoutMs?: number, maxTokens?: number}} options
 * @returns {Promise<{text: string, raw: object, latencyMs: number}>}
 */
export async function chatCompletion({ config, messages, fetchImpl, timeoutMs = 45000, maxTokens = 1400 }) {
  const fetchFn = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) throw new Error('当前环境不支持 fetch，无法调用模型');
  if (!config || !config.apiKey || !config.model) throw new Error('模型未配置完整（需要 Base URL、模型名与 API Key）');

  const request = buildRequest(config, messages, { maxTokens });
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const startedAt = Date.now();
  let response;
  try {
    response = await fetchFn(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller ? controller.signal : undefined
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    const message = err && err.name === 'AbortError' ? `请求超时（>${Math.round(timeoutMs / 1000)} 秒）` : String(err && err.message ? err.message : err);
    const hint = /Failed to fetch|NetworkError|CORS/i.test(message)
      ? '（可能是网络不可达或提供方不允许浏览器跨域请求/CORS）'
      : '';
    throw new Error(`模型请求失败：${message}${hint}`);
  }
  if (timer) clearTimeout(timer);

  const latencyMs = Date.now() - startedAt;
  let data = null;
  const textBody = await response.text();
  try {
    data = textBody ? JSON.parse(textBody) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail = (data && (data.error?.message || data.message || data.error)) || textBody.slice(0, 240);
    throw new Error(`模型返回 ${response.status}：${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  if (!data) throw new Error('模型响应不是有效 JSON');
  const text = extractText(config.protocol, data);
  if (!text) throw new Error('模型响应中没有可读取的文本内容');
  return { text, raw: data, latencyMs };
}

/** 测试连接：发一条最小请求，返回可用性与延迟。 */
export async function testAiConnection(config, { fetchImpl, timeoutMs = 20000 } = {}) {
  const startedAt = Date.now();
  try {
    const result = await chatCompletion({
      config: { ...config, temperature: 0 },
      messages: [
        { role: 'system', content: '你是连接测试助手，只回复两个字符：OK' },
        { role: 'user', content: '请回复 OK' }
      ],
      fetchImpl,
      timeoutMs,
      maxTokens: 16
    });
    return { ok: true, latencyMs: result.latencyMs || Date.now() - startedAt, text: result.text.trim().slice(0, 80) };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - startedAt, error: String(err && err.message ? err.message : err) };
  }
}

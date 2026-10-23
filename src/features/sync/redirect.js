/**
 * 处理 Supabase 邮件链接回调（magic link / 确认邮箱）。
 *
 * Supabase 会把 token 或错误放在 URL hash 中返回，例如：
 *   #access_token=...&refresh_token=...&expires_in=3600&type=magiclink
 *   #error=access_denied&error_code=otp_expired&error_description=...
 *
 * 本模块在路由初始化前拦截：
 * - 成功：用 access_token 获取用户信息，保存登录会话，清理 URL 到 #/settings；
 * - 失败/过期：给出可读提示（存入 sessionStorage，由设置页展示），清理 URL；
 * - 未配置云同步：提示先填 Supabase URL/anon key。
 */
import { isCloudConfigured, loadCloudConfig, saveAuthSession } from './config.js';

export const AUTH_NOTICE_KEY = 'fitlog.authNotice.v1';

export function setAuthNotice(text, tone = 'info') {
  try {
    sessionStorage.setItem(AUTH_NOTICE_KEY, JSON.stringify({ text, tone }));
  } catch {
    /* ignore */
  }
}

/** 读取并清除一次性登录提示（供设置页展示）。 */
export function consumeAuthNotice() {
  try {
    const raw = sessionStorage.getItem(AUTH_NOTICE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(AUTH_NOTICE_KEY);
    const parsed = JSON.parse(raw);
    return parsed && parsed.text ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 解析 URL hash 中的登录回调参数（纯函数，便于测试）。
 *
 * 兼容两种形式：
 *   标准： #access_token=...&refresh_token=...
 *   历史/双井号： #/settings#access_token=...&refresh_token=...
 *   （旧版 redirect_to 带了 #/settings，Supabase 会把 token 追加成第二个 #，
 *     此时整段会被浏览器当作一个 fragment："/settings#access_token=..."）
 *
 * @param {string} hash 形如 "#access_token=..." 或 "#/settings#access_token=..." 或 "#error=..."
 */
export function parseAuthHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const tokenPos = raw.search(/(?:access_token|error)=/);
  if (tokenPos === -1) return { kind: 'none' };
  // token 参数可能位于第二个 # 或 ? 之后：从最近的 # 或 ? 之后开始解析参数串。
  const separator = Math.max(raw.lastIndexOf('#', tokenPos), raw.lastIndexOf('?', tokenPos));
  const paramString = raw.slice(separator + 1);
  const params = new URLSearchParams(paramString);
  const error = params.get('error');
  if (error) {
    return {
      kind: 'error',
      error,
      errorCode: params.get('error_code') || '',
      description: params.get('error_description') || ''
    };
  }
  const accessToken = params.get('access_token');
  if (!accessToken) return { kind: 'none' };
  return {
    kind: 'tokens',
    accessToken,
    refreshToken: params.get('refresh_token') || null,
    expiresIn: Number(params.get('expires_in')) || 3600,
    tokenType: params.get('token_type') || '',
    type: params.get('type') || ''
  };
}

async function fetchUser(config, accessToken, { fetchImpl } = {}) {
  const fetchFn = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) throw new Error('当前环境不支持 fetch');
  const response = await fetchFn(`${String(config.supabaseUrl).replace(/\/+$/, '')}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json'
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`校验登录链接失败（${response.status}）：${text.slice(0, 200)}`);
  }
  const user = await response.json();
  if (!user || !user.id) throw new Error('登录链接返回的用户信息不完整');
  return user;
}

function cleanUrlToSettings() {
  try {
    const target = `${window.location.pathname}${window.location.search}#/settings`;
    window.history.replaceState(null, '', target);
  } catch {
    /* ignore */
  }
}

/**
 * 在应用启动、路由初始化之前调用。
 * @returns {Promise<{handled: boolean, kind?: string, error?: string}>}
 */
export async function handleAuthRedirect({ fetchImpl } = {}) {
  if (typeof window === 'undefined' || !window.location) return { handled: false };
  const parsed = parseAuthHash(window.location.hash || '');
  if (parsed.kind === 'none') return { handled: false };

  if (parsed.kind === 'error') {
    const detail = parsed.description
      ? decodeURIComponent(parsed.description.replace(/\+/g, ' '))
      : parsed.errorCode || parsed.error;
    setAuthNotice(
      `登录链接无效或已过期（${detail}）。请在设置页重新发送登录邮件；若你收到的是「Confirm your email address」确认邮件，建议在 Supabase 设置中关闭 Confirm email，或使用邮件里的 6 位验证码登录。`,
      'danger'
    );
    cleanUrlToSettings();
    return { handled: true, kind: 'error', error: detail };
  }

  const config = loadCloudConfig();
  if (!isCloudConfigured(config)) {
    setAuthNotice(
      '收到了登录链接，但本机还没有填写 Supabase 项目地址与 anon key。请先在「账户与云同步」中完成配置，再重新发送登录邮件。',
      'warning'
    );
    cleanUrlToSettings();
    return { handled: true, kind: 'not-configured' };
  }

  try {
    const user = await fetchUser(config, parsed.accessToken, { fetchImpl });
    saveAuthSession({
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: Date.now() + parsed.expiresIn * 1000,
      user: { id: String(user.id), email: String(user.email || '') }
    });
    setAuthNotice('邮箱登录成功，正在同步云端记录。', 'success');
    cleanUrlToSettings();
    return { handled: true, kind: 'success' };
  } catch (err) {
    const message = String(err && err.message ? err.message : err);
    setAuthNotice(`登录链接校验失败：${message}。请在设置页重新发送登录邮件。`, 'danger');
    cleanUrlToSettings();
    return { handled: true, kind: 'error', error: message };
  }
}

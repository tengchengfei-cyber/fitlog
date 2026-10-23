/**
 * Supabase 登录与 REST 请求封装。
 *
 * 支持两种登录方式：
 *   - 邮箱 OTP / 魔法链接：POST /auth/v1/otp、/auth/v1/verify（无需密码）；
 *   - GitHub OAuth：GET /auth/v1/authorize?provider=github（不需要邮箱/SMTP）。
 * 其它端点：POST /auth/v1/token 刷新、POST /auth/v1/logout 退出。
 * 数据：/rest/v1/user_data（RLS 只允许本人读写）
 */
import {
  loadAuthSession,
  saveAuthSession,
  clearAuthSession,
  isCloudConfigured,
  loadCloudConfig
} from './config.js';

function joinUrl(base, path) {
  return `${String(base || '').replace(/\/+$/, '')}${path}`;
}

function authHeaders(config, extra = {}) {
  return {
    apikey: config.anonKey,
    authorization: `Bearer ${config.anonKey}`,
    'content-type': 'application/json',
    ...extra
  };
}

async function requestJson(url, options, fetchImpl, timeoutMs = 20000) {
  const fetchFn = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) throw new Error('当前环境不支持 fetch');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let response;
  try {
    response = await fetchFn(url, {
      ...options,
      signal: controller ? controller.signal : undefined
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    const text = String(err && err.message ? err.message : err);
    throw new Error(
      /AbortError/i.test(text)
        ? '请求超时，请检查网络'
        : `网络请求失败：${text}${/Failed to fetch|NetworkError/i.test(text) ? '（可能是网络或跨域问题）' : ''}`
    );
  }
  if (timer) clearTimeout(timer);
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail =
      (data && (data.msg || data.message || data.error_description || data.error)) || raw.slice(0, 200) || response.status;
    throw new Error(`请求失败（${response.status}）：${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  return data;
}

function normalizeSession(data, emailFallback = '') {
  if (!data || !data.access_token) throw new Error('登录响应缺少 access_token');
  const user = data.user || {};
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    user: {
      id: String(user.id || ''),
      email: String(user.email || emailFallback || '')
    }
  };
}

/** 构建 Supabase OAuth 授权 URL（当前支持 GitHub 登录，无需邮箱/验证码）。 */
export function buildOAuthUrl(config, { provider = 'github', redirectTo } = {}) {
  const params = new URLSearchParams({ provider });
  if (redirectTo) params.set('redirect_to', redirectTo);
  return `${String(config.supabaseUrl).replace(/\/+$/, '')}/auth/v1/authorize?${params.toString()}`;
}

/** 跳转到 GitHub 授权；返回 URL 便于测试。 */
export function startOAuthLogin(provider = 'github') {
  const config = loadCloudConfig();
  if (!isCloudConfigured(config)) {
    return { ok: false, error: '请先填写并保存 Supabase 项目地址与 anon key' };
  }
  const redirectTo =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;
  const url = buildOAuthUrl(config, { provider, redirectTo });
  if (typeof window !== 'undefined' && window.location) {
    window.location.assign(url);
  }
  return { ok: true, url };
}

/** GitHub 登录入口别名（设置页使用）。 */
export const startGithubLogin = startOAuthLogin;

/** 发送邮箱验证码（OTP）/魔法登录链接。 */
export async function sendEmailOtp(config, email, { fetchImpl } = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: '请输入有效邮箱' };
  }
  // 邮件里的链接应回到当前应用；需在 Supabase Auth → URL Configuration 中加入该地址。
  // 注意：这里不要带 hash（如 #/settings），否则 Supabase 会把 token 追加成第二个 #，
  // 浏览器会得到 "/settings#access_token=..." 这样的 fragment（旧版 404 的原因）。
  const redirectTo =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;
  const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '';
  try {
    await requestJson(
      joinUrl(config.supabaseUrl, `/auth/v1/otp${query}`),
      {
        method: 'POST',
        headers: authHeaders(config),
        body: JSON.stringify({ email: normalizedEmail, create_user: true, gotrue_meta_security: {} })
      },
      fetchImpl
    );
    return { ok: true, email: normalizedEmail, redirectTo };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/** 校验验证码并保存登录会话。 */
export async function verifyEmailOtp(config, email, token, { fetchImpl } = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const code = String(token || '').replace(/\s+/g, '');
  if (!/^\d{6,8}$/.test(code)) return { ok: false, error: '请输入邮箱收到的 6–8 位验证码' };
  try {
    const data = await requestJson(
      joinUrl(config.supabaseUrl, '/auth/v1/verify'),
      {
        method: 'POST',
        headers: authHeaders(config),
        body: JSON.stringify({ type: 'email', email: normalizedEmail, token: code })
      },
      fetchImpl
    );
    const session = normalizeSession(data, normalizedEmail);
    saveAuthSession(session);
    return { ok: true, session };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/** 刷新会话；失败返回 null 并清除本地会话。 */
export async function refreshAuthSession(config, session, { fetchImpl } = {}) {
  if (!session || !session.refreshToken) return null;
  try {
    const data = await requestJson(
      joinUrl(config.supabaseUrl, '/auth/v1/token?grant_type=refresh_token'),
      {
        method: 'POST',
        headers: authHeaders(config),
        body: JSON.stringify({ refresh_token: session.refreshToken })
      },
      fetchImpl
    );
    const next = normalizeSession(data, session.user && session.user.email);
    saveAuthSession(next);
    return next;
  } catch (err) {
    console.warn('[sync] 刷新登录会话失败，需要重新登录', err);
    clearAuthSession();
    return null;
  }
}

/** 获取可用会话（必要时刷新）。 */
export async function ensureSession(config, { fetchImpl } = {}) {
  let session = loadAuthSession();
  if (!session) return null;
  if (session.expiresAt && Date.now() > Number(session.expiresAt) - 60000) {
    session = await refreshAuthSession(config, session, { fetchImpl });
  }
  return session;
}

/** 退出登录（服务端登出失败也清除本地会话）。 */
export async function signOutRemote(config, session, { fetchImpl } = {}) {
  try {
    if (session && session.accessToken) {
      await requestJson(
        joinUrl(config.supabaseUrl, '/auth/v1/logout'),
        {
          method: 'POST',
          headers: {
            apikey: config.anonKey,
            authorization: `Bearer ${session.accessToken}`,
            'content-type': 'application/json'
          }
        },
        fetchImpl
      );
    }
  } catch (err) {
    console.warn('[sync] 服务端登出失败（本地会话仍会清除）', err);
  } finally {
    clearAuthSession();
  }
  return true;
}

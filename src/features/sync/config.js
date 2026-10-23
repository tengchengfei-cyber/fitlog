/**
 * 云同步配置（可选，Supabase 免费版）。
 *
 * 默认完全本地；只有用户在设置页填入自己的 Supabase Project URL 与 anon key 后才会联网。
 * anon key 是 Supabase 设计为可公开的客户端密钥，数据安全依赖数据库 RLS（见 docs/CLOUD_SYNC_SETUP.md）。
 * 邮箱登录使用 Supabase Auth 的 Email OTP（一次性验证码），无需密码。
 */
export const CLOUD_CONFIG_KEY = 'fitlog.cloudConfig.v1';
export const AUTH_SESSION_KEY = 'fitlog.authSession.v1';
export const SYNC_META_KEY = 'fitlog.syncMeta.v1';

import { APP_CONFIG } from '../../config/appConfig.js';

function storageAvailable() {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

export function defaultCloudConfig() {
  return { provider: 'supabase', supabaseUrl: '', anonKey: '' };
}

/** 部署者构建时注入的默认 Supabase 配置（对普通用户隐藏）。 */
export function getBuiltInCloudConfig() {
  const cloud = (APP_CONFIG && APP_CONFIG.cloud) || {};
  return {
    provider: 'supabase',
    supabaseUrl: normalizeSupabaseUrl(cloud.supabaseUrl),
    anonKey: String(cloud.anonKey || '').trim()
  };
}

/** 是否由应用提供方统一配置（用户不再需要填写 URL/Key）。 */
export function isManagedCloudConfig() {
  if (!isCloudConfigured(getBuiltInCloudConfig())) return false;
  if (!storageAvailable()) return true;
  return !localStorage.getItem(CLOUD_CONFIG_KEY);
}

export function loadCloudConfig() {
  const base = defaultCloudConfig();
  const builtIn = getBuiltInCloudConfig();
  const fallback = isCloudConfigured(builtIn) ? builtIn : base;
  if (!storageAvailable()) return fallback;
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const override = {
      provider: 'supabase',
      supabaseUrl: typeof parsed.supabaseUrl === 'string' ? parsed.supabaseUrl.replace(/\/+$/, '') : '',
      anonKey: typeof parsed.anonKey === 'string' ? parsed.anonKey : ''
    };
    // 开发/高级用户显式保存的配置优先；无效时回退到部署者配置。
    return isCloudConfigured(override) ? override : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeSupabaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

export function isCloudConfigured(config = loadCloudConfig()) {
  const url = normalizeSupabaseUrl(config && config.supabaseUrl);
  const allowedUrl =
    /^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(url) ||
    // 本地开发/Mock 测试专用（Supabase 协议兼容的本地服务）
    /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(url);
  return Boolean(
    config &&
      allowedUrl &&
      typeof config.anonKey === 'string' &&
      config.anonKey.trim().length > 20
  );
}

export function saveCloudConfig({ supabaseUrl, anonKey } = {}) {
  const next = {
    provider: 'supabase',
    supabaseUrl: normalizeSupabaseUrl(supabaseUrl),
    anonKey: String(anonKey || '').trim()
  };
  if (storageAvailable()) {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearCloudConfig() {
  if (!storageAvailable()) return;
  localStorage.removeItem(CLOUD_CONFIG_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(SYNC_META_KEY);
}

// ---------- 登录会话 ----------

export function loadAuthSession() {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.accessToken || !parsed.user || !parsed.user.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthSession(session) {
  if (!storageAvailable()) return;
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  if (!storageAvailable()) return;
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export function isLoggedIn() {
  const session = loadAuthSession();
  return Boolean(session && session.user && session.user.id);
}

// ---------- 同步状态 ----------

export function loadSyncMeta() {
  if (!storageAvailable()) return {};
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSyncMeta(patch) {
  if (!storageAvailable()) return;
  const next = { ...loadSyncMeta(), ...(patch || {}) };
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(next));
  return next;
}

export function clearSyncMeta() {
  if (!storageAvailable()) return;
  localStorage.removeItem(SYNC_META_KEY);
}

export function cloudHostLabel(config = loadCloudConfig()) {
  try {
    return new URL(config.supabaseUrl).host;
  } catch {
    return config.supabaseUrl || '';
  }
}

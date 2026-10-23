/**
 * 云同步数据合并（纯函数，便于测试）。
 *
 * 同步范围：训练记录、草稿、分析快照、训练偏好（目标/媒体偏好等）。
 * 不同步：AI 模型配置/API Key、知识库文件、导入动作（这些按设计只留在本机）。
 *
 * 合并策略（个人使用、无并发写冲突的常见场景）：
 * - 实体按 id 取 updatedAt（会话）或 generatedAt（分析）更新的一侧；
 * - 时间相同优先保留本地；
 * - 草稿最多保留 3 个；
 * - 设置项整体取 updatedAt 更新的一侧，字段级回退合并。
 */
export const SYNC_SCHEMA_VERSION = 1;

function timeValue(item, keys) {
  for (const key of keys) {
    const value = item && item[key];
    if (value) return String(value);
  }
  return '';
}

function mergeById(localList, remoteList, timeKeys) {
  const map = new Map();
  for (const item of localList || []) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of remoteList || []) {
    if (!item || !item.id) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    if (timeValue(item, timeKeys) > timeValue(existing, timeKeys)) map.set(item.id, item);
  }
  return [...map.values()];
}

const SESSION_TIME_KEYS = ['updatedAt', 'endedAt', 'startedAt'];
const ANALYSIS_TIME_KEYS = ['meta.generatedAt', 'facts.generatedAt'];

function analysisTime(analysis) {
  if (!analysis) return '';
  return String(
    (analysis.meta && analysis.meta.generatedAt) ||
      (analysis.facts && analysis.facts.generatedAt) ||
      ''
  );
}

function mergeSettings(localSettings, remoteSettings) {
  if (!remoteSettings) return localSettings || {};
  if (!localSettings) return remoteSettings;
  const localTime = String(localSettings.updatedAt || '');
  const remoteTime = String(remoteSettings.updatedAt || '');
  return remoteTime > localTime ? { ...localSettings, ...remoteSettings } : { ...remoteSettings, ...localSettings };
}

/**
 * @param {object} local buildSyncPayload(store.getState()) 的结果
 * @param {object} remote 云端行里的 data
 * @returns {{data: object, stats: object}}
 */
export function mergeSyncData(local, remote) {
  const localData = local || {};
  const remoteData = remote || {};
  const sessions = mergeById(localData.sessions, remoteData.sessions, SESSION_TIME_KEYS).sort((a, b) =>
    String(b.startedAt || '').localeCompare(String(a.startedAt || ''))
  );
  const drafts = mergeById(localData.drafts, remoteData.drafts, SESSION_TIME_KEYS)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, 3);

  const analyses = { ...(localData.analyses || {}) };
  let analysesAdded = 0;
  for (const [sessionId, remoteAnalysis] of Object.entries(remoteData.analyses || {})) {
    const localAnalysis = analyses[sessionId];
    if (!localAnalysis || analysisTime(remoteAnalysis) > analysisTime(localAnalysis)) {
      analyses[sessionId] = remoteAnalysis;
      analysesAdded += 1;
    }
  }

  const stats = {
    sessionsTotal: sessions.length,
    sessionsFromRemote: (remoteData.sessions || []).length,
    draftsTotal: drafts.length,
    analysesTotal: Object.keys(analyses).length,
    analysesAdded
  };

  return {
    data: {
      schemaVersion: SYNC_SCHEMA_VERSION,
      sessions,
      drafts,
      analyses,
      settings: mergeSettings(localData.settings, remoteData.settings),
      updatedAt: new Date().toISOString()
    },
    stats
  };
}

/** 从 store 状态构造同步载荷（不含密钥/知识库/导入动作）。 */
export function buildSyncPayload(state) {
  const settings = (state && state.settings) || {};
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    sessions: (state && state.sessions) || [],
    drafts: (state && state.drafts) || [],
    analyses: (state && state.analyses) || {},
    settings: {
      goal: settings.goal || null,
      mediaPreference: settings.mediaPreference || 'image',
      onboarded: Boolean(settings.onboarded),
      displayName: settings.displayName || '',
      units: settings.units || 'kg',
      updatedAt: settings.updatedAt || null
    },
    updatedAt: new Date().toISOString()
  };
}

/**
 * 把合并后的数据写回 store 的 mutator（保持本地 AI/知识等字段不变）。
 * @param {object} state store 状态（会被原地修改）
 * @param {object} data mergeSyncData().data
 */
export function applySyncDataToState(state, data) {
  if (!state || !data) return state;
  state.sessions = Array.isArray(data.sessions) ? data.sessions : state.sessions;
  state.drafts = Array.isArray(data.drafts) ? data.drafts : state.drafts;
  state.analyses = data.analyses && typeof data.analyses === 'object' ? data.analyses : state.analyses;
  if (data.settings && typeof data.settings === 'object') {
    state.settings = { ...state.settings, ...data.settings };
  }
  return state;
}

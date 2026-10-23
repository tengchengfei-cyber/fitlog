/**
 * 应用状态与持久化（原型阶段：本机 localStorage）。
 * 所有会写数据的模块都必须通过本模块的 action，不要直接改 state 或 localStorage。
 *
 * 未来接入云端同步时：保持这些 action 的签名不变，在内部替换为「本地排队 + 远端同步」。
 */
import { loadState, saveState, clearState, clearAllAppData, SCHEMA_VERSION } from './storage.js';
import { newId } from './format.js';

export const APP_VERSION = 'prototype-0.3.0';
export const SYNC_STATUS = {
  LOCAL_ONLY: 'local-only',
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed'
};

export const GOALS = [
  { value: 'hypertrophy', label: '增肌', hint: '以肌肉围度与训练量为主要目标' },
  { value: 'strength', label: '力量', hint: '以主要动作力量提升为目标' },
  { value: 'fatloss', label: '减脂 / 体能', hint: '兼顾热量消耗与体能，训练量循序渐进' },
  { value: 'general', label: '综合健康', hint: '规律活动、全身均衡与长期坚持' }
];

export const GOAL_LABELS = GOALS.reduce((acc, g) => {
  acc[g.value] = g.label;
  return acc;
}, {});

function defaultSettings() {
  return {
    goal: null,
    mediaPreference: 'image',
    onboarded: false,
    displayName: '',
    units: 'kg',
    safetyAcknowledgedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    sessions: [],
    drafts: [],
    analyses: {},
    meta: {
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      syncStatus: SYNC_STATUS.LOCAL_ONLY,
      deviceId: newId('device')
    }
  };
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return defaultState();
  const state = { ...defaultState(), ...raw };
  state.settings = { ...defaultSettings(), ...(raw.settings || {}) };
  state.sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  state.drafts = Array.isArray(raw.drafts) ? raw.drafts : [];
  state.analyses = raw.analyses && typeof raw.analyses === 'object' ? raw.analyses : {};
  state.meta = { ...defaultState().meta, ...(raw.meta || {}) };
  state.schemaVersion = SCHEMA_VERSION;
  return state;
}

let state = normalize(loadState());
const listeners = new Set();

function persist() {
  state.meta.lastUpdatedAt = new Date().toISOString();
  saveState(state);
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (err) {
      console.error('[store] 订阅者执行失败', err);
    }
  }
}

/** 通用更新入口：fn 内可直接修改 state；结束后持久化并通知订阅者。 */
export function update(fn) {
  const result = fn(state);
  persist();
  notify();
  return result;
}

// ---------- 设置 ----------

export function getSettings() {
  return state.settings;
}

export function saveSettings(patch) {
  return update((s) => {
    s.settings = { ...s.settings, ...patch, updatedAt: new Date().toISOString() };
    return s.settings;
  });
}

export function completeOnboarding(goal) {
  return saveSettings({ goal, onboarded: true, onboardingCompletedAt: new Date().toISOString() });
}

// ---------- 草稿 ----------

export function getDraft() {
  if (!state.drafts.length) return null;
  return [...state.drafts].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
}

export function getDraftById(id) {
  return state.drafts.find((d) => d.id === id) || null;
}

export function saveDraft(draft) {
  const now = new Date().toISOString();
  draft.updatedAt = now;
  return update((s) => {
    const idx = s.drafts.findIndex((d) => d.id === draft.id);
    if (idx >= 0) {
      s.drafts[idx] = draft;
    } else {
      s.drafts.unshift(draft);
    }
    s.drafts = s.drafts.slice(0, 3);
    return draft;
  });
}

export function discardDraft(id) {
  return update((s) => {
    s.drafts = s.drafts.filter((d) => d.id !== id);
  });
}

// ---------- 训练记录 ----------

export function completeSession(session) {
  const now = new Date().toISOString();
  session.status = 'completed';
  session.endedAt = session.endedAt || now;
  session.updatedAt = now;
  return update((s) => {
    s.drafts = s.drafts.filter((d) => d.id !== session.id);
    const idx = s.sessions.findIndex((x) => x.id === session.id);
    if (idx >= 0) {
      s.sessions[idx] = session;
    } else {
      s.sessions.unshift(session);
    }
    return session;
  });
}

export function updateSession(session) {
  session.updatedAt = new Date().toISOString();
  return update((s) => {
    const idx = s.sessions.findIndex((x) => x.id === session.id);
    if (idx >= 0) s.sessions[idx] = session;
    return session;
  });
}

export function getSession(id) {
  return (
    state.sessions.find((s) => s.id === id) ||
    state.drafts.find((s) => s.id === id) ||
    null
  );
}

export function listSessions() {
  return [...state.sessions].sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

export function listAllSessions() {
  return [...state.drafts, ...state.sessions].sort((a, b) =>
    String(b.startedAt).localeCompare(String(a.startedAt))
  );
}

export function deleteSession(id) {
  return update((s) => {
    s.sessions = s.sessions.filter((x) => x.id !== id);
    s.drafts = s.drafts.filter((x) => x.id !== id);
    delete s.analyses[id];
  });
}

/** 基于历史训练创建新草稿：保留动作结构，清空组记录，计划组数沿用历史已完成组数。 */
export function repeatSession(id) {
  const source = getSession(id);
  if (!source) return null;
  const now = new Date().toISOString();
  const draft = {
    id: newId('s'),
    schemaVersion: 1,
    status: 'draft',
    startedAt: now,
    endedAt: null,
    goal: state.settings.goal || source.goal || 'general',
    title: source.title ? `${source.title}（复制）` : '',
    note: '',
    postCheck: { status: 'ok', note: '' },
    exercises: (source.exercises || []).map((ex, index) => ({
      ...JSON.parse(JSON.stringify(ex)),
      id: newId('se'),
      order: index,
      note: '',
      plannedSets: ex.sets && ex.sets.length ? ex.sets.length : ex.plannedSets || null,
      sets: []
    })),
    createdAt: now,
    updatedAt: now,
    copiedFrom: source.id
  };
  return saveDraft(draft);
}

// ---------- 分析快照 ----------

export function saveAnalysis(sessionId, analysis) {
  return update((s) => {
    s.analyses[sessionId] = analysis;
    return analysis;
  });
}

export function getAnalysis(sessionId) {
  return state.analyses[sessionId] || null;
}

// ---------- 数据导出 / 删除 ----------

export function exportData() {
  return {
    app: 'fitlog-prototype',
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    note: '原型阶段导出：仅含本机数据，未包含任何云端账户信息。',
    data: JSON.parse(JSON.stringify(state))
  };
}

export function deleteAllData() {
  clearAllAppData();
  state = defaultState();
  persist();
  notify();
  return state;
}

export function getGoalLabel(goal) {
  return GOAL_LABELS[goal] || '综合健康';
}

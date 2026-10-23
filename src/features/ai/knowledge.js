/**
 * AI 知识库（本地）：把当前动作库/证据规则/安全词条/拉伸，以及用户导入的权威资料，
 * 整理成可检索片段；分析时只把「与本次训练相关」的片段作为上下文发送给用户配置的模型。
 *
 * 隐私：用户导入的文件只保存在本机 localStorage，不会上传到本项目服务器（项目没有服务器）；
 * 调用模型时会把匹配到的片段发送给用户填写的提供方，因此设置页明确提示。
 */
import { EXERCISES, equipmentLabel, patternLabel, difficultyLabel } from '../../data/exercises/index.js';
import { EVIDENCE_RULES } from '../../data/evidence.js';
import { RED_FLAGS, STOP_TRAINING_MESSAGE, DISCOMFORT_MESSAGE } from '../../data/safety.js';
import { stretches } from '../../data/stretches.js';
import { MUSCLES_BY_ID } from '../../data/muscles.js';

export const KNOWLEDGE_KEY = 'fitlog.knowledge.v1';
export const KNOWLEDGE_MAX_FILES = 8;
export const KNOWLEDGE_MAX_CHARS_PER_FILE = 120000;
export const KNOWLEDGE_MAX_TOTAL_CHARS = 300000;

function storageAvailable() {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

function muscleNames(ids) {
  return (ids || [])
    .map((id) => (MUSCLES_BY_ID[id] ? MUSCLES_BY_ID[id].name : id))
    .filter(Boolean);
}

/** 内置知识片段：动作库、证据规则、安全词条、拉伸。 */
function buildBuiltInChunks() {
  const chunks = [];

  for (const exercise of EXERCISES) {
    chunks.push({
      id: `builtin-exercise-${exercise.id}`,
      source: '内置·动作库',
      title: `${exercise.name}（${exercise.enName}）`,
      weight: 1.4,
      text:
        `${exercise.name}（${exercise.enName}）｜器械：${equipmentLabel(exercise.equipment)}｜动作模式：${patternLabel(exercise.pattern)}` +
        `｜难度：${difficultyLabel(exercise.difficulty)}｜主要肌群：${muscleNames(exercise.primaryMuscles).join('、')}` +
        `｜次要肌群：${muscleNames(exercise.secondaryMuscles).join('、')}｜执行要点：${(exercise.execution || []).slice(0, 2).join('；')}` +
        `｜安全提醒：${(exercise.safetyNotes || []).slice(0, 2).join('；')}｜内容状态：${exercise.contentStatus || 'approved'}`
    });
  }

  for (const rule of EVIDENCE_RULES) {
    chunks.push({
      id: `builtin-rule-${rule.id}`,
      source: '内置·证据规则',
      title: `${rule.id} ${rule.title}`,
      weight: 2,
      text:
        `${rule.id}｜${rule.title}｜${rule.statement}｜适用前提：${rule.applicability || '—'}` +
        `｜局限：${rule.limitations || '—'}｜审核状态：${rule.reviewStatus || '—'}｜来源：${(rule.source && rule.source.label) || '—'}`
    });
  }

  chunks.push({
    id: 'builtin-safety-stop',
    source: '内置·安全词条',
    title: '危险信号与停止训练',
    weight: 2.4,
    text: `危险信号：${RED_FLAGS.map((flag) => flag.label).join('、')}。停止训练提示：${STOP_TRAINING_MESSAGE}`
  });
  chunks.push({
    id: 'builtin-safety-discomfort',
    source: '内置·安全词条',
    title: '轻中度不适降级措辞',
    weight: 2,
    text: DISCOMFORT_MESSAGE
  });

  for (const stretch of stretches || []) {
    chunks.push({
      id: `builtin-stretch-${stretch.id}`,
      source: '内置·拉伸库',
      title: stretch.name,
      weight: 1,
      text:
        `${stretch.name}｜目标肌群：${muscleNames(stretch.targetMuscles).join('、')}｜${stretch.description}` +
        `｜提示：${(stretch.cues || []).join('；')}｜停止条件：${(stretch.stopConditions || []).join('；')}`
    });
  }

  return chunks;
}

const BUILT_IN_CHUNKS = buildBuiltInChunks();

/** 用户导入的知识文件（仅元数据 + 正文读取）。 */
export function listUserKnowledgeFiles() {
  if (!storageAvailable()) return [];
  try {
    const raw = localStorage.getItem(KNOWLEDGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((file) => file && typeof file.text === 'string' && file.text.trim())
      .map((file) => ({
        id: String(file.id || ''),
        name: String(file.name || '未命名资料'),
        sourceUrl: String(file.sourceUrl || ''),
        note: String(file.note || ''),
        addedAt: String(file.addedAt || ''),
        textLength: file.text.length
      }));
  } catch (err) {
    console.warn('[ai] 读取知识库失败', err);
    return [];
  }
}

function loadUserKnowledgeRaw() {
  if (!storageAvailable()) return [];
  try {
    const raw = localStorage.getItem(KNOWLEDGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((file) => file && typeof file.text === 'string') : [];
  } catch {
    return [];
  }
}

function persistUserKnowledge(list) {
  if (!storageAvailable()) return false;
  try {
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.warn('[ai] 保存知识库失败（可能超出浏览器配额）', err);
    return false;
  }
}

function userFileChunks() {
  return loadUserKnowledgeRaw().map((file) => ({
    id: `user-${file.id}`,
    source: `用户资料·${file.name}`,
    title: file.name,
    weight: 3,
    text: file.text.slice(0, 24000)
  }));
}

/**
 * 新增/更新一条用户知识文件。
 * @param {{name: string, text: string, sourceUrl?: string, note?: string}} input
 * @returns {{ok: boolean, error?: string, file?: object}}
 */
export function saveUserKnowledgeFile({ name, text, sourceUrl = '', note = '' } = {}) {
  const fileName = String(name || '').trim().slice(0, 80);
  const content = String(text || '');
  if (!fileName) return { ok: false, error: '缺少文件名' };
  if (content.trim().length < 20) return { ok: false, error: '文件内容过短（至少 20 字）' };
  if (content.length > KNOWLEDGE_MAX_CHARS_PER_FILE) {
    return { ok: false, error: `单个文件不能超过 ${Math.round(KNOWLEDGE_MAX_CHARS_PER_FILE / 1000)}k 字符` };
  }
  const list = loadUserKnowledgeRaw();
  if (list.length >= KNOWLEDGE_MAX_FILES) {
    return { ok: false, error: `最多保存 ${KNOWLEDGE_MAX_FILES} 份资料，请先删除旧文件` };
  }
  const total = list.reduce((sum, file) => sum + file.text.length, 0) + content.length;
  if (total > KNOWLEDGE_MAX_TOTAL_CHARS) {
    return { ok: false, error: '知识库总容量超出上限，请删除部分文件或拆分内容' };
  }
  const file = {
    id: `kb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: fileName,
    text: content,
    sourceUrl: String(sourceUrl || '').trim().slice(0, 300),
    note: String(note || '').trim().slice(0, 300),
    addedAt: new Date().toISOString()
  };
  if (!persistUserKnowledge([...list, file])) return { ok: false, error: '保存失败（浏览器存储空间不足）' };
  return {
    ok: true,
    file: {
      id: file.id,
      name: file.name,
      sourceUrl: file.sourceUrl,
      note: file.note,
      addedAt: file.addedAt,
      textLength: file.text.length
    }
  };
}

export function deleteUserKnowledgeFile(id) {
  const next = loadUserKnowledgeRaw().filter((file) => file.id !== id);
  return persistUserKnowledge(next);
}

/** 导出用：包含正文的用户知识文件（仅在本机 JSON 导出时使用）。 */
export function exportUserKnowledgeFiles() {
  return loadUserKnowledgeRaw().map((file) => ({
    id: file.id,
    name: file.name,
    text: file.text,
    sourceUrl: file.sourceUrl || '',
    note: file.note || '',
    addedAt: file.addedAt || ''
  }));
}

export function clearUserKnowledge() {
  if (!storageAvailable()) return true;
  try {
    localStorage.removeItem(KNOWLEDGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function knowledgeStats() {
  const files = listUserKnowledgeFiles();
  return {
    builtIn: {
      exercises: EXERCISES.length,
      evidenceRules: EVIDENCE_RULES.length,
      redFlags: RED_FLAGS.length,
      stretches: (stretches || []).length
    },
    userFiles: files,
    userFilesCount: files.length,
    userChars: files.reduce((sum, file) => sum + file.textLength, 0)
  };
}

// ---------- 检索 ----------

/** 中英文混合分词：中文用相邻二字组合，英文/数字按词。 */
export function tokenize(text) {
  const tokens = new Set();
  const source = String(text || '').toLowerCase();
  for (const word of source.match(/[a-z0-9]{2,}/g) || []) tokens.add(word);
  for (const run of source.match(/[\u4e00-\u9fa5]{2,}/g) || []) {
    for (let i = 0; i < run.length - 1; i += 1) tokens.add(run.slice(i, i + 2));
  }
  return [...tokens];
}

/** 从 facts + 会话动作名构造检索查询。 */
export function buildKnowledgeQuery(facts, session) {
  const parts = [];
  if (facts && facts.session) {
    parts.push(facts.session.goalLabel || '');
    if (facts.session.workingSetCount != null) parts.push(`${facts.session.workingSetCount} 组`);
  }
  for (const group of (facts && facts.groupExposure) || []) parts.push(group.groupName || '');
  for (const muscle of (facts && facts.muscleExposure) || []) parts.push(muscle.name || '');
  for (const pattern of (facts && facts.patterns) || []) parts.push(pattern.label || '');
  for (const flag of (facts && facts.flags && facts.flags.redFlags) || []) parts.push(flag);
  for (const limitation of (facts && facts.limitations) || []) parts.push(limitation.text || '');
  for (const exercise of (session && session.exercises) || []) parts.push(exercise.exerciseName || '');
  return parts.join(' ');
}

/**
 * 检索与本次分析最相关的知识片段（确定性）。
 * @param {string} queryText
 * @param {{maxChars?: number, maxChunks?: number}} options
 * @returns {{text: string, sources: {source: string, title: string}[], chunkCount: number}}
 */
export function retrieveKnowledge(queryText, { maxChars = 4500, maxChunks = 10 } = {}) {
  const queryTokens = tokenize(queryText);
  const chunks = [...BUILT_IN_CHUNKS, ...userFileChunks()];
  const scored = chunks.map((chunk) => {
    const haystack = `${chunk.title}\n${chunk.text}`.toLowerCase();
    let hits = 0;
    for (const token of queryTokens) {
      if (haystack.includes(token)) hits += 1;
    }
    const score = hits === 0 ? 0 : hits * chunk.weight;
    return { ...chunk, score };
  });
  const relevant = scored
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id))
    .slice(0, maxChunks);

  const selected = [];
  const sources = [];
  let usedChars = 0;
  for (const chunk of relevant) {
    const block = `【${chunk.source}｜${chunk.title}】\n${chunk.text}`;
    if (usedChars + block.length > maxChars && selected.length > 0) continue;
    selected.push(block);
    usedChars += block.length;
    if (!sources.some((source) => source.source === chunk.source && source.title === chunk.title)) {
      sources.push({ source: chunk.source, title: chunk.title });
    }
    if (usedChars >= maxChars) break;
  }
  return { text: selected.join('\n\n'), sources, chunkCount: selected.length };
}

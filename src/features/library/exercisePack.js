/**
 * 动作扩展包（JSON）校验与归一化：让用户可以导入更多权威动作资料，弥补内置动作库不全。
 *
 * 原则：
 * - 导入动作必须有来源（source.label，URL 可空但需说明）与内容版本；
 * - 一律标记 pending-review，不冒充官方审核内容；
 * - 只补充缺失字段的默认值，不编造教学要领；必填教学字段缺失则拒绝该条。
 */
import {
  EQUIPMENT,
  MOVEMENT_PATTERNS,
  DIFFICULTY_LABELS,
  EXERCISES
} from '../../data/exercises/index.js';
import { MUSCLE_IDS } from '../../data/muscles.js';
import { IMPORTED_EXERCISES_MAX } from '../../data/importedExercises.js';

export const EXERCISE_PACK_SCHEMA_VERSION = 1;
export const EXERCISE_PACK_CONTENT_VERSION = 'imported-2026.10.22';

const BANNED_PHRASES = ['精准激活', '激活百分比', '保证增肌', '保证减脂', '修复疼痛', '慢肌纤维', '治愈'];

const STRING = (value) => typeof value === 'string' && value.trim().length > 0;
const ARRAY = (value) => Array.isArray(value);

function stringArray(value, max = 8) {
  if (!ARRAY(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, max);
}

function defaultMedia(name, execution) {
  const description = `${name} 的文字要领：${(execution || []).slice(0, 2).join('；')}`;
  return [
    {
      id: `media_${name}_text`,
      type: 'text',
      title: `${name} · 文字要领`,
      description,
      url: null,
      alt: '',
      status: 'available',
      license: 'project-original-placeholder',
      source: { label: '用户导入内容（待审核）', url: null, publisher: '用户导入', publishedAt: null, accessedAt: new Date().toISOString().slice(0, 10) },
      reviewNote: '用户导入动作，仅含文字要领；正式媒体待补充与审核'
    },
    {
      id: `media_${name}_image`,
      type: 'image',
      title: `${name} · 占位示意图`,
      description: '占位示意图，非真实示范；待补充授权媒体',
      url: null,
      alt: `${name} 占位示意图`,
      status: 'pending-review',
      license: 'project-original-placeholder',
      source: { label: '用户导入内容（待审核）', url: null, publisher: '用户导入', publishedAt: null, accessedAt: new Date().toISOString().slice(0, 10) },
      reviewNote: '用户导入动作，媒体待审核'
    }
  ];
}

function normalizeOne(raw, index, { existingIds, packIds }) {
  const errors = [];
  const id = String((raw && raw.id) || '').trim();
  const name = String((raw && raw.name) || '').trim();
  const label = `第 ${index + 1} 条${name ? `（${name}）` : ''}`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errors.push(`${label} id 必须是 kebab-case 英文小写`);
  if (existingIds.has(id)) errors.push(`${label} id 与内置动作重复：${id}`);
  if (packIds.has(id)) errors.push(`${label} id 在扩展包内重复：${id}`);
  if (id) packIds.add(id);
  if (!STRING(name)) errors.push(`${label} 缺少中文名 name`);
  if (!STRING(raw && raw.enName)) errors.push(`${label} 缺少英文名 enName`);
  if (!/^[a-z]+$/.test(String((raw && raw.pinyinFull) || ''))) errors.push(`${label} pinyinFull 必须是连写小写拼音`);
  if (!/^[a-z]+$/.test(String((raw && raw.pinyinInitials) || ''))) errors.push(`${label} pinyinInitials 必须是拼音首字母`);
  if (!raw || !Object.hasOwn(EQUIPMENT, raw.equipment)) errors.push(`${label} equipment 不在器械枚举中`);
  if (!raw || !Object.hasOwn(MOVEMENT_PATTERNS, raw.pattern)) errors.push(`${label} pattern 不在动作模式枚举中`);
  if (!raw || !Object.hasOwn(DIFFICULTY_LABELS, raw.difficulty)) errors.push(`${label} difficulty 不在难度枚举中`);

  const primaryMuscles = stringArray(raw && raw.primaryMuscles, 3);
  const secondaryMuscles = stringArray(raw && raw.secondaryMuscles, 4);
  if (primaryMuscles.length < 1) errors.push(`${label} primaryMuscles 至少 1 个`);
  for (const muscleId of [...primaryMuscles, ...secondaryMuscles]) {
    if (!MUSCLE_IDS.has(muscleId)) errors.push(`${label} 肌群 id 非法：${muscleId}`);
  }
  const overlap = primaryMuscles.filter((muscleId) => secondaryMuscles.includes(muscleId));
  if (overlap.length) errors.push(`${label} 主/次肌群不得重复：${overlap.join(',')}`);

  const setup = stringArray(raw && raw.setup, 3);
  const execution = stringArray(raw && raw.execution, 6);
  const safetyNotes = stringArray(raw && raw.safetyNotes, 4);
  if (setup.length < 1) errors.push(`${label} setup 至少 1 条起始姿势`);
  if (execution.length < 2) errors.push(`${label} execution 至少 2 条执行步骤`);
  if (safetyNotes.length < 1) errors.push(`${label} safetyNotes 至少 1 条安全提醒`);

  const source = raw && raw.source && typeof raw.source === 'object' ? raw.source : null;
  if (!source || !STRING(source.label)) errors.push(`${label} 缺少来源说明 source.label`);
  const sourceUrl = source && typeof source.url === 'string' ? source.url.trim() : '';
  if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) errors.push(`${label} 来源 URL 必须是 https 或留空`);

  const scanText = JSON.stringify(raw || {});
  for (const phrase of BANNED_PHRASES) {
    if (scanText.includes(phrase)) errors.push(`${label} 包含禁用表述：${phrase}`);
  }

  if (errors.length) return { errors, exercise: null };

  const now = new Date().toISOString();
  return {
    errors: [],
    exercise: {
      id,
      name,
      enName: String(raw.enName).trim(),
      aliasesZh: stringArray(raw.aliasesZh, 8),
      aliasesEn: stringArray(raw.aliasesEn, 8).map((item) => item.toLowerCase()),
      pinyinFull: String(raw.pinyinFull).trim().toLowerCase(),
      pinyinInitials: String(raw.pinyinInitials).trim().toLowerCase(),
      typoAliases: stringArray(raw.typoAliases, 8),
      equipment: raw.equipment,
      pattern: raw.pattern,
      difficulty: raw.difficulty,
      primaryMuscles,
      secondaryMuscles,
      unilateral: Boolean(raw.unilateral),
      setup,
      execution,
      breathing: stringArray(raw.breathing, 3).length
        ? stringArray(raw.breathing, 3)
        : ['保持自然呼吸，动作过程中不要憋气。'],
      commonMistakes: stringArray(raw.commonMistakes, 4).length
        ? stringArray(raw.commonMistakes, 4)
        : ['动作幅度或节奏失控时先降低强度。'],
      safetyNotes,
      alternatives: stringArray(raw.alternatives, 4),
      notSuitable: stringArray(raw.notSuitable, 3).length
        ? stringArray(raw.notSuitable, 3)
        : ['如有疼痛、麻木、眩晕等不适，请停止并咨询专业人士。'],
      media: defaultMedia(name, execution),
      source: {
        label: String(source.label).trim(),
        url: sourceUrl || null,
        publisher: String(source.publisher || '用户导入').trim(),
        publishedAt: source.publishedAt || null,
        accessedAt: source.accessedAt || now.slice(0, 10)
      },
      contentStatus: 'pending-review',
      contentVersion: String(raw.contentVersion || EXERCISE_PACK_CONTENT_VERSION),
      updatedAt: String(raw.updatedAt || now.slice(0, 10)),
      tags: stringArray(raw.tags, 6),
      origin: 'imported',
      importedAt: now
    }
  };
}

/**
 * 解析并校验动作扩展包。
 * @param {string} text JSON 文本
 * @param {{existingExercises?: object[]}} options
 * @returns {{ok: boolean, errors: string[], exercises: object[], summary: object}}
 */
export function parseExercisePack(text, { existingExercises = EXERCISES } = {}) {
  let data;
  try {
    data = JSON.parse(String(text || ''));
  } catch (err) {
    return { ok: false, errors: [`JSON 解析失败：${String(err && err.message ? err.message : err)}`], exercises: [], summary: {} };
  }
  if (Array.isArray(data)) data = { schemaVersion: EXERCISE_PACK_SCHEMA_VERSION, exercises: data };
  if (!data || typeof data !== 'object' || !Array.isArray(data.exercises)) {
    return { ok: false, errors: ['扩展包格式应为 { schemaVersion, exercises: [...] } 或动作数组'], exercises: [], summary: {} };
  }
  if (data.schemaVersion && Number(data.schemaVersion) !== EXERCISE_PACK_SCHEMA_VERSION) {
    return { ok: false, errors: [`不支持的扩展包版本：${data.schemaVersion}`], exercises: [], summary: {} };
  }
  if (data.exercises.length === 0) return { ok: false, errors: ['扩展包为空'], exercises: [], summary: {} };
  if (data.exercises.length > IMPORTED_EXERCISES_MAX) {
    return { ok: false, errors: [`单个扩展包最多 ${IMPORTED_EXERCISES_MAX} 个动作`], exercises: [], summary: {} };
  }

  const existingIds = new Set((existingExercises || []).map((exercise) => exercise.id));
  const packIds = new Set();
  const errors = [];
  const exercises = [];
  data.exercises.forEach((raw, index) => {
    const result = normalizeOne(raw, index, { existingIds, packIds });
    if (result.errors.length) errors.push(...result.errors);
    if (result.exercise) exercises.push(result.exercise);
  });

  return {
    ok: errors.length === 0,
    errors,
    exercises,
    summary: { requested: data.exercises.length, accepted: exercises.length }
  };
}

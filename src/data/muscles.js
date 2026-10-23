/**
 * 肌群分类（阶段 0 产出）：动作 → 肌群为「通常涉及的肌群映射」，
 * 不代表肌电、个体激活程度或训练效果测量。
 */

export const MUSCLE_GROUPS = [
  { id: 'chest', name: '胸部', region: 'upper' },
  { id: 'shoulders', name: '肩部', region: 'upper' },
  { id: 'back', name: '背部', region: 'upper' },
  { id: 'arms', name: '手臂', region: 'upper' },
  { id: 'core', name: '核心', region: 'core' },
  { id: 'glutes', name: '臀部', region: 'lower' },
  { id: 'legs', name: '腿部', region: 'lower' },
  { id: 'calves', name: '小腿', region: 'lower' }
];

export const MUSCLES = [
  { id: 'pectoralis-major', name: '胸大肌', nameEn: 'Pectoralis Major', groupId: 'chest', region: 'upper' },
  { id: 'serratus-anterior', name: '前锯肌', nameEn: 'Serratus Anterior', groupId: 'chest', region: 'upper' },
  { id: 'anterior-deltoid', name: '三角肌前束', nameEn: 'Anterior Deltoid', groupId: 'shoulders', region: 'upper' },
  { id: 'lateral-deltoid', name: '三角肌中束', nameEn: 'Lateral Deltoid', groupId: 'shoulders', region: 'upper' },
  { id: 'posterior-deltoid', name: '三角肌后束', nameEn: 'Posterior Deltoid', groupId: 'shoulders', region: 'upper' },
  { id: 'rotator-cuff', name: '肩袖肌群', nameEn: 'Rotator Cuff', groupId: 'shoulders', region: 'upper' },
  { id: 'latissimus-dorsi', name: '背阔肌', nameEn: 'Latissimus Dorsi', groupId: 'back', region: 'upper' },
  { id: 'rhomboids', name: '菱形肌', nameEn: 'Rhomboids', groupId: 'back', region: 'upper' },
  { id: 'trapezius-upper', name: '斜方肌上束', nameEn: 'Upper Trapezius', groupId: 'back', region: 'upper' },
  { id: 'trapezius-mid-lower', name: '斜方肌中下束', nameEn: 'Middle & Lower Trapezius', groupId: 'back', region: 'upper' },
  { id: 'erector-spinae', name: '竖脊肌', nameEn: 'Erector Spinae', groupId: 'back', region: 'upper' },
  { id: 'biceps-brachii', name: '肱二头肌', nameEn: 'Biceps Brachii', groupId: 'arms', region: 'upper' },
  { id: 'brachialis', name: '肱肌', nameEn: 'Brachialis', groupId: 'arms', region: 'upper' },
  { id: 'triceps-brachii', name: '肱三头肌', nameEn: 'Triceps Brachii', groupId: 'arms', region: 'upper' },
  { id: 'forearms', name: '前臂肌群', nameEn: 'Forearms', groupId: 'arms', region: 'upper' },
  { id: 'rectus-abdominis', name: '腹直肌', nameEn: 'Rectus Abdominis', groupId: 'core', region: 'core' },
  { id: 'obliques', name: '腹斜肌', nameEn: 'Obliques', groupId: 'core', region: 'core' },
  { id: 'transverse-abdominis', name: '腹横肌', nameEn: 'Transverse Abdominis', groupId: 'core', region: 'core' },
  { id: 'hip-flexors', name: '髂腰肌', nameEn: 'Hip Flexors', groupId: 'core', region: 'core' },
  { id: 'gluteus-maximus', name: '臀大肌', nameEn: 'Gluteus Maximus', groupId: 'glutes', region: 'lower' },
  { id: 'gluteus-medius', name: '臀中肌', nameEn: 'Gluteus Medius', groupId: 'glutes', region: 'lower' },
  { id: 'quadriceps', name: '股四头肌', nameEn: 'Quadriceps', groupId: 'legs', region: 'lower' },
  { id: 'hamstrings', name: '腘绳肌', nameEn: 'Hamstrings', groupId: 'legs', region: 'lower' },
  { id: 'adductors', name: '内收肌群', nameEn: 'Adductors', groupId: 'legs', region: 'lower' },
  { id: 'gastrocnemius', name: '腓肠肌', nameEn: 'Gastrocnemius', groupId: 'calves', region: 'lower' },
  { id: 'soleus', name: '比目鱼肌', nameEn: 'Soleus', groupId: 'calves', region: 'lower' }
];

const GROUP_NAME = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g.id, g.name]));

export const MUSCLES_BY_ID = Object.fromEntries(MUSCLES.map((m) => [m.id, { ...m, groupName: GROUP_NAME[m.groupId] }]));

export const MUSCLE_IDS = new Set(MUSCLES.map((m) => m.id));

export function getMuscle(id) {
  return MUSCLES_BY_ID[id] || null;
}

export function muscleName(id) {
  const m = MUSCLES_BY_ID[id];
  return m ? m.name : id;
}

export function groupName(groupId) {
  return GROUP_NAME[groupId] || groupId;
}

export function groupOfMuscle(muscleId) {
  const m = MUSCLES_BY_ID[muscleId];
  return m ? m.groupId : null;
}

export function musclesByGroup(groupId) {
  return MUSCLES.filter((m) => m.groupId === groupId);
}

export function muscleNames(ids = []) {
  return ids.map((id) => muscleName(id)).filter(Boolean);
}

export const GROUP_ORDER = MUSCLE_GROUPS.map((g) => g.id);

/** 组内肌肉 id（供筛选下拉使用） */
export const MUSCLE_FILTER_OPTIONS = MUSCLE_GROUPS.map((g) => ({
  group: g,
  muscles: musclesByGroup(g.id)
}));

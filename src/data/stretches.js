/**
 * 训练后拉伸库（阶段 0 / 原型阶段）。
 *
 * 口径：
 * - 仅做低强度静态拉伸（mild），不涉及疼痛拉伸或医疗建议；
 * - 每条拉伸标注目标肌群与相关动作模式（使用项目固定枚举），供分析页按动作选择；
 * - 来源仅填写可确认存在的公开页面；拉伸时长、强度为项目内约定，不是个体化训练安排。
 */

const ACCESSED_AT = '2026-10-22';
const CONTENT_VERSION = '2026.10.1';

function aceSource(label, url, publishedAt = '2026') {
  return {
    label,
    url,
    publisher: 'American Council on Exercise (ACE)',
    publishedAt,
    accessedAt: ACCESSED_AT
  };
}

function nhsSource(label, url, publishedAt) {
  return { label, url, publisher: 'NHS', publishedAt, accessedAt: ACCESSED_AT };
}

const STOP_BASIC = '出现疼痛、麻木、眩晕等立即停止';

export const stretches = [
  {
    id: 'chest-doorway-stretch',
    name: '门框胸肌拉伸',
    targetMuscles: ['pectoralis-major', 'anterior-deltoid'],
    relatedPatterns: ['horizontal-push', 'vertical-push'],
    description:
      '站在门框中间，一侧前臂贴住门框、肘部约与肩同高，身体缓慢向前迈半步，感受胸前打开；肩部保持放松，不要耸肩。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['前臂贴紧门框，肘部略低于肩或与肩同高', '身体整体前移，不要塌腰或耸肩', '呼吸均匀，拉伸感以温和紧绷为准'],
    stopConditions: [STOP_BASIC, '肩前侧出现刺痛或关节卡压感时停止'],
    safetyNotes: ['拉伸前先做 3-5 分钟低强度热身', '不要弹振或追求疼痛幅度'],
    source: nhsSource('NHS：柔韧性练习（Flexibility exercises）', 'https://www.nhs.uk/live-well/exercise/flexibility-exercises/', '2023-11-20'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'kneeling-lat-stretch',
    name: '跪姿背阔肌拉伸',
    targetMuscles: ['latissimus-dorsi', 'trapezius-mid-lower'],
    relatedPatterns: ['vertical-pull', 'horizontal-pull'],
    description:
      '跪在垫上，双手扶住前方的训练凳或沙发边缘，臀部向后坐、胸口向下沉，感受侧背与背阔肌被温和拉长；保持呼吸，不要塌腰。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['双手固定、肘部自然伸直或微屈', '臀部向后坐，胸口向下沉', '避免弹振，保持均匀呼吸'],
    stopConditions: [STOP_BASIC, '肩部或腰部出现刺痛时停止'],
    safetyNotes: ['膝下垫软垫减少压迫', '腰部不适时减小下沉幅度'],
    source: aceSource('ACE 健身动作库：Kneeling Lat Stretch 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/141/kneeling-lat-stretch-w-bench/'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'cross-body-shoulder-stretch',
    name: '肩后侧拉伸',
    targetMuscles: ['posterior-deltoid', 'rotator-cuff'],
    relatedPatterns: ['horizontal-push', 'vertical-push'],
    description:
      '站姿或坐姿，一侧手臂伸直横过胸前，另一只手扶住上臂向身体方向轻压；肩膀保持下沉，感受肩后侧被温和拉长。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['手臂大致与地面平行', '肩膀保持下沉，不要耸肩', '轻压即可，不追求强烈牵拉'],
    stopConditions: [STOP_BASIC, '肩关节出现卡压或刺痛时停止'],
    safetyNotes: ['肩部近期受伤时应先咨询专业人士', '不要用另一只手猛拉肘部'],
    source: aceSource('ACE 健身动作库（拉伸动作教学）', 'https://www.acefitness.org/resources/everyone/exercise-library/'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'neck-upper-trap-stretch',
    name: '颈侧上斜方肌拉伸',
    targetMuscles: ['trapezius-upper', 'rhomboids'],
    relatedPatterns: ['carry', 'vertical-pull'],
    description:
      '坐或站直，一侧手轻扶头部向同侧缓慢倾斜，另一侧肩膀保持下沉，感受颈侧与上斜方肌被温和拉长；动作要轻、呼吸自然。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['肩膀下沉、下巴微收', '用手轻带，不用力拉扯', '两侧可交替进行'],
    stopConditions: [STOP_BASIC, '颈部出现放射痛或手臂麻木时立即停止'],
    safetyNotes: ['颈椎不适或有眩晕史者不做此拉伸，改为温和的肩部放松', '避免快速甩头或转圈'],
    source: nhsSource('NHS：柔韧性练习（颈部拉伸）', 'https://www.nhs.uk/live-well/exercise/flexibility-exercises/', '2023-11-20'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'kneeling-hip-flexor-stretch',
    name: '跪姿髋屈肌拉伸',
    targetMuscles: ['hip-flexors', 'quadriceps'],
    relatedPatterns: ['squat', 'lunge', 'hip-extension'],
    description:
      '单膝跪地呈弓步，骨盆微后倾、收紧臀部，身体缓慢向前移，感受后侧髋前部与大腿前侧的温和拉伸；保持躯干直立、呼吸均匀。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['前脚踩稳，后膝垫软垫', '臀部收紧、骨盆微后倾', '身体前移幅度小，避免塌腰'],
    stopConditions: [STOP_BASIC, '膝关节或腰部出现疼痛时停止'],
    safetyNotes: ['膝下垫软垫，避免膝部直接受压', '骨盆保持中立，不用腰部代偿前倾'],
    source: aceSource('ACE 健身动作库：Kneeling Hip-flexor Stretch 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/142/kneeling-hip-flexor-stretch/'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'standing-quad-stretch',
    name: '站姿大腿前侧拉伸',
    targetMuscles: ['quadriceps'],
    relatedPatterns: ['squat', 'lunge'],
    description:
      '单脚站立并扶住墙面或椅背，同侧手握住脚踝将脚跟缓慢拉向臀部，双膝尽量并拢、骨盆保持中立，感受大腿前侧拉伸。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['扶稳支撑物保持平衡', '双膝并拢、骨盆中立', '脚跟缓慢靠近臀部，不猛拉'],
    stopConditions: [STOP_BASIC, '膝关节前侧出现疼痛时停止'],
    safetyNotes: ['平衡不稳时可靠墙进行', '拉伸侧膝盖若有不适，减小幅度或改为坐姿拉伸'],
    source: nhsSource('NHS：运动后如何拉伸（大腿拉伸）', 'https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/', '2026-03-16'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'supine-hamstring-stretch',
    name: '仰卧腘绳肌拉伸',
    targetMuscles: ['hamstrings'],
    relatedPatterns: ['hinge', 'squat'],
    description:
      '仰卧，一侧腿屈膝踩地，另一侧腿伸直抬起，双手抱住大腿后侧缓慢拉近身体，保持膝盖接近伸直，感受大腿后侧拉伸。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['腰部自然贴地，另一腿屈膝放松', '膝盖尽量伸直但不锁死', '用呼吸帮助放松，不弹振'],
    stopConditions: [STOP_BASIC, '大腿后侧出现锐痛或抽筋感时停止'],
    safetyNotes: ['腰部不适时在膝下垫枕，减小抬高幅度', '不要用手猛拉小腿'],
    source: nhsSource('NHS：运动后如何拉伸（腘绳肌拉伸）', 'https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/', '2026-03-16'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'figure-four-glute-stretch',
    name: '4 字臀部拉伸',
    targetMuscles: ['gluteus-maximus', 'gluteus-medius'],
    relatedPatterns: ['hip-extension', 'hip-abduction', 'squat'],
    description:
      '仰卧屈膝，一侧脚踝搭在对侧膝盖上呈数字 4 字，双手抱住下方大腿向胸口缓慢拉近，感受臀部外侧与深层的温和拉伸。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['搭腿的脚踝放松，不要用力勾脚', '双手抱大腿后侧，不用力压膝盖', '保持呼吸，两侧交替进行'],
    stopConditions: [STOP_BASIC, '髋部或膝关节出现刺痛时停止'],
    safetyNotes: ['髋关节置换或近期髋部受伤者应先咨询专业人士', '拉伸幅度以温和为准，避免膝盖被强力下压'],
    source: nhsSource('NHS：运动后如何拉伸（臀部拉伸）', 'https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/', '2026-03-16'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'butterfly-adductor-stretch',
    name: '蝴蝶式内收肌拉伸',
    targetMuscles: ['adductors'],
    relatedPatterns: ['squat', 'lunge'],
    description:
      '坐姿，双脚脚掌相对、膝盖自然向两侧下沉，背部保持延展，双手可轻扶脚踝或小腿，感受大腿内侧被温和拉长。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['背部延展，不弓背低头', '膝盖自然下沉，不用手强压', '保持均匀呼吸'],
    stopConditions: [STOP_BASIC, '大腿内侧出现刺痛或撕裂感时停止'],
    safetyNotes: ['髋部或内收肌近期拉伤者不做此拉伸', '不追求膝盖贴地，幅度以温和为准'],
    source: nhsSource('NHS：运动后如何拉伸（大腿内侧拉伸）', 'https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/', '2026-03-16'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'wall-calf-stretch',
    name: '靠墙小腿拉伸',
    targetMuscles: ['gastrocnemius'],
    relatedPatterns: ['calf-raise', 'cardio'],
    description:
      '双手扶墙，前腿屈膝、后腿伸直，后脚跟踩实地面，身体缓慢前移，感受后侧小腿上段的温和拉伸；背部保持直立。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['后脚跟踩实地面', '后腿伸直，身体整体前移', '两侧交替进行，不弹振'],
    stopConditions: [STOP_BASIC, '跟腱或小腿后侧出现锐痛时停止'],
    safetyNotes: ['跟腱近期疼痛者减小幅度或先咨询专业人士', '地面防滑，扶稳墙面'],
    source: nhsSource('NHS：柔韧性练习（小腿拉伸）', 'https://www.nhs.uk/live-well/exercise/flexibility-exercises/', '2023-11-20'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'seated-soleus-stretch',
    name: '坐姿比目鱼肌拉伸',
    targetMuscles: ['soleus', 'gastrocnemius'],
    relatedPatterns: ['calf-raise', 'cardio'],
    description:
      '坐姿，前脚掌踩在台阶或固定物边缘，脚跟缓慢向下压，膝盖保持微屈，感受小腿下段与跟腱上方的温和拉伸。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['膝盖微屈，重点拉小腿下段', '脚跟缓慢下压，不弹振', '两侧交替进行'],
    stopConditions: [STOP_BASIC, '跟腱出现刺痛时停止'],
    safetyNotes: ['选择稳定的台阶或固定物，避免滑倒', '跟腱损伤者应先咨询专业人士'],
    source: nhsSource('NHS：柔韧性练习（小腿拉伸）', 'https://www.nhs.uk/live-well/exercise/flexibility-exercises/', '2023-11-20'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'child-pose-back-stretch',
    name: '婴儿式背部拉伸',
    targetMuscles: ['erector-spinae', 'latissimus-dorsi'],
    relatedPatterns: ['hinge', 'core-anti-extension'],
    description:
      '跪坐在垫上，臀部靠近脚跟，双臂向前延伸、额头轻触地面，感受背部与侧背的温和拉长；保持呼吸，肩部放松。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['臀部靠近脚跟，手臂向前延伸', '额头可垫毛巾，肩部放松', '呼吸均匀，不憋气'],
    stopConditions: [STOP_BASIC, '腰部或膝关节出现疼痛时停止'],
    safetyNotes: ['膝部不适时在膝下垫软垫', '腰部不适时减小下沉幅度'],
    source: aceSource('ACE 健身动作库（拉伸动作教学）', 'https://www.acefitness.org/resources/everyone/exercise-library/'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'open-book-thoracic-rotation',
    name: '侧卧开书胸椎旋转',
    targetMuscles: ['rhomboids', 'obliques', 'pectoralis-major'],
    relatedPatterns: ['core-flexion', 'horizontal-push'],
    description:
      '侧卧屈膝，双臂向前伸直叠放；上方手臂像翻书一样缓慢打开至身体后侧，胸口随之打开，膝盖保持叠放，感受胸椎的温和旋转。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['膝盖保持叠放，骨盆尽量稳定', '手臂沿弧线缓慢打开，不快速甩动', '配合呼气加深旋转'],
    stopConditions: [STOP_BASIC, '肩部或腰部出现刺痛时停止'],
    safetyNotes: ['肩部近期受伤者减小打开幅度', '腰部不适时在膝间夹枕以稳定骨盆'],
    source: aceSource('ACE 健身动作库（拉伸动作教学）', 'https://www.acefitness.org/resources/everyone/exercise-library/'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  {
    id: 'cat-cow-spinal-mobility',
    name: '猫牛式脊柱活动',
    targetMuscles: ['erector-spinae', 'rectus-abdominis'],
    relatedPatterns: ['mobility', 'core-flexion'],
    description:
      '四点跪姿，吸气时抬头、尾骨向上、背部轻下沉；呼气时收腹拱背、下巴微收，缓慢交替，感受脊柱逐节活动。',
    durationSec: { min: 20, max: 30 },
    intensity: 'mild',
    cues: ['手腕位于肩正下方，膝盖位于髋正下方', '动作缓慢，与呼吸同步', '幅度温和，不追求极限'],
    stopConditions: [STOP_BASIC, '手腕、肩部或腰部出现疼痛时停止'],
    safetyNotes: ['腕部不适时可用拳头支撑或改为坐姿脊柱活动', '膝下垫软垫减少压迫'],
    source: aceSource('ACE 健身动作库：Cat-Cow 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/15/cat-cow/'),
    contentVersion: CONTENT_VERSION,
    updatedAt: '2026-10-22'
  },
  // __APPEND_POINT__
];

/**
 * 从动作或分析事实中选择最多 3 条相关拉伸。
 *
 * 输入两种形态：
 * 1. 动作对象：{ pattern, primaryMuscles, secondaryMuscles }；
 * 2. 分析事实：{ muscleExposure: [{ muscleId, estimatedSets }], patterns: [{ pattern }] }。
 *
 * 匹配逻辑（确定性）：动作模式命中优先（权重高于肌群），其次按目标肌群重叠；
 * 主练肌群权重高于次练肌群；同分时按拉伸库声明顺序排序；最多返回 3 条。
 *
 * @param {object|null|undefined} input
 * @returns {Array<object>} 拉伸对象数组（浅拷贝，最多 3 条；无匹配时返回空数组）
 */
export function stretchesFor(input) {
  const { patterns, muscleWeights } = normalizeStretchInput(input);
  const scored = stretches
    .map((stretch, index) => ({ stretch, index, score: scoreStretch(stretch, patterns, muscleWeights) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3);
  return scored.map((entry) => ({ ...entry.stretch }));
}

const MAX_PATTERN_WEIGHT = 100;
const PRIMARY_MUSCLE_WEIGHT = 10;
const SECONDARY_MUSCLE_WEIGHT = 4;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStretchInput(input) {
  const patterns = [];
  const muscleWeights = new Map();
  if (!input || typeof input !== 'object') return { patterns, muscleWeights };

  if (Array.isArray(input.muscleExposure)) {
    // 分析事实：肌群按估计组数加权，动作模式来自本次训练的分布
    for (const item of input.muscleExposure) {
      if (!item || typeof item.muscleId !== 'string') continue;
      const weight = toNumber(item.estimatedSets);
      muscleWeights.set(item.muscleId, Math.max(muscleWeights.get(item.muscleId) || 0, weight));
    }
    for (const item of Array.isArray(input.patterns) ? input.patterns : []) {
      if (item && typeof item.pattern === 'string') patterns.push(item.pattern);
    }
    return { patterns, muscleWeights };
  }

  // 单个动作：主练肌群权重 2，次练肌群权重 1
  if (typeof input.pattern === 'string') patterns.push(input.pattern);
  for (const muscleId of Array.isArray(input.primaryMuscles) ? input.primaryMuscles : []) {
    if (typeof muscleId === 'string') muscleWeights.set(muscleId, 2);
  }
  for (const muscleId of Array.isArray(input.secondaryMuscles) ? input.secondaryMuscles : []) {
    if (typeof muscleId === 'string' && !muscleWeights.has(muscleId)) muscleWeights.set(muscleId, 1);
  }
  return { patterns, muscleWeights };
}

function scoreStretch(stretch, patterns, muscleWeights) {
  if (!stretch || !Array.isArray(stretch.relatedPatterns) || !Array.isArray(stretch.targetMuscles)) return 0;
  let score = 0;
  const seenPatterns = new Set();
  for (const pattern of patterns) {
    if (seenPatterns.has(pattern)) continue;
    seenPatterns.add(pattern);
    if (stretch.relatedPatterns.includes(pattern)) score += MAX_PATTERN_WEIGHT;
  }
  for (const [muscleId, weight] of muscleWeights) {
    if (!stretch.targetMuscles.includes(muscleId)) continue;
    score += weight >= 2 ? PRIMARY_MUSCLE_WEIGHT : SECONDARY_MUSCLE_WEIGHT;
  }
  return score;
}

export const STRETCH_CONTENT_VERSION = CONTENT_VERSION;

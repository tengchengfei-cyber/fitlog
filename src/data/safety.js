/**
 * 安全数据与确定性危险信号检测（阶段 4 产出）。
 *
 * 设计原则：
 * 1. 只做「关键词匹配 + 固定文案」，不做诊断、不做分诊、不推断病因；
 * 2. 检测结果完全确定：同一输入文本 → 同一 id 数组（顺序固定、去重）；
 * 3. 宁可多提示，不做惊悚表述：文案只建议「停止训练 + 寻求专业医疗意见」；
 * 4. 只识别「明确否定短语」抑制命中（如「无胸痛」「没有胸痛」「未出现胸痛」）；
 *    无法确定是否定语境时一律按命中处理（宁可提示，不可漏报）。
 *
 * 关键词匹配约定（2026-10-22 P0 整改）：
 * - 只匹配中文关键词；大小写、全半角差异不影响（中文为主，英文备注不参与）；
 * - 否定判断不再使用「关键词前 3 个字符内出现任意否定字」的宽泛规则：
 *   旧规则会把「不稳，胸痛」「不慎胸痛」误判为否定而漏报；
 * - 现在的规则：在命中关键词之前、同一标点分句内，找到最近的明确否定词（无/没有/没/未出现/未发生/未发现/未见/不伴/不伴有等），
 *   且否定词与关键词之间只允许出现修饰语、其他危险信号关键词与连接词（如「没有胸痛和呼吸困难」）；
 *   若出现转折词（但/却/不过/仍然/反而等）或任何其他内容，则不视为否定 → 仍然提示；
 * - 同一规则内多个关键词命中只返回一次；结果按 RED_FLAGS 顺序去重返回。
 */

export const SAFETY_VERSION = 'safety-2026.10.22';

/** 分句标点：否定只看同一分句内的内容，避免跨句误判。 */
const CLAUSE_BOUNDARIES = '，,。.；;！!？?\n';

/** 转折/重启词：出现后表示后文是新的陈述，不能沿用前面的否定。 */
const CONTRAST_WORDS = ['但是', '但', '然而', '不过', '却', '仍然', '还是', '反而', '随后', '后来', '再次', '又'];

/** 明确否定词（按长度从长到短匹配；不含单独的「不」：避免「不慎胸痛」被误判为否定）。 */
const NEGATION_TOKENS = [
  '没有出现',
  '没有发生',
  '没有伴随',
  '没有明显',
  '没有',
  '未出现',
  '未发生',
  '未发现',
  '未伴有',
  '未伴随',
  '未见',
  '不伴有',
  '不伴随',
  '不伴',
  '无明显',
  '无任何',
  '无',
  '没'
];

/** 否定词与危险信号之间允许出现的修饰/连接内容（如「没有出现明显的胸痛和呼吸困难」）。 */
const SAFE_GAP_MODIFIERS = ['出现', '发生', '发现', '见', '伴有', '伴随', '伴', '明显', '任何', '持续', '的'];

/**
 * 危险信号清单（≥ 8 条）。message 为固定中文提示：只建议停止训练并寻求专业医疗意见，不做诊断。
 * 不写「应该」「保证」「修复」类表述；不涉及个体疾病风险预测。
 */
export const RED_FLAGS = [
  {
    id: 'rf-chest-pain',
    label: '胸痛',
    keywords: ['胸痛', '胸口痛', '胸部疼痛', '心前区疼痛', '胸前区痛', '胸口疼'],
    message: '出现胸痛或胸部疼痛时请立即停止训练，休息并尽快寻求专业医疗意见；若疼痛持续、加重或伴随出汗、气短，请立即呼叫急救。'
  },
  {
    id: 'rf-chest-tightness',
    label: '胸闷 / 胸部压迫感',
    keywords: ['胸闷', '胸口闷', '胸部压迫', '胸口压', '胸口紧', '胸部发紧', '胸前区不适'],
    message: '出现胸闷或胸部压迫感时请立即停止训练并休息；若症状不缓解或伴随呼吸困难、冷汗，请立即寻求急救。'
  },
  {
    id: 'rf-dyspnea',
    label: '呼吸困难',
    keywords: ['呼吸困难', '喘不上气', '喘不过气', '无法呼吸', '透不过气', '呼吸费力', '呼吸急促'],
    message: '出现明显呼吸困难时请立即停止训练，坐下或半躺休息；若短时间不缓解，请立即寻求专业医疗帮助或呼叫急救。'
  },
  {
    id: 'rf-shortness',
    label: '气短',
    keywords: ['气短', '呼吸短促', '上不来气', '憋气', '吸不上气'],
    message: '出现异常气短时请降低强度或停止训练并休息；若气短与训练强度明显不符或持续不缓解，请咨询专业医疗人员。'
  },
  {
    id: 'rf-dizziness',
    label: '眩晕 / 头晕',
    keywords: ['眩晕', '头晕', '头昏', '眼前发黑', '天旋地转', '站不稳'],
    message: '出现眩晕或头晕时请立即停止训练，坐下或躺下休息，避免跌倒；若反复出现或伴随其他不适，请尽快寻求专业医疗意见。'
  },
  {
    id: 'rf-faint',
    label: '昏厥 / 意识异常',
    keywords: ['昏厥', '晕厥', '晕倒', '失去意识', '意识模糊', '眼前一黑'],
    message: '出现昏厥、近乎昏厥或意识异常时请立即停止训练并寻求帮助；若已晕倒或意识未恢复，请立即呼叫急救。'
  },
  {
    id: 'rf-numbness',
    label: '麻木 / 异常刺痛',
    keywords: ['麻木', '发麻', '麻了', '失去知觉', '刺痛感', '针刺感'],
    message: '出现麻木或异常刺痛时请停止训练并改变姿势观察；若持续存在、范围扩大或伴随无力，请尽快寻求专业医疗意见。'
  },
  {
    id: 'rf-palpitations',
    label: '心悸 / 心跳异常',
    keywords: ['心悸', '心慌', '心跳异常', '心跳不规则', '心律不齐', '心跳漏拍', '心跳很乱'],
    message: '出现心悸或明显心跳异常时请停止训练并休息；若症状持续、反复出现或伴随胸闷、气短，请尽快寻求专业医疗意见。'
  },
  {
    id: 'rf-nausea',
    label: '恶心 / 呕吐',
    keywords: ['恶心', '想吐', '呕吐', '反胃'],
    message: '出现恶心或呕吐时请停止训练、补充水分并休息；若反复呕吐、无法补水或伴随其他不适，请寻求专业医疗帮助。'
  },
  {
    id: 'rf-abnormal-fatigue',
    label: '异常疲劳 / 明显乏力',
    keywords: ['异常疲劳', '极度疲劳', '异常乏力', '明显乏力', '浑身无力', '四肢无力', '虚弱感'],
    message: '出现与训练量明显不符的异常疲劳或乏力时请结束训练并休息；若持续存在或影响日常活动，请咨询专业医疗人员。'
  },
  {
    id: 'rf-pain',
    label: '疼痛',
    keywords: ['疼痛', '剧痛', '很痛', '持续痛', '痛得', '疼得', '痛醒', '疼醒'],
    message: '记录到明显疼痛时请停止相关动作并观察；若疼痛持续、加重或反复出现，请停止训练并寻求专业医疗意见。'
  },
  {
    id: 'rf-injury',
    label: '受伤',
    keywords: ['受伤', '扭伤', '拉伤', '撕裂', '骨折', '脱臼', '崴脚', '崴了', '挫伤'],
    message: '发生受伤后请立即停止训练并保护受伤部位；不要自行判断伤情，请尽快寻求专业医疗评估。'
  },
  {
    id: 'rf-joint-pain',
    label: '关节疼痛',
    keywords: [
      '关节痛',
      '关节疼',
      '关节疼痛',
      '膝盖痛',
      '膝盖疼',
      '膝痛',
      '腰痛',
      '腰疼',
      '肩痛',
      '肩疼',
      '肘痛',
      '肘疼',
      '腕痛',
      '腕疼',
      '踝痛',
      '踝疼',
      '髋痛',
      '髋疼'
    ],
    message: '记录到关节疼痛时请停止相关动作并观察；若疼痛持续、加重或伴随肿胀、活动受限，请寻求专业医疗意见。'
  }
];

/** 较轻的不适关键词：只用于判定「不适」降级态，不视为危险信号（≠ 诊断）。 */
export const DISCOMFORT_KEYWORDS = [
  '不适',
  '酸痛',
  '酸胀',
  '发紧',
  '紧绷',
  '轻微疼',
  '有点疼',
  '有点痛',
  '疲劳',
  '乏力',
  '僵硬'
];

export const RED_FLAG_IDS = RED_FLAGS.map((f) => f.id);

const RED_FLAG_BY_ID = Object.fromEntries(RED_FLAGS.map((f) => [f.id, f]));

export const STOP_TRAINING_MESSAGE =
  '请停止训练并优先处理身体发出的信号。你记录的内容包含需要谨慎对待的不适信号；' +
  '本应用不做诊断，也无法判断这些症状的原因。请休息，并尽快寻求专业医疗意见（医生、急诊或合格的运动医学人员）。' +
  '若出现持续胸痛或胸闷、明显呼吸困难、晕厥或意识异常，请立即呼叫急救（中国大陆可拨 120）。' +
  '在专业人员评估前，请不要继续加量或恢复高强度训练。';

export const DISCOMFORT_MESSAGE =
  '你记录了轻中度不适。建议先降低强度或结束本次训练，观察症状是否缓解；本次不提供加量建议。' +
  '如果不适持续、加重或反复出现，请停止训练并咨询专业医疗人员。本应用不做诊断。';

export const SAFETY_DISCLAIMER =
  '本应用用于记录训练并展示一般性运动参考信息，不构成医疗诊断、治疗或康复处方，' +
  '也不能替代医生、物理治疗师或合格教练的个体化评估。任何训练决定请结合自身健康状况；' +
  '如有疾病、伤病、孕产期或用药情况，请先咨询专业人士。';

/**
 * 去重并保持固定顺序。
 * @param {string[]} ids
 * @returns {string[]}
 */
function uniqueInOrder(ids) {
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

/** 所有危险信号关键词（长词优先，用于识别否定短语里的并列危险信号）。 */
const ALL_RED_FLAG_KEYWORDS = [...new Set(RED_FLAGS.flatMap((flag) => flag.keywords))].sort(
  (a, b) => b.length - a.length
);

/** 找到 index 所在分句的起始位置。 */
function clauseStart(text, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (CLAUSE_BOUNDARIES.includes(text[i])) return i + 1;
  }
  return 0;
}

/** 去掉否定短语与关键词之间的修饰语、连接词和并列的其他危险信号关键词。 */
function stripAllowedGap(gap) {
  let rest = gap;
  for (const keyword of ALL_RED_FLAG_KEYWORDS) {
    rest = rest.split(keyword).join('');
  }
  for (const word of SAFE_GAP_MODIFIERS) {
    rest = rest.split(word).join('');
  }
  return rest.replace(/[和与及、\s]/g, '');
}

/**
 * 判断 text[index] 处的关键词命中是否处于「明确否定」语境。
 *
 * 仅当同一分句内、命中位置之前存在明确否定词，且否定词到关键词之间只剩修饰语/连接词/并列危险信号时，
 * 才视为否定；否则默认按命中处理（宁可提示，不可漏报）。
 *
 * 回归用例（项目总监 P0）：
 * - 「无胸痛」「没有胸痛」「未出现胸痛」→ 否定（不提示）；
 * - 「不稳，胸痛」「不慎胸痛」→ 不是否定（必须提示）。
 */
function isNegatedAt(text, index) {
  const start = clauseStart(text, index);
  const prefix = text.slice(start, index);

  let negationEnd = -1;
  for (const token of NEGATION_TOKENS) {
    const pos = prefix.lastIndexOf(token);
    if (pos >= 0 && pos + token.length > negationEnd) {
      negationEnd = pos + token.length;
    }
  }
  if (negationEnd < 0) return false;

  const gap = prefix.slice(negationEnd);
  // 否定之后出现转折词：后文是新的陈述，不能算否定。
  if (CONTRAST_WORDS.some((word) => gap.includes(word))) return false;

  const leftover = stripAllowedGap(gap);
  return leftover.length === 0;
}

/**
 * 确定性危险信号检测：纯文本关键词匹配，返回去重后的 redFlag id 数组。
 * 同一输入永远返回同一结果；空/非字符串输入返回 []。
 *
 * @param {string} text 待检测文本（可传入多条备注拼接后的文本）
 * @returns {string[]} 命中的 RED_FLAGS id（按 RED_FLAGS 顺序去重）
 */
export function detectRedFlags(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const normalized = text.replace(/\s+/g, ' ');
  const matched = [];
  for (const flag of RED_FLAGS) {
    let hit = false;
    for (const keyword of flag.keywords) {
      if (normalized.includes(keyword)) {
        // 找到该关键词第一次出现的位置，检查是否处于否定语境
        let fromIndex = 0;
        let found = false;
        while (fromIndex <= normalized.length) {
          const idx = normalized.indexOf(keyword, fromIndex);
          if (idx === -1) break;
          if (!isNegatedAt(normalized, idx)) {
            found = true;
            break;
          }
          fromIndex = idx + keyword.length;
        }
        if (found) {
          hit = true;
          break;
        }
      }
    }
    if (hit) matched.push(flag.id);
  }
  return uniqueInOrder(matched);
}

/**
 * 是否记录到轻中度不适（用于降级措辞；不替代危险信号检测）。
 * @param {string} text
 * @returns {boolean}
 */
export function detectDiscomfort(text) {
  if (typeof text !== 'string' || text.length === 0) return false;
  return DISCOMFORT_KEYWORDS.some((keyword) => text.includes(keyword));
}

/** 取单条危险信号定义，不存在返回 null。 */
export function getRedFlag(id) {
  return RED_FLAG_BY_ID[id] || null;
}

/** 将 id 数组转为中文标签数组（未知 id 忽略），用于展示。 */
export function redFlagLabels(ids = []) {
  return (Array.isArray(ids) ? ids : [])
    .map((id) => RED_FLAG_BY_ID[id])
    .filter(Boolean)
    .map((flag) => flag.label);
}

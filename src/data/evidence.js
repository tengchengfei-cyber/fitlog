/**
 * 证据规则库（阶段 0/4 产出）。
 *
 * 用途：
 * - 分析页「证据与局限」分区展示；
 * - 每条分析建议通过 ruleIds 绑定到这里的规则，可点开查看来源、等级、审核日期、适用前提与免责声明；
 * - 规则只服务「一般健康成人」的运动参考，不做医疗诊断或个体处方。
 *
 * 来源真实性约定（硬要求）：
 * - 只登记编写时实际访问并核对过内容的公开页面；
 * - 无法核实的规则使用 url: null + reviewStatus: 'pending-review'，并在 limitations 中说明原因；
 * - 不虚构 URL、作者、期刊、DOI 或发布日期；
 * - 页面显示的「最近复核日期」在 source.label 与 publishedAt 中标注，避免与「首次发布」混淆。
 *
 * 版本：
 * - RULES_VERSION 标识规则库整体版本（分析快照的 rulesVersion/dataVersion 引用它）；
 * - 每条规则带自己的 contentVersion，便于增量审核。
 */

export const RULES_VERSION = 'evidence-2026.10.22';
export const EVIDENCE_CONTENT_VERSION = '2026.10.22';
export const EVIDENCE_ACCESSED_AT = '2026-10-22';
export const EVIDENCE_REVIEWED_AT = '2026-10-22';

const WHO_ACTIVITY = {
  label: 'WHO：Be Healthy – Physical activity（成人与老年人身体活动建议；页面未标注独立发布日期）',
  url: 'https://www.who.int/initiatives/behealthy/physical-activity/',
  publisher: 'World Health Organization (WHO)',
  publishedAt: 'n.d.',
  accessedAt: EVIDENCE_ACCESSED_AT
};

const ACSM_2026 = {
  label: 'ACSM：Resistance Training Guidelines Update 2026（2026-03-17 新闻稿，含立场声明要点摘要）',
  url: 'https://acsm.org/resistance-training-guidelines-update-2026/',
  publisher: 'American College of Sports Medicine (ACSM)',
  publishedAt: '2026-03-17',
  accessedAt: EVIDENCE_ACCESSED_AT
};

const NHS_PA_1964 = {
  label: 'NHS：Physical activity guidelines for adults aged 19 to 64（页面最近复核 2024-05-22）',
  url: 'https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-for-adults-aged-19-to-64/',
  publisher: 'NHS (UK)',
  publishedAt: '2024-05-22',
  accessedAt: EVIDENCE_ACCESSED_AT
};

const NHS_STRENGTH = {
  label: 'NHS：How to improve your strength and flexibility（页面最近复核 2026-07-21）',
  url: 'https://www.nhs.uk/live-well/exercise/how-to-improve-strength-flexibility/',
  publisher: 'NHS (UK)',
  publishedAt: '2026-07-21',
  accessedAt: EVIDENCE_ACCESSED_AT
};

const NHS_STRETCH = {
  label: 'NHS：How to stretch after exercising（页面最近复核 2026-03-16）',
  url: 'https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/',
  publisher: 'NHS (UK)',
  publishedAt: '2026-03-16',
  accessedAt: EVIDENCE_ACCESSED_AT
};

const NHS_WARMUP = {
  label: 'NHS：How to warm up before exercising（页面最近复核 2026-06-24）',
  url: 'https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/',
  publisher: 'NHS (UK)',
  publishedAt: '2026-06-24',
  accessedAt: EVIDENCE_ACCESSED_AT
};

const NHS_CHEST_PAIN = {
  label: 'NHS：Chest pain（页面最近复核 2023-08-08；含胸闷/气短/冷汗等急症识别提示）',
  url: 'https://www.nhs.uk/symptoms/chest-pain/',
  publisher: 'NHS (UK)',
  publishedAt: '2023-08-08',
  accessedAt: EVIDENCE_ACCESSED_AT
};

const PRODUCT_SOURCE = (label) => ({
  label,
  url: null,
  publisher: '本项目（产品规则）',
  publishedAt: 'n.d.',
  accessedAt: EVIDENCE_ACCESSED_AT
});

/**
 * 证据规则（11 条）。id 命名：E-<类别缩写>-<序号>。
 * evidenceLevel 仅取契约枚举：guideline | position-stand | systematic-review | expert-consensus。
 */
export const EVIDENCE_RULES = [
  {
    id: 'E-FREQ-001',
    category: 'frequency',
    title: '健康成人每周至少 2 天肌力训练',
    statement:
      '一般健康成人应每周至少 2 天进行涉及主要肌群（腿、髋、背、腹、胸、肩、臂）的肌力训练；' +
      '把力量训练与有氧活动结合安排，并尽量均匀分布在一周中。',
    evidenceLevel: 'guideline',
    applicability: '一般健康成人（以 18–64 岁为主）；无已知疾病或医嘱限制；不适用于康复处方、孕产期或医疗监督下的运动处方。',
    source: WHO_ACTIVITY,
    limitations:
      'WHO 页面给出的是人群层面建议，未针对训练经验、目标或恢复能力做个体化；页面未标注独立发布日期，publishedAt 记为 n.d.。',
    reviewStatus: 'reviewed',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-VOL-001',
    category: 'volume',
    title: '增肌训练量参考：ACSM 2026 公开材料约 10 组/肌群/周',
    statement:
      'ACSM 2026 公开材料给出的增肌训练量参考为「每肌群每周约 10 组」；该数值是群体层面参考，' +
      '具体训练量应结合个体目标、训练经验与恢复情况调整，不作为处方。',
    evidenceLevel: 'position-stand',
    applicability:
      '一般健康成人增肌训练参考；无相关疾病或医嘱限制；不适用于康复、孕产期、青少年或专业运动员的个体化处方。',
    source: ACSM_2026,
    limitations:
      '该来源为 ACSM 2026 新闻稿摘要（非完整立场声明原文），只直接支持「约 10 组/肌群/周」这一表述。' +
      '产品此前展示的「10–20 组/周」区间中，上沿约 20 组缺乏当前来源直接支持，已从展示文案移除；' +
      '如后续需要区间展示，必须先补充可定位来源并重新审核。不同肌群与动作的计数口径不同，估计组数仅供比较训练分布。',
    reviewStatus: 'reviewed',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-PROG-001',
    category: 'progression',
    title: '循序渐进：从可完成强度开始，在数周内逐步增加',
    statement:
      '开始力量训练时应循序渐进：从可完成的强度与组数开始，在数周内逐步增加；' +
      '出现动作变形、异常疲劳或疼痛时应回退或停止（NHS 一般建议）。',
    evidenceLevel: 'guideline',
    applicability: '一般健康成人力量/增肌训练；不适用于康复进程或存在伤病、疾病限制者。',
    source: NHS_STRENGTH,
    limitations:
      'NHS 页面原文建议「循序渐进、用数周时间逐步增加」；本应用把「一次只调整一个变量、小幅度且可撤回」作为产品执行准则，' +
      '属于保守转述，不是 NHS 原文逐字表述。',
    reviewStatus: 'reviewed',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-DATA-001',
    category: 'completeness',
    title: '记录完整度决定可分析范围',
    statement:
      '分析只能基于已记录的数据：当只记录组数、缺少重量或次数时，应用只描述训练分布与完成情况，' +
      '不做负荷、强度或进步幅度判断；缺失 RPE 或休息时间时，相应维度标注为缺失，不进行推测。',
    evidenceLevel: 'expert-consensus',
    applicability: '使用本应用记录训练的一般人群；属于产品数据口径规则，不是医学或训练学处方。',
    source: PRODUCT_SOURCE('训练记录完整性与可解释性产品原则（方法学来源待补充）'),
    limitations:
      '该规则为产品可解释性要求，方法学来源待补充，尚未绑定具体文献；不宣称任何数据完整度阈值具有医学意义。',
    reviewStatus: 'pending-review',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-SAMPLE-001',
    category: 'completeness',
    title: '样本不足时不做长期结论',
    statement:
      '首次训练或近期历史已完成训练少于 3 次时，分析只描述本次训练事实，不对长期训练分布、频率或进步趋势下结论；' +
      '达到样本要求后才展示窗口内的聚合估计，并注明估计口径。',
    evidenceLevel: 'expert-consensus',
    applicability: '使用本应用分析模块的一般人群；属于产品统计口径，不构成医学判断。',
    source: PRODUCT_SOURCE('最小样本与统计可解释性产品原则（方法学来源待补充）'),
    limitations:
      '「窗口内至少 3 次」是产品可解释性阈值，用于保证聚合至少覆盖不同日期的记录，不是循证医学截断值；方法学来源待补充复核。',
    reviewStatus: 'pending-review',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-CONS-001',
    category: 'consistency',
    title: '训练一致性优先于复杂训练计划',
    statement:
      'ACSM 2026 公开摘要强调：从完全不训练转为任何形式的力量训练收益最大；坚持训练比复杂计划更重要，' +
      '多数周应至少 2 天覆盖主要肌群。',
    evidenceLevel: 'position-stand',
    applicability: '一般健康成人；不针对备赛、康复或特定运动表现的周期化安排。',
    source: ACSM_2026,
    limitations:
      '以上为公开新闻稿摘要的保守转述（完整立场声明为英文全文，未逐字引用）；' +
      '「开始阶段优先建立记录习惯」属于产品建议，不是来源结论。',
    reviewStatus: 'reviewed',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-EFFORT-001',
    category: 'progression',
    title: '一般健康成人不必每组都练到力竭',
    statement:
      'ACSM 2026 公开摘要指出：对一般健康成人，训练至暂时力竭（momentary muscle failure）、器械与自由重量的选择、' +
      '复杂周期化，对结果没有一致影响；因此不把「每组练到力竭」作为一般健康成人的必要条件。',
    evidenceLevel: 'position-stand',
    applicability: '一般健康成人力量/增肌训练；有训练经验或备赛需求者应另行个体化安排。',
    source: ACSM_2026,
    limitations:
      '公开摘要为群体层面结论，不排除个体差异。本条不给出具体 RIR / 保留次数区间：当前引用来源不足以直接支持具体数值，' +
      '因此本产品不将任何 RIR 目标作为证据化建议。',
    reviewStatus: 'reviewed',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-RECOV-001',
    category: 'recovery',
    title: '训练前热身（热身组另行标记，不计入正式训练量）',
    statement: '正式组前建议先进行低强度活动与轻重量热身组，让身体逐步进入训练状态（NHS 一般建议）。',
    evidenceLevel: 'guideline',
    applicability: '一般健康成人力量训练；不适用于医疗监督下的运动测试或康复训练。',
    source: NHS_WARMUP,
    limitations:
      'NHS 提供一般热身流程（时长与内容因个人与训练类型而异）；' +
      '「热身组不计入正式训练量（分析只统计 working 组）」是本应用的数据统计口径，不是来源原文。',
    reviewStatus: 'reviewed',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-MOB-001',
    category: 'mobility',
    title: '训练后温和活动与静态拉伸（低强度、无痛范围）',
    statement:
      '训练后可进行约 5 分钟的温和静态拉伸，每个动作保持约 15–20 秒，以轻微牵拉感为限；' +
      '出现疼痛、麻木、眩晕等异常感觉应立即停止。拉伸用于放松与活动度维持，不用于「修复」伤病。',
    evidenceLevel: 'guideline',
    applicability: '一般健康成人训练后放松；有伤病、关节问题或处于孕产期者请先咨询专业人士。',
    source: NHS_STRETCH,
    limitations:
      'NHS 页面建议拉伸 15–20 秒并给出了需要咨询专业人士的人群；本应用展示的拉伸条目不作为治疗手段，也不能替代康复评估。',
    reviewStatus: 'reviewed',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-SAFE-001',
    category: 'safety',
    title: '出现危险信号时停止训练并寻求专业医疗意见',
    statement:
      '训练中或训练后出现胸痛、胸闷、呼吸困难、气短、眩晕/头晕、麻木、异常疲劳、心悸、恶心、昏厥、受伤或明显关节疼痛等信号时，' +
      '应停止训练并寻求专业医疗意见；若症状持续、加重或伴随冷汗、意识改变，应立即呼叫急救。本应用不做诊断。',
    evidenceLevel: 'guideline',
    applicability: '所有使用本应用记录训练的人群；属于安全提示，不构成诊断、分诊或治疗建议。',
    source: NHS_CHEST_PAIN,
    limitations:
      'NHS 页面聚焦胸痛与心脏急症的识别；本规则把该安全原则保守扩展到训练场景中的其他危险信号，' +
      '具体原因必须由医疗专业人员评估。',
    reviewStatus: 'reviewed',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  },
  {
    id: 'E-DISCLAIM-001',
    category: 'safety',
    title: '不提供医疗诊断或康复处方',
    statement:
      '本应用仅用于训练记录与一般性运动参考信息展示，不构成医疗诊断、治疗、康复处方或个体化营养建议，' +
      '不能替代医生、物理治疗师或合格教练的评估。任何训练调整应结合自身健康状况；' +
      '如有疾病、伤病、孕产期或用药情况，请先咨询专业人士。',
    evidenceLevel: 'expert-consensus',
    applicability: '所有用户；产品合规声明。',
    source: PRODUCT_SOURCE('产品合规免责声明（非医学文献来源）'),
    limitations:
      '免责声明不能覆盖所有个体情况；如与专业医疗意见冲突，应以专业医疗意见为准。本声明为产品合规文案，非医学文献来源，待法务与内容复核。',
    reviewStatus: 'pending-review',
    reviewedAt: EVIDENCE_REVIEWED_AT,
    contentVersion: EVIDENCE_CONTENT_VERSION
  }
];

export const EVIDENCE_CATEGORY_LABELS = {
  frequency: '频率',
  volume: '训练量',
  progression: '渐进',
  consistency: '一致性',
  completeness: '数据完整度',
  recovery: '恢复与热身',
  safety: '安全',
  mobility: '放松与活动度'
};

export const EVIDENCE_LEVEL_LABELS = {
  guideline: '指南/官方建议',
  'position-stand': '专业学会立场声明',
  'systematic-review': '系统综述',
  'expert-consensus': '专家共识/产品口径'
};

export const REVIEW_STATUS_LABELS = {
  reviewed: '已审核',
  'pending-review': '待复核'
};

export const EVIDENCE_RULE_IDS = EVIDENCE_RULES.map((rule) => rule.id);

export const EVIDENCE_RULES_BY_ID = Object.fromEntries(EVIDENCE_RULES.map((rule) => [rule.id, rule]));

/** 取单条规则；不存在返回 null。 */
export function getRule(id) {
  return EVIDENCE_RULES_BY_ID[id] || null;
}

/** 按 id 数组批量取规则（过滤未知 id，保持传入顺序）。 */
export function getRules(ids = []) {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => getRule(id)).filter(Boolean);
}

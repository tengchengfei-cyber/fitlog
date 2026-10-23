/**
 * 下肢 / 臀部 / 核心 / 全身与体能动作数据（lower 片区）。
 *
 * 内容口径：
 * - 肌群标注是「动作通常涉及的肌群映射」，用于估计直接/间接训练暴露，不是肌电测量或精确剂量。
 * - 来源只填写可确认存在的公开教学页面；文字要领与占位示意图均为项目自编/自绘。
 * - 媒体素材原型阶段一律不外链、不下载第三方素材。
 */

const ACE_PUBLISHER = 'American Council on Exercise (ACE)';
const ACCESSED_AT = '2026-10-22';

const PROJECT_SOURCE = {
  label: '项目原型内容（基于公开动作教学共识自编）',
  url: null,
  publisher: '项目原型',
  publishedAt: '2026',
  accessedAt: ACCESSED_AT
};

function aceSource(label, url, publishedAt = '2026') {
  return { label, url, publisher: ACE_PUBLISHER, publishedAt, accessedAt: ACCESSED_AT };
}

function nhsSource(label, url, publishedAt) {
  return { label, url, publisher: 'NHS', publishedAt, accessedAt: ACCESSED_AT };
}

/** 文字降级媒体：图片/视频不可用时可独立阅读的动作要领。 */
function textMedia(id, title, description) {
  return {
    id: `media_${id}_text`,
    type: 'text',
    title,
    description,
    url: null,
    alt: `${title}文字说明`,
    status: 'available',
    license: 'project-original-placeholder',
    source: PROJECT_SOURCE,
    reviewNote: '文字降级动作要领为项目自编，确保图片或视频不可用时仍可独立阅读'
  };
}

/** 项目自绘占位示意图，正式示范素材待授权审核。 */
function imageMedia(id, title, alt) {
  return {
    id: `media_${id}_image`,
    type: 'image',
    title,
    description: `${alt}；项目自绘占位图，标注站位、器械与主要动作方向，正式示范图片待授权审核。`,
    url: null,
    alt,
    status: 'pending-review',
    license: 'project-original-placeholder',
    source: PROJECT_SOURCE,
    reviewNote: '原型阶段使用项目自绘占位示意图，正式示范图/视频待授权审核'
  };
}

export const lowerExercises = [
  // ============ 腿部 ============
  {
    id: 'barbell-squat',
    name: '杠铃深蹲',
    enName: 'Barbell Back Squat',
    aliasesZh: ['深蹲', '杠铃蹲', '颈后深蹲'],
    aliasesEn: ['barbell squat', 'back squat', 'bb squat'],
    pinyinFull: 'ganglingshendun',
    pinyinInitials: 'glsd',
    typoAliases: ['杠玲深蹲', '杠铃深蹬'],
    equipment: 'barbell',
    pattern: 'squat',
    difficulty: 'intermediate',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'adductors', 'erector-spinae'],
    unilateral: false,
    setup: [
      '将杠铃放在深蹲架上略低于肩部的位置，双手握距略宽于肩，杠铃置于斜方肌上部，不要压在颈椎上。',
      '夹紧肩胛、收紧核心，站起从架上取下杠铃后退一步；双脚约与肩同宽或略宽，脚尖自然外展 15-30 度。'
    ],
    execution: [
      '吸气收紧核心，同时屈髋屈膝下蹲，膝盖沿脚尖方向推开，保持大脚趾、小脚趾和脚跟三点踩实。',
      '下蹲至大腿至少与地面平行或略低，全程保持背部中立、胸部打开、脚跟不离地。',
      '呼气，脚掌发力蹬地，髋、膝同时伸展站起回到直立位，不要过度反弓下背。'
    ],
    breathing: [
      '下蹲前吸气并收紧核心，站起过程中呼气；大重量时可在动作完成后再调整呼吸。'
    ],
    commonMistakes: [
      '膝盖内扣或脚跟离地，重心前移到脚尖。',
      '下蹲时腰部先弯曲、骨盆后倾，失去背部中立。',
      '为了更大幅度而牺牲躯干稳定，重量超过当前控制能力。'
    ],
    safetyNotes: [
      '使用安全杠或在有保护者时挑战大重量；独自训练时不要盲目增加负荷。',
      '如出现膝、髋、腰部疼痛，或头晕、麻木等异常感觉，立即停止并咨询专业人士。',
      '先用自重或空杆掌握动作模式，再逐步增加重量。'
    ],
    alternatives: ['leg-press', 'goblet-squat'],
    notSuitable: [
      '近期膝、髋、腰部有明显疼痛或遵医嘱限制下肢负重者，不宜直接进行负重深蹲。',
      '平衡能力不足且没有保护条件时，可先选择高脚杯深蹲或腿举。'
    ],
    media: [
      textMedia(
        'barbell-squat',
        '杠铃深蹲 · 文字要领',
        '起始：杠铃放在斜方肌上部，双脚与肩同宽、脚尖略外展，核心收紧。下蹲：屈髋屈膝，膝盖沿脚尖方向打开，背部保持中立，蹲至大腿约与地面平行或略低，脚掌三点踩实。站起：脚掌蹬地，髋膝同时伸展回到直立。全程避免膝盖内扣、脚跟离地或腰部弯曲。'
      ),
      imageMedia('barbell-squat', '杠铃深蹲 · 动作轨迹示意（占位）', '杠铃深蹲站位与下蹲轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Back Squat 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/11/back-squat/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['腿部', '杠铃', '复合动作']
  },
  {
    id: 'goblet-squat',
    name: '高脚杯深蹲',
    enName: 'Goblet Squat',
    aliasesZh: ['高脚杯蹲', '杯式深蹲', '哑铃深蹲'],
    aliasesEn: ['goblet squat', 'dumbbell goblet squat'],
    pinyinFull: 'gaojiaobeishendun',
    pinyinInitials: 'gjbsd',
    typoAliases: ['高脚杯深敦', '高脚背深蹲'],
    equipment: 'dumbbell',
    pattern: 'squat',
    difficulty: 'beginner',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['adductors', 'hamstrings', 'erector-spinae'],
    unilateral: false,
    setup: [
      '双手捧住一只哑铃或壶铃的一端，贴靠胸前，肘部自然朝下。',
      '双脚略宽于肩，脚尖自然外展，躯干直立、核心收紧。'
    ],
    execution: [
      '吸气，屈髋屈膝下蹲，让肘部沿膝盖内侧下沉，保持胸口打开、背部中立。',
      '蹲至大腿约与地面平行或自身舒适深度，脚掌三点踩实。',
      '呼气站起，髋、膝同步伸展，重物始终贴近胸口。'
    ],
    breathing: ['下蹲时吸气，站起时呼气，全程保持核心张力。'],
    commonMistakes: [
      '重物离开胸口，导致躯干过度前倾。',
      '膝盖内扣或脚跟抬起，重心跑到脚尖。'
    ],
    safetyNotes: [
      '先选择能稳定控制 8-12 次的重量，再逐步增加。',
      '膝关节或腰部出现疼痛、麻木等异常感觉时停止动作并咨询专业人士。'
    ],
    alternatives: ['barbell-squat', 'leg-press'],
    notSuitable: [
      '膝或髋关节活动度明显受限者，应先在无痛范围内练习。'
    ],
    media: [
      textMedia(
        'goblet-squat',
        '高脚杯深蹲 · 文字要领',
        '起始：双手捧哑铃贴胸前，双脚略宽于肩、脚尖略外展。下蹲：屈髋屈膝，肘部沿膝盖内侧下沉，胸口打开、背部中立，蹲至大腿约与地面平行。站起：脚掌踩实，髋膝同步伸展，重物始终贴胸口。常见问题为躯干过度前倾和脚跟离地。'
      ),
      imageMedia('goblet-squat', '高脚杯深蹲 · 动作轨迹示意（占位）', '高脚杯深蹲持铃与下蹲轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Goblet Squat 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/362/goblet-squat/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['腿部', '哑铃', '入门']
  },
  {
    id: 'leg-press',
    name: '腿举',
    enName: 'Leg Press',
    aliasesZh: ['腿部推举', '蹬腿机', '坐姿腿举'],
    aliasesEn: ['leg press', 'seated leg press'],
    pinyinFull: 'tuiju',
    pinyinInitials: 'tj',
    typoAliases: ['退举', '腿聚'],
    equipment: 'machine',
    pattern: 'squat',
    difficulty: 'beginner',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'adductors'],
    unilateral: false,
    setup: [
      '调整座椅，使脚掌踩在踏板中部、膝关节弯曲约 90 度，腰背与臀部贴紧靠垫。',
      '双脚约与肩同宽，脚尖与膝盖朝向一致。'
    ],
    execution: [
      '呼气蹬起踏板，膝关节接近伸直但不要锁死。',
      '吸气，屈膝缓慢下放，控制到膝关节约 90 度或自身舒适范围。',
      '全程臀部与腰部不离开靠垫，膝盖与脚尖同向。'
    ],
    breathing: ['蹬起时呼气，下放时吸气，避免长时间屏息。'],
    commonMistakes: [
      '下放过深导致腰部离开靠垫、骨盆卷起。',
      '膝盖内扣或膝关节完全锁死。'
    ],
    safetyNotes: [
      '先调整好器械安全限位，避免下放时被重量压住。',
      '膝关节出现疼痛、卡顿或弹响伴随不适时，先减小幅度与重量。'
    ],
    alternatives: ['barbell-squat', 'leg-extension'],
    notSuitable: [
      '膝关节术后或处于急性疼痛期者，应遵医嘱再决定是否训练。'
    ],
    media: [
      textMedia(
        'leg-press',
        '腿举 · 文字要领',
        '起始：调整座椅，脚掌踩踏板中部，膝屈约 90 度，腰背贴紧靠垫。执行：呼气蹬起踏板，膝接近伸直但不锁死；吸气缓慢下放，控制到膝约 90 度。全程臀部、腰部不离开靠垫，膝盖与脚尖同向；常见问题是下放过深使骨盆卷起，或膝关节锁死。'
      ),
      imageMedia('leg-press', '腿举 · 器械轨迹示意（占位）', '腿举机坐姿与踏板蹬伸轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Seated Leg Press 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['腿部', '器械', '入门']
  },
  {
    id: 'bulgarian-split-squat',
    name: '保加利亚分腿蹲',
    enName: 'Bulgarian Split Squat',
    aliasesZh: ['保加利亚蹲', '分腿蹲', '保加分腿蹲'],
    aliasesEn: ['bulgarian split squat', 'rear foot elevated split squat', 'rfess'],
    pinyinFull: 'baojialiyafentuidun',
    pinyinInitials: 'bjlyftd',
    typoAliases: ['保加利亚分腿敦', '保佳利亚分腿蹲'],
    equipment: 'dumbbell',
    pattern: 'lunge',
    difficulty: 'intermediate',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['gluteus-medius', 'hamstrings', 'adductors'],
    unilateral: true,
    setup: [
      '背对训练凳站立，将一只脚的脚背放在凳上，支撑脚向前迈出约一步距离。',
      '双手各持一只哑铃自然下垂于体侧，躯干直立、核心收紧。'
    ],
    execution: [
      '吸气，屈前腿膝盖下蹲，后腿膝盖向地面方向下沉。',
      '前脚脚掌踩实，膝盖沿脚尖方向，下蹲至前腿大腿接近水平或自身舒适深度。',
      '呼气，前脚蹬地站起回到起始位，完成一侧后换边。'
    ],
    breathing: ['下蹲时吸气，站起时呼气，保持躯干稳定。'],
    commonMistakes: [
      '支撑脚离凳太近，导致前膝过度前移、重心不稳。',
      '躯干过度前倾或左右晃动。'
    ],
    safetyNotes: [
      '先徒手练习平衡，必要时扶墙或扶架；下蹲幅度以无痛为准。',
      '出现膝、髋疼痛或眩晕、麻木等感觉时立即停止。'
    ],
    alternatives: ['walking-lunge', 'goblet-squat'],
    notSuitable: [
      '平衡能力明显不足者，可先做支撑条件下的分腿蹲或箭步蹲。'
    ],
    media: [
      textMedia(
        'bulgarian-split-squat',
        '保加利亚分腿蹲 · 文字要领',
        '起始：背对训练凳，一只脚脚背搭在凳上，支撑脚向前迈出约一步，双手持哑铃自然下垂。下蹲：屈前腿膝盖，后膝向地面下沉，前脚踩实、膝盖沿脚尖方向，蹲至前腿大腿接近水平。站起：前脚蹬地回到起始位。常见问题是支撑脚离凳太近导致前膝过度前移，或躯干左右晃动。'
      ),
      imageMedia('bulgarian-split-squat', '保加利亚分腿蹲 · 站位示意（占位）', '保加利亚分腿蹲后脚搭凳与下蹲轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Bulgarian Split Squat 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/366/bulgarian-split-squat/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['腿部', '单腿', '哑铃']
  },
  {
    id: 'walking-lunge',
    name: '箭步蹲',
    enName: 'Walking Lunge',
    aliasesZh: ['行走箭步蹲', '弓步蹲', '箭步走'],
    aliasesEn: ['walking lunge', 'walking lunges', 'lunge'],
    pinyinFull: 'jianbudun',
    pinyinInitials: 'jbd',
    typoAliases: ['箭步敦', '健步蹲'],
    equipment: 'dumbbell',
    pattern: 'lunge',
    difficulty: 'beginner',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['gluteus-medius', 'hamstrings', 'adductors'],
    unilateral: true,
    setup: [
      '双手各持一只哑铃自然下垂于体侧，双脚并拢站立，躯干直立、核心收紧。',
      '选择平整、防滑的场地，预留向前迈步的空间。'
    ],
    execution: [
      '向前迈出一条腿，屈膝下蹲至前后腿膝盖均约 90 度。',
      '前脚脚掌踩实，后膝接近地面但不触地，躯干保持直立。',
      '前脚蹬地起身，后脚向前迈出进入下一次箭步，交替进行。'
    ],
    breathing: ['下蹲时吸气，起身时呼气，保持节奏均匀。'],
    commonMistakes: [
      '步幅过小导致前膝过度前移、脚跟抬起。',
      '身体左右晃动，或后膝重重砸向地面。'
    ],
    safetyNotes: [
      '先徒手掌握节奏再持重量；地面湿滑或空间不足时不要进行。',
      '膝关节疼痛或出现头晕、麻木等感觉时立即停止。'
    ],
    alternatives: ['bulgarian-split-squat', 'barbell-squat'],
    notSuitable: [
      '膝关节不稳或近期扭伤者，可先做原地分腿蹲并咨询专业人士。'
    ],
    media: [
      textMedia(
        'walking-lunge',
        '箭步蹲 · 文字要领',
        '起始：双手持哑铃自然下垂，双脚并拢站立，躯干直立、核心收紧。执行：向前迈一步并屈膝下蹲，前后膝均约 90 度，前脚踩实、后膝接近地面；前脚蹬地起身，后脚向前迈出进入下一次动作。常见问题是步幅过小导致前膝过度前移、脚跟抬起，或身体左右晃动。'
      ),
      imageMedia('walking-lunge', '箭步蹲 · 行进轨迹示意（占位）', '箭步蹲迈步与下蹲轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Walking Lunges 动作教学（含转体变式页面）', 'https://www.acefitness.org/resources/everyone/exercise-library/139/walking-lunges-with-twists/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['腿部', '单腿', '哑铃']
  },
  {
    id: 'leg-extension',
    name: '腿屈伸',
    enName: 'Leg Extension',
    aliasesZh: ['腿伸展机', '坐姿腿屈伸', '伸膝训练'],
    aliasesEn: ['leg extension', 'knee extension'],
    pinyinFull: 'tuiqushen',
    pinyinInitials: 'tqs',
    typoAliases: ['腿曲伸', '腿屈伸机'],
    equipment: 'machine',
    pattern: 'squat',
    difficulty: 'beginner',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['transverse-abdominis'],
    unilateral: false,
    setup: [
      '调整座椅与靠背，使膝关节转轴与器械转轴大致对齐，脚踝垫位于小腿下端。',
      '腰背贴紧靠背，双手握住把手，核心收紧。'
    ],
    execution: [
      '呼气，伸膝抬起小腿至膝关节接近伸直，顶端短暂停顿，不要锁死或甩动。',
      '吸气，缓慢屈膝下放，控制回到起始角度。'
    ],
    breathing: ['伸膝时呼气，下放时吸气，保持动作节奏平稳。'],
    commonMistakes: [
      '利用惯性甩起重量，臀部离开座椅。',
      '膝关节完全锁死并用力顶住。'
    ],
    safetyNotes: [
      '调整合适的起始角度与重量，避免超出膝关节舒适范围。',
      '膝关节出现疼痛、弹响伴随不适时停止并咨询专业人士。'
    ],
    alternatives: ['leg-press', 'barbell-squat'],
    notSuitable: [
      '膝关节术后或处于急性疼痛期者，应先遵医嘱评估。'
    ],
    media: [
      textMedia(
        'leg-extension',
        '腿屈伸 · 文字要领',
        '起始：调整座椅使膝关节转轴与器械转轴对齐，脚踝垫贴在小腿下端，腰背贴紧靠背。执行：呼气伸膝抬起小腿至接近伸直，顶端短暂停顿但不锁死；吸气缓慢下放回起始角度。常见问题是靠惯性甩重量、臀部离开座椅，或膝关节完全锁死。'
      ),
      imageMedia('leg-extension', '腿屈伸 · 器械轨迹示意（占位）', '腿屈伸机坐姿与小腿伸膝轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Standing Leg Extension 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/133/standing-leg-extension/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['腿部', '器械', '孤立动作']
  },
  {
    id: 'leg-curl',
    name: '腿弯举',
    enName: 'Leg Curl',
    aliasesZh: ['腿弯曲', '俯卧腿弯举', '腘绳肌弯举'],
    aliasesEn: ['leg curl', 'hamstring curl', 'lying leg curl'],
    pinyinFull: 'tuiwanju',
    pinyinInitials: 'twj',
    typoAliases: ['腿湾举', '腿弯举机'],
    equipment: 'machine',
    pattern: 'hinge',
    difficulty: 'beginner',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: ['gastrocnemius', 'transverse-abdominis'],
    unilateral: false,
    setup: [
      '俯卧或坐姿于器械，使膝关节转轴与器械转轴对齐，脚踝垫贴合小腿下端。',
      '髋部贴紧垫面，核心收紧，双手握住把手。'
    ],
    execution: [
      '呼气，屈膝将小腿拉向臀部，保持髋部不离开垫面。',
      '顶端短暂停顿，吸气缓慢伸膝还原，控制离心过程。'
    ],
    breathing: ['屈膝时呼气，还原时吸气，不要憋气。'],
    commonMistakes: [
      '髋部抬起，用腰部代偿发力。',
      '甩动重量，或还原阶段完全放松。'
    ],
    safetyNotes: [
      '先选择能稳定控制的重量，避免膝关节突然受力。',
      '腘绳肌出现抽痛、麻木或膝后侧疼痛时停止并咨询专业人士。'
    ],
    alternatives: ['romanian-deadlift', 'glute-bridge'],
    notSuitable: [
      '近期腘绳肌拉伤或膝关节后侧疼痛者，应在专业人士评估后再训练。'
    ],
    media: [
      textMedia(
        'leg-curl',
        '腿弯举 · 文字要领',
        '起始：俯卧或坐姿于器械，膝关节转轴与器械转轴对齐，脚踝垫贴小腿下端，髋部贴紧垫面。执行：呼气屈膝将小腿拉向臀部，髋部不离开垫面；顶端停顿后吸气缓慢伸膝还原。常见问题是髋部抬起用腰部代偿、甩重量或还原过快。'
      ),
      imageMedia('leg-curl', '腿弯举 · 器械轨迹示意（占位）', '腿弯举机俯卧与屈膝轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Prone Hamstrings Curl 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/131/prone-lying-hamstrings-curl/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['腿部', '器械', '腘绳肌']
  },
  {
    id: 'standing-calf-raise',
    name: '站姿提踵',
    enName: 'Standing Calf Raise',
    aliasesZh: ['小腿提踵', '站姿提脚跟', '提踵'],
    aliasesEn: ['standing calf raise', 'calf raise standing'],
    pinyinFull: 'zhanzitizhong',
    pinyinInitials: 'zztz',
    typoAliases: ['站姿提钟', '站姿题踵'],
    equipment: 'machine',
    pattern: 'calf-raise',
    difficulty: 'beginner',
    primaryMuscles: ['gastrocnemius'],
    secondaryMuscles: ['soleus'],
    unilateral: false,
    setup: [
      '在站姿提踵机上，肩部抵住肩垫，前脚掌踩在踏板边缘，脚跟悬空。',
      '膝关节自然伸直但不锁死，核心收紧、躯干直立。'
    ],
    execution: [
      '呼气，脚跟尽量向上抬起，在最高点短暂停顿。',
      '吸气，缓慢下放脚跟至低于踏板水平，感受小腿被拉长。'
    ],
    breathing: ['提踵时呼气，下放时吸气，保持节奏稳定。'],
    commonMistakes: [
      '借助膝关节弹动或身体上下晃动发力。',
      '动作幅度过小，只在中段小幅移动。'
    ],
    safetyNotes: [
      '下放时不要猛然拉伸到疼痛范围。',
      '跟腱或小腿出现疼痛、麻木等感觉时停止并咨询专业人士。'
    ],
    alternatives: ['seated-calf-raise', 'leg-press'],
    notSuitable: [
      '跟腱损伤或急性小腿疼痛者，应先咨询专业人士。'
    ],
    media: [
      textMedia(
        'standing-calf-raise',
        '站姿提踵 · 文字要领',
        '起始：站姿提踵机上肩部抵住肩垫，前脚掌踩踏板边缘、脚跟悬空，膝自然伸直但不锁死。执行：呼气抬起脚跟至最高点并短暂停顿，吸气缓慢下放脚跟至低于踏板水平。常见问题是靠膝部弹动或身体晃动借力，以及动作幅度过小。'
      ),
      imageMedia('standing-calf-raise', '站姿提踵 · 器械轨迹示意（占位）', '站姿提踵机肩垫支撑与提踵轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Standing Calf Raises – Wall 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/73/standing-calf-raises-wall/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['小腿', '器械', '提踵']
  },
  {
    id: 'seated-calf-raise',
    name: '坐姿提踵',
    enName: 'Seated Calf Raise',
    aliasesZh: ['坐姿提脚跟', '坐姿小腿提踵'],
    aliasesEn: ['seated calf raise', 'seated calf'],
    pinyinFull: 'zuozitizhong',
    pinyinInitials: 'zztz',
    typoAliases: ['坐姿提钟', '坐姿题踵'],
    equipment: 'machine',
    pattern: 'calf-raise',
    difficulty: 'beginner',
    primaryMuscles: ['soleus'],
    secondaryMuscles: ['gastrocnemius'],
    unilateral: false,
    setup: [
      '在坐姿提踵机上，前脚掌踩在踏板边缘，膝部上方压住负重垫。',
      '调整座椅高度使膝关节约呈 90 度，核心收紧。'
    ],
    execution: [
      '呼气，脚跟向上抬起至最高点，短暂停顿。',
      '吸气，缓慢下放脚跟至小腿被拉长，保持控制。'
    ],
    breathing: ['提踵时呼气，下放时吸气。'],
    commonMistakes: [
      '用大腿发力压垫，而不是小腿发力。',
      '动作幅度不足，或下放过快失去控制。'
    ],
    safetyNotes: [
      '从轻重量开始，避免膝盖或跟腱突然受力。',
      '小腿后侧出现疼痛、麻木等感觉时停止并咨询专业人士。'
    ],
    alternatives: ['standing-calf-raise', 'leg-curl'],
    notSuitable: [
      '跟腱损伤或小腿急性疼痛期，不应进行负重提踵。'
    ],
    media: [
      textMedia(
        'seated-calf-raise',
        '坐姿提踵 · 文字要领',
        '起始：坐姿提踵机上，前脚掌踩踏板边缘，膝部上方压住负重垫，膝关节约 90 度。执行：呼气抬起脚跟至最高点并短暂停顿，吸气缓慢下放至小腿被拉长。常见问题是用大腿压垫代偿、幅度不足或下放过快。'
      ),
      imageMedia('seated-calf-raise', '坐姿提踵 · 器械轨迹示意（占位）', '坐姿提踵机膝垫与提踵轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Calf Raise 动作教学（提踵类动作）', 'https://www.acefitness.org/resources/everyone/exercise-library/294/calf-raise/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['小腿', '器械', '比目鱼肌']
  },
  {
    id: 'hip-abduction-machine',
    name: '髋外展机',
    enName: 'Hip Abduction Machine',
    aliasesZh: ['髋外展', '坐姿髋外展', '髋外展训练机'],
    aliasesEn: ['hip abduction machine', 'abduction machine', 'hip abductor'],
    pinyinFull: 'kuanwaizhanji',
    pinyinInitials: 'kwzj',
    typoAliases: ['髋外展几', '宽外展机'],
    equipment: 'machine',
    pattern: 'hip-abduction',
    difficulty: 'beginner',
    primaryMuscles: ['gluteus-medius'],
    secondaryMuscles: ['transverse-abdominis'],
    unilateral: false,
    setup: [
      '坐在髋外展机上，调整挡板贴合大腿外侧，躯干贴紧靠背。',
      '双脚踩稳脚踏，核心收紧，双手握住把手。'
    ],
    execution: [
      '呼气，双腿向外推开挡板至舒适幅度，短暂停顿。',
      '吸气，缓慢并拢双腿还原，避免配重片撞击。'
    ],
    breathing: ['外展时呼气，还原时吸气。'],
    commonMistakes: [
      '身体前倾或左右晃动借力。',
      '幅度过大导致髋部不适，或还原时完全放松让配重砸下。'
    ],
    safetyNotes: [
      '先选择轻重量熟悉器械，全程保持骨盆稳定。',
      '髋部或膝关节出现疼痛、麻木等感觉时停止并咨询专业人士。'
    ],
    alternatives: ['glute-bridge', 'walking-lunge'],
    notSuitable: [
      '髋关节近期受伤或术后，应先遵医嘱评估。'
    ],
    media: [
      textMedia(
        'hip-abduction-machine',
        '髋外展机 · 文字要领',
        '起始：坐在髋外展机上，挡板贴合大腿外侧，躯干贴紧靠背，双脚踩稳、核心收紧。执行：呼气双腿向外推开挡板至舒适幅度并短暂停顿，吸气缓慢并拢还原。常见问题是身体前倾借力、幅度过大导致髋部不适，或还原时让配重砸下。'
      ),
      imageMedia('hip-abduction-machine', '髋外展机 · 器械轨迹示意（占位）', '髋外展机坐姿与双腿外展轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Side Lying Hip Abduction 动作教学（髋外展类动作）', 'https://www.acefitness.org/resources/everyone/exercise-library/38/side-lying-hip-abduction/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['臀部', '器械', '髋外展']
  },
  // ============ 臀部 / 髋 ============
  {
    id: 'barbell-hip-thrust',
    name: '杠铃臀推',
    enName: 'Barbell Hip Thrust',
    aliasesZh: ['臀推', '杠铃臀桥', '髋推'],
    aliasesEn: ['barbell hip thrust', 'hip thrust', 'bb hip thrust'],
    pinyinFull: 'ganglingtuntui',
    pinyinInitials: 'gltt',
    typoAliases: ['杠铃臀退', '杠玲臀推'],
    equipment: 'barbell',
    pattern: 'hip-extension',
    difficulty: 'intermediate',
    primaryMuscles: ['gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'quadriceps', 'adductors', 'transverse-abdominis'],
    unilateral: false,
    setup: [
      '背靠训练凳坐在地上，杠铃置于髋部上方并加负重垫缓冲，肩胛下缘抵住凳沿。',
      '双脚约与髋同宽，脚尖略外展，膝关节约 90 度，双手稳住杠铃。'
    ],
    execution: [
      '呼气，脚跟蹬地、收紧臀部，将髋部向上推起至躯干与大腿接近一条直线。',
      '顶端短暂停顿，避免腰椎过度伸展；吸气，缓慢下放髋部至接近地面但不完全放松。'
    ],
    breathing: ['上推时呼气，下放时吸气。'],
    commonMistakes: [
      '顶端用腰部反弓代替伸髋。',
      '脚跟离地、膝盖内扣，或下放过快失去控制。'
    ],
    safetyNotes: [
      '使用负重垫并确认杠铃稳定；先用自重臀桥掌握伸髋模式。',
      '髋部或腰部出现疼痛、麻木等感觉时停止并咨询专业人士。'
    ],
    alternatives: ['glute-bridge', 'romanian-deadlift'],
    notSuitable: [
      '髋关节或腰部近期受伤者，应先咨询专业人士。'
    ],
    media: [
      textMedia(
        'barbell-hip-thrust',
        '杠铃臀推 · 文字要领',
        '起始：背靠训练凳坐地，杠铃加垫置于髋部，肩胛下缘抵住凳沿，双脚与髋同宽、膝约 90 度。执行：脚跟蹬地、收紧臀部将髋部推起，直至躯干与大腿接近一条直线，顶端停顿但不反弓腰椎；吸气缓慢下放髋部至接近地面。常见问题是顶端用腰部反弓代替伸髋，以及脚跟离地、膝盖内扣。'
      ),
      imageMedia('barbell-hip-thrust', '杠铃臀推 · 动作轨迹示意（占位）', '杠铃臀推肩背靠凳与伸髋轨迹占位示意图')
    ],
    source: aceSource('ACE Certified™：Understanding the Barbell Hip Thrust（2019 年 11 月）', 'https://www.acefitness.org/continuing-education/certified/november-2019/7403/understanding-the-barbell-hip-thrust/', '2019-11'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['臀部', '杠铃', '伸髋']
  },
  {
    id: 'romanian-deadlift',
    name: '罗马尼亚硬拉',
    enName: 'Romanian Deadlift',
    aliasesZh: ['RDL', '罗马尼亚式硬拉'],
    aliasesEn: ['romanian deadlift', 'rdl'],
    pinyinFull: 'luomaniayingla',
    pinyinInitials: 'lmnyyl',
    typoAliases: ['罗马尼亚硬啦', '罗马尼压硬拉'],
    equipment: 'barbell',
    pattern: 'hinge',
    difficulty: 'intermediate',
    primaryMuscles: ['hamstrings', 'gluteus-maximus'],
    secondaryMuscles: ['erector-spinae', 'adductors', 'forearms'],
    unilateral: false,
    setup: [
      '双手约与肩同宽握住杠铃站立，双脚与髋同宽，膝关节微屈。',
      '收紧核心、肩胛微收，杠铃贴近大腿前侧。'
    ],
    execution: [
      '吸气，屈髋向后推臀，让杠铃沿腿部缓慢下放，膝关节只做微屈。',
      '下放至大腿后侧有明显牵拉感或杠铃到小腿中上部，同时保持背部中立。',
      '呼气，收紧臀部伸髋站起，回到直立位。'
    ],
    breathing: ['下放时吸气，站起时呼气。'],
    commonMistakes: [
      '用腰部弯曲代替屈髋，杠铃离开身体。',
      '下放过低导致背部失去中立。'
    ],
    safetyNotes: [
      '重量以能全程保持背部中立为前提，握力不足时可使用助力带。',
      '腰部或大腿后侧出现疼痛、麻木等感觉时停止并咨询专业人士。'
    ],
    alternatives: ['conventional-deadlift', 'leg-curl'],
    notSuitable: [
      '近期腰部或腘绳肌受伤者，应先咨询专业人士。'
    ],
    media: [
      textMedia(
        'romanian-deadlift',
        '罗马尼亚硬拉 · 文字要领',
        '起始：双手与肩同宽握杠站立，双脚与髋同宽、膝微屈，核心收紧、杠铃贴近大腿。执行：屈髋向后推臀，让杠铃贴腿缓慢下放，膝只微屈；下放至大腿后侧有明显牵拉感或杠铃到小腿中上部，同时保持背部中立。呼气伸髋站起。常见问题是腰部弯曲代替屈髋、杠铃离开身体。'
      ),
      imageMedia('romanian-deadlift', '罗马尼亚硬拉 · 动作轨迹示意（占位）', '罗马尼亚硬拉屈髋与杠铃贴腿轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Romanian Deadlift 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/317/romanian-deadlift/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['臀部', '杠铃', '髋铰链']
  },
  {
    id: 'conventional-deadlift',
    name: '硬拉',
    enName: 'Conventional Deadlift',
    aliasesZh: ['传统硬拉', '杠铃硬拉', '屈腿硬拉'],
    aliasesEn: ['deadlift', 'conventional deadlift'],
    pinyinFull: 'yingla',
    pinyinInitials: 'yl',
    typoAliases: ['硬啦', '硬拉动作'],
    equipment: 'barbell',
    pattern: 'hinge',
    difficulty: 'intermediate',
    primaryMuscles: ['erector-spinae', 'gluteus-maximus', 'hamstrings'],
    secondaryMuscles: ['quadriceps', 'trapezius-upper', 'forearms', 'latissimus-dorsi'],
    unilateral: false,
    setup: [
      '杠铃置于地面，双脚约与髋同宽，杠铃位于脚掌中部上方，小腿接近杠铃。',
      '屈髋屈膝下蹲握杠，双手约与肩同宽或略宽，背部中立、核心收紧、胸部打开。'
    ],
    execution: [
      '吸气收紧核心，脚掌蹬地，髋、膝同时伸展将杠铃拉离地面，杠铃贴近身体。',
      '站起时髋部向前推出、肩胛微收，避免腰部反弓。',
      '呼气，屈髋屈膝将杠铃沿腿部缓慢放回地面，保持背部中立。'
    ],
    breathing: [
      '起拉前吸气并收紧核心，站直后呼气；每次重复都重新建立核心张力。'
    ],
    commonMistakes: [
      '拉起时背部弯曲或耸肩过多。',
      '杠铃远离身体，增加腰部力矩。',
      '用腰部反弓代替髋部伸展。'
    ],
    safetyNotes: [
      '从空杆或轻重量开始学习动作，技术不确定时请教练指导。',
      '腰部出现疼痛、麻木、放射感，或头晕时立即停止并咨询专业人士。'
    ],
    alternatives: ['romanian-deadlift', 'sumo-deadlift'],
    notSuitable: [
      '腰部近期受伤或存在医生限制者，不宜进行硬拉。'
    ],
    media: [
      textMedia(
        'conventional-deadlift',
        '硬拉 · 文字要领',
        '起始：杠铃置于脚掌中部上方，双脚与髋同宽，屈髋屈膝握杠，背部中立、核心收紧、胸部打开。执行：脚掌蹬地，髋膝同时伸展将杠铃贴身上拉，站直时髋部前推、肩胛微收，不要反弓腰椎；随后屈髋屈膝沿腿缓慢下放杠铃。常见问题是背部弯曲、杠铃远离身体、用腰部反弓代替伸髋。'
      ),
      imageMedia('conventional-deadlift', '硬拉 · 动作轨迹示意（占位）', '硬拉起杠与髋膝伸展轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Deadlift 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/6/deadlift/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['全身', '杠铃', '髋铰链']
  },
  {
    id: 'sumo-deadlift',
    name: '相扑硬拉',
    enName: 'Sumo Deadlift',
    aliasesZh: ['相扑拉', '宽站距硬拉', '相扑式硬拉'],
    aliasesEn: ['sumo deadlift', 'wide stance deadlift'],
    pinyinFull: 'xiangpuyingla',
    pinyinInitials: 'xpyl',
    typoAliases: ['相扑硬啦', '相仆硬拉'],
    equipment: 'barbell',
    pattern: 'hinge',
    difficulty: 'intermediate',
    primaryMuscles: ['quadriceps', 'gluteus-maximus', 'adductors'],
    secondaryMuscles: ['hamstrings', 'erector-spinae', 'forearms'],
    unilateral: false,
    setup: [
      '双脚宽站距、脚尖外展约 30-45 度，杠铃位于脚掌中部上方。',
      '屈髋屈膝、髋部下沉，双手在膝盖内侧握杠，背部中立、核心收紧。'
    ],
    execution: [
      '吸气收紧核心，脚掌蹬地并让膝盖沿脚尖方向打开，髋、膝同时伸展拉起杠铃。',
      '站直时肩胛微收，不要过度后仰。',
      '呼气，屈髋屈膝沿腿部缓慢下放杠铃。'
    ],
    breathing: ['起拉前吸气并收紧核心，站直后呼气。'],
    commonMistakes: [
      '膝盖内扣，或髋部起得过快导致背部弯曲。',
      '站距过宽但髋部活动度不足，勉强下蹲。'
    ],
    safetyNotes: [
      '先确认髋部与内收肌活动度允许宽站距，再从轻重量开始。',
      '髋、膝或腰部疼痛，或出现麻木、眩晕时停止并咨询专业人士。'
    ],
    alternatives: ['conventional-deadlift', 'romanian-deadlift'],
    notSuitable: [
      '髋关节活动度不足或近期内收肌拉伤者，不宜直接进行相扑硬拉。'
    ],
    media: [
      textMedia(
        'sumo-deadlift',
        '相扑硬拉 · 文字要领',
        '起始：双脚宽站距、脚尖外展约 30-45 度，杠铃位于脚掌中部上方；屈髋屈膝、髋部下沉，双手在膝内握杠，背部中立。执行：脚掌蹬地，膝盖沿脚尖方向打开，髋膝同时伸展拉起杠铃，站直时肩胛微收、不过度后仰；随后沿腿缓慢下放。常见问题是膝盖内扣、髋部起得过快或站距超出活动度。'
      ),
      imageMedia('sumo-deadlift', '相扑硬拉 · 站位示意（占位）', '相扑硬拉宽站距与握杠轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Deadlift 动作教学（相扑式宽站距变式）', 'https://www.acefitness.org/resources/everyone/exercise-library/6/deadlift/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['全身', '杠铃', '髋铰链']
  },
  {
    id: 'glute-bridge',
    name: '臀桥',
    enName: 'Glute Bridge',
    aliasesZh: ['桥式', '仰卧臀桥', '臀桥推起'],
    aliasesEn: ['glute bridge', 'barbell glute bridge', 'bridge'],
    pinyinFull: 'tunqiao',
    pinyinInitials: 'tq',
    typoAliases: ['臀翘', '臀桥式'],
    equipment: 'bodyweight',
    pattern: 'hip-extension',
    difficulty: 'beginner',
    primaryMuscles: ['gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'transverse-abdominis'],
    unilateral: false,
    setup: [
      '仰卧屈膝，双脚约与髋同宽踩地，脚跟靠近臀部，双臂自然放在体侧。',
      '收紧核心、骨盆保持中立，下巴微收。'
    ],
    execution: [
      '呼气，脚跟蹬地并收紧臀部，将髋部抬离地面至躯干与大腿接近一条直线。',
      '顶端短暂停顿，避免腰部过度反弓；吸气缓慢下放髋部。'
    ],
    breathing: ['抬髋时呼气，下放时吸气。'],
    commonMistakes: [
      '用腰部反弓代替伸髋，或抬得过高。',
      '脚跟离地、膝盖内扣。'
    ],
    safetyNotes: [
      '颈部与肩部放松，避免用头部支撑身体。',
      '腰部出现疼痛、麻木等感觉时停止并咨询专业人士。'
    ],
    alternatives: ['barbell-hip-thrust', 'leg-curl'],
    notSuitable: [
      '腰部处于急性疼痛期者，应先咨询专业人士。'
    ],
    media: [
      textMedia(
        'glute-bridge',
        '臀桥 · 文字要领',
        '起始：仰卧屈膝，双脚与髋同宽踩地，脚跟靠近臀部，双手放体侧，核心收紧、骨盆中立。执行：呼气脚跟蹬地、收紧臀部将髋部抬起至躯干与大腿接近一条直线，顶端短暂停顿且不反弓腰椎；吸气缓慢下放。常见问题是用腰部反弓代替伸髋、抬得过高，或脚跟离地、膝盖内扣。'
      ),
      imageMedia('glute-bridge', '臀桥 · 动作轨迹示意（占位）', '臀桥仰卧屈膝与抬髋轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Glute Bridge 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['臀部', '自重', '伸髋']
  },
  // ============ 核心 ============
  {
    id: 'plank',
    name: '平板支撑',
    enName: 'Plank',
    aliasesZh: ['平板', '肘撑', '前臂支撑'],
    aliasesEn: ['plank', 'front plank'],
    pinyinFull: 'pingbanzhicheng',
    pinyinInitials: 'pbzc',
    typoAliases: ['平板支称', '平板支持'],
    equipment: 'bodyweight',
    pattern: 'core-anti-extension',
    difficulty: 'beginner',
    primaryMuscles: ['rectus-abdominis', 'transverse-abdominis'],
    secondaryMuscles: ['obliques', 'gluteus-maximus', 'anterior-deltoid'],
    unilateral: false,
    setup: [
      '俯卧，双脚并拢或与髋同宽，前臂撑地，肘部位于肩关节正下方。',
      '收紧核心与臀部，抬起身体使头、背、髋、踝大致呈一条直线。'
    ],
    execution: [
      '保持前臂下压地面、肩胛稳定，腹部收紧，正常呼吸。',
      '在姿势不变形的前提下维持目标时间，结束时先屈膝落地再起身。'
    ],
    breathing: ['保持均匀呼吸，不要长时间屏气。'],
    commonMistakes: [
      '塌腰或过度抬臀，使身体不成一条直线。',
      '耸肩、头部下垂，或憋气硬撑。'
    ],
    safetyNotes: [
      '以姿势不变形为停止标准，而不是盲目追求时长。',
      '腰部、肩部出现疼痛，或头晕、麻木时立即停止。'
    ],
    alternatives: ['side-plank', 'dead-bug'],
    notSuitable: [
      '肩部或腰部处于急性疼痛期者，可先选择跪姿或靠墙版本并咨询专业人士。'
    ],
    media: [
      textMedia(
        'plank',
        '平板支撑 · 文字要领',
        '起始：俯卧，前臂撑地，肘在肩正下方，双脚与髋同宽；收紧核心与臀部，抬起身体使头、背、髋、踝大致成一条直线。保持：前臂下压、肩胛稳定、均匀呼吸。常见问题是塌腰或抬臀过高、耸肩低头、憋气硬撑；以姿势不变形作为停止标准。'
      ),
      imageMedia('plank', '平板支撑 · 身体线条示意（占位）', '平板支撑前臂支撑与身体直线占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Front Plank 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/32/front-plank/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['核心', '自重', '抗伸展']
  },
  {
    id: 'crunch',
    name: '卷腹',
    enName: 'Crunch',
    aliasesZh: ['仰卧卷腹', '腹肌卷腹'],
    aliasesEn: ['crunch', 'ab crunch'],
    pinyinFull: 'juanfu',
    pinyinInitials: 'jf',
    typoAliases: ['卷复', '卷付'],
    equipment: 'bodyweight',
    pattern: 'core-flexion',
    difficulty: 'beginner',
    primaryMuscles: ['rectus-abdominis'],
    secondaryMuscles: ['obliques', 'hip-flexors'],
    unilateral: false,
    setup: [
      '仰卧屈膝，双脚踩地约与髋同宽，双手轻放耳侧或胸前。',
      '收紧核心，下巴微收，腰部自然贴近地面。'
    ],
    execution: [
      '呼气，用腹部力量将肩胛骨卷离地面，动作幅度小而可控。',
      '吸气缓慢还原，肩胛回到地面但不完全放松。'
    ],
    breathing: ['上卷时呼气，还原时吸气。'],
    commonMistakes: [
      '用手拉扯颈部或用力抱头。',
      '靠髋部屈曲把上身甩起，腰部离开地面。'
    ],
    safetyNotes: [
      '颈部保持中立，不要用力挤压下巴。',
      '颈部、腰部出现疼痛或麻木时停止并咨询专业人士。'
    ],
    alternatives: ['dead-bug', 'plank'],
    notSuitable: [
      '颈部近期受伤或腰部处于急性疼痛期者，应先咨询专业人士。'
    ],
    media: [
      textMedia(
        'crunch',
        '卷腹 · 文字要领',
        '起始：仰卧屈膝，双脚与髋同宽踩地，双手轻放耳侧或胸前，下巴微收。执行：呼气用腹部力量将肩胛骨卷离地面，幅度小而可控；吸气缓慢还原。常见问题是用手拉扯颈部、抱头用力，或靠髋部屈曲甩起上身使腰部离开地面。'
      ),
      imageMedia('crunch', '卷腹 · 动作轨迹示意（占位）', '卷腹仰卧屈膝与肩胛卷起轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Crunch 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/52/crunch/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['核心', '自重', '腹直肌']
  },
  {
    id: 'hanging-leg-raise',
    name: '悬垂举腿',
    enName: 'Hanging Leg Raise',
    aliasesZh: ['悬吊举腿', '单杠举腿', '垂悬抬腿'],
    aliasesEn: ['hanging leg raise', 'hanging knee raise', 'leg raise'],
    pinyinFull: 'xuanchuijutui',
    pinyinInitials: 'xcjt',
    typoAliases: ['悬垂举退', '悬垂举蹆'],
    equipment: 'pull-up-bar',
    pattern: 'core-flexion',
    difficulty: 'advanced',
    primaryMuscles: ['rectus-abdominis', 'hip-flexors'],
    secondaryMuscles: ['obliques', 'forearms', 'latissimus-dorsi'],
    unilateral: false,
    setup: [
      '双手正握单杠悬垂，肩胛微收、身体稳定，避免左右摆动。',
      '收紧核心，双腿自然并拢。'
    ],
    execution: [
      '呼气，用腹部与髋屈肌力量将双腿抬起；能力不足时先做屈膝举腿。',
      '吸气缓慢下放双腿，控制摆动回到悬垂位。'
    ],
    breathing: ['举腿时呼气，下放时吸气。'],
    commonMistakes: [
      '借助身体摆动甩腿，肩部失去稳定。',
      '下放过快，腰椎过度摆动。'
    ],
    safetyNotes: [
      '先掌握屈膝举腿与肩胛稳定，再尝试直腿版本。',
      '肩部、腰部疼痛或手部麻木时立即松杠落地并咨询专业人士。'
    ],
    alternatives: ['ab-wheel-rollout', 'plank'],
    notSuitable: [
      '肩部或握力不足、腰部疼痛者，可先做仰卧举腿等替代动作。'
    ],
    media: [
      textMedia(
        'hanging-leg-raise',
        '悬垂举腿 · 文字要领',
        '起始：双手正握单杠悬垂，肩胛微收、身体稳定不摆动，核心收紧。执行：用腹部与髋屈肌力量将双腿抬起，能力不足先做屈膝举腿；吸气缓慢下放并控制摆动。常见问题是借助身体摆动甩腿、肩部失去稳定、下放过快；肩、腰疼痛或手麻时立即停止。'
      ),
      imageMedia('hanging-leg-raise', '悬垂举腿 · 动作轨迹示意（占位）', '单杠悬垂与举腿轨迹占位示意图')
    ],
    source: nhsSource('NHS：腹肌训练视频课（核心训练与运动安全说明）', 'https://www.nhs.uk/live-well/exercise/strength-and-resistance/body-blast-abs/', '2023-12-08'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['核心', '单杠', '进阶']
  },
  {
    id: 'dead-bug',
    name: '死虫',
    enName: 'Dead Bug',
    aliasesZh: ['死虫式', '仰卧死虫', '对侧伸展'],
    aliasesEn: ['dead bug', 'deadbug'],
    pinyinFull: 'sichong',
    pinyinInitials: 'sc',
    typoAliases: ['死冲', '死虫式练腹'],
    equipment: 'bodyweight',
    pattern: 'core-anti-extension',
    difficulty: 'beginner',
    primaryMuscles: ['transverse-abdominis', 'rectus-abdominis'],
    secondaryMuscles: ['obliques', 'hip-flexors'],
    unilateral: false,
    setup: [
      '仰卧，双臂伸向天花板，髋、膝各屈约 90 度，小腿平行地面。',
      '收紧核心，让腰部轻贴地面，保持骨盆中立。'
    ],
    execution: [
      '呼气，缓慢伸出一侧手臂过头，同时对侧腿向前伸直，腰部不离开地面。',
      '吸气收回手臂与腿回到起始位，换另一侧交替进行。'
    ],
    breathing: ['伸展时呼气，收回时吸气。'],
    commonMistakes: [
      '腰部拱起离开地面。',
      '动作过快导致四肢失控或憋气。'
    ],
    safetyNotes: [
      '以腰部贴地为前提控制幅度，必要时只动腿或只动手。',
      '腰部出现疼痛、麻木时停止并咨询专业人士。'
    ],
    alternatives: ['plank', 'crunch'],
    notSuitable: [
      '腰部处于急性疼痛期或无法控制骨盆稳定者，应先咨询专业人士。'
    ],
    media: [
      textMedia(
        'dead-bug',
        '死虫 · 文字要领',
        '起始：仰卧，双臂伸向天花板，髋膝各屈约 90 度，小腿平行地面，腰部轻贴地面。执行：呼气缓慢伸出一侧手臂过头、同时对侧腿向前伸直，腰部保持贴地；吸气收回，换另一侧交替。常见问题是腰部拱起离开地面、动作过快导致失控或憋气。'
      ),
      imageMedia('dead-bug', '死虫 · 动作轨迹示意（占位）', '死虫仰卧对侧伸展轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Supine Dead Bug 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/147/supine-dead-bug/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['核心', '自重', '抗伸展']
  },
  {
    id: 'side-plank',
    name: '侧支撑',
    enName: 'Side Plank',
    aliasesZh: ['侧平板', '侧桥', '侧平板支撑'],
    aliasesEn: ['side plank', 'lateral plank'],
    pinyinFull: 'cezhicheng',
    pinyinInitials: 'czc',
    typoAliases: ['侧支称', '侧支掌'],
    equipment: 'bodyweight',
    pattern: 'core-anti-lateral',
    difficulty: 'beginner',
    primaryMuscles: ['obliques', 'transverse-abdominis'],
    secondaryMuscles: ['gluteus-medius', 'anterior-deltoid'],
    unilateral: true,
    setup: [
      '侧卧，前臂撑地，肘部位于肩关节正下方，双腿伸直叠放或前后错开。',
      '收紧核心与臀部，将髋部抬离地面，使身体呈一条直线。'
    ],
    execution: [
      '保持头部、躯干、髋部与腿部在一条直线上，正常呼吸并维持目标时间。',
      '结束时缓慢下放髋部，换另一侧重复。'
    ],
    breathing: ['保持均匀呼吸，不要憋气。'],
    commonMistakes: [
      '髋部下沉或身体前后倾倒。',
      '肩部塌陷，肘部没有位于肩关节正下方。'
    ],
    safetyNotes: [
      '以姿势稳定为前提，可先做屈膝版本降低难度。',
      '肩部、腰部出现疼痛，或手臂麻木时停止并咨询专业人士。'
    ],
    alternatives: ['plank', 'dead-bug'],
    notSuitable: [
      '肩部处于急性疼痛期或无法稳定支撑者，可先做靠墙侧支撑。'
    ],
    media: [
      textMedia(
        'side-plank',
        '侧支撑 · 文字要领',
        '起始：侧卧，前臂撑地、肘在肩正下方，双腿伸直叠放或前后错开；收紧核心与臀部，将髋部抬离地面使身体成一条直线。保持：头、躯干、髋、腿在一条直线上，均匀呼吸；结束时缓慢放下髋部换边。常见问题是髋部下沉、身体前后倾倒、肩部塌陷。'
      ),
      imageMedia('side-plank', '侧支撑 · 身体线条示意（占位）', '侧支撑前臂支撑与身体直线占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Side Plank with Straight Leg 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/101/side-plank-with-straight-leg/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['核心', '自重', '抗侧屈']
  },
  {
    id: 'ab-wheel-rollout',
    name: '健腹轮',
    enName: 'Ab Wheel Rollout',
    aliasesZh: ['腹肌轮', '健腹轮推展', '滚轮'],
    aliasesEn: ['ab wheel rollout', 'ab rollout', 'wheel rollout'],
    pinyinFull: 'jianfulun',
    pinyinInitials: 'jfl',
    typoAliases: ['健腹伦', '健复轮'],
    equipment: 'bodyweight',
    pattern: 'core-anti-extension',
    difficulty: 'advanced',
    primaryMuscles: ['rectus-abdominis', 'transverse-abdominis'],
    secondaryMuscles: ['latissimus-dorsi', 'anterior-deltoid', 'obliques'],
    unilateral: false,
    setup: [
      '跪姿，双手握住健腹轮把手置于膝前，肩部在手腕正上方，核心收紧。',
      '在软垫上进行，确保膝下有缓冲。'
    ],
    execution: [
      '吸气，缓慢向前滚出，保持腰部稳定、骨盆微后倾，身体尽量伸展。',
      '呼气，用腹部力量将轮子滚回起始位置，避免塌腰。'
    ],
    breathing: ['前推时吸气，回收时呼气。'],
    commonMistakes: [
      '前推时腰部塌陷、骨盆前倾。',
      '推得过远超出控制，肩部耸起。'
    ],
    safetyNotes: [
      '从短距离开始，每次只推到自己能控制的位置。',
      '腰部出现疼痛、麻木等感觉时立即停止并咨询专业人士。'
    ],
    alternatives: ['plank', 'dead-bug'],
    notSuitable: [
      '腰部或肩部近期受伤者，不宜直接进行健腹轮推展。'
    ],
    media: [
      textMedia(
        'ab-wheel-rollout',
        '健腹轮 · 文字要领',
        '起始：跪姿，双手握健腹轮把手置于膝前，肩在手腕正上方，核心收紧，膝下垫软垫。执行：吸气缓慢向前滚出，保持腰部稳定、骨盆微后倾；呼气用腹部力量滚回起始位置，避免塌腰。常见问题是前推时腰部塌陷、推得过远失去控制、肩部耸起；应从可控的短距离开始。'
      ),
      imageMedia('ab-wheel-rollout', '健腹轮 · 动作轨迹示意（占位）', '健腹轮跪姿推展与回收轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Roll Out 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/309/roll-out/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['核心', '进阶', '抗伸展']
  },
  {
    id: 'russian-twist',
    name: '俄罗斯转体',
    enName: 'Russian Twist',
    aliasesZh: ['俄式转体', '坐姿转体', '双侧转体'],
    aliasesEn: ['russian twist', 'seated twist'],
    pinyinFull: 'eluosizhuanti',
    pinyinInitials: 'elszt',
    typoAliases: ['俄罗斯转题', '俄罗丝转体'],
    equipment: 'bodyweight',
    pattern: 'core-flexion',
    difficulty: 'beginner',
    primaryMuscles: ['obliques', 'rectus-abdominis'],
    secondaryMuscles: ['transverse-abdominis', 'hip-flexors'],
    unilateral: false,
    setup: [
      '坐姿屈膝，双脚踩地或离地（按能力选择），躯干微微后倾。',
      '双手于胸前合拢或持轻重量，核心收紧，背部保持中立。'
    ],
    execution: [
      '呼气，由胸椎带动躯干向一侧转动，髋部尽量保持朝前。',
      '吸气回到中间，再转向另一侧，左右交替。'
    ],
    breathing: ['转动时呼气，回中时吸气。'],
    commonMistakes: [
      '只用手臂左右摆动，躯干没有真正转动。',
      '含胸驼背，或转动过快导致失衡。'
    ],
    safetyNotes: [
      '腰背不适时可双脚踩地并减小转动幅度。',
      '腰部或颈部出现疼痛、眩晕、麻木时停止并咨询专业人士。'
    ],
    alternatives: ['crunch', 'side-plank'],
    notSuitable: [
      '腰部处于急性疼痛期或平衡能力不足者，可先做扶支撑的站姿转体。'
    ],
    media: [
      textMedia(
        'russian-twist',
        '俄罗斯转体 · 文字要领',
        '起始：坐姿屈膝，双脚踩地或按能力离地，躯干微微后倾，双手于胸前合拢或持轻重量，背部中立。执行：呼气由胸椎带动躯干向一侧转动，髋部尽量朝前；吸气回到中间再转向另一侧。常见问题是只用手臂左右摆动、含胸驼背、转动过快失衡。'
      ),
      imageMedia('russian-twist', '俄罗斯转体 · 动作轨迹示意（占位）', '俄罗斯转体坐姿与躯干旋转轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Russian Twist 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/65/russian-twist/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['核心', '自重', '腹斜肌']
  },
  // ============ 全身 / 体能 ============
  {
    id: 'kettlebell-swing',
    name: '壶铃摇摆',
    enName: 'Kettlebell Swing',
    aliasesZh: ['壶铃摆荡', '壶铃摆动', '壶铃甩摆'],
    aliasesEn: ['kettlebell swing', 'kb swing', 'swing'],
    pinyinFull: 'hulingyaobai',
    pinyinInitials: 'hlyb',
    typoAliases: ['壶铃摇百', '壶铃遥摆'],
    equipment: 'kettlebell',
    pattern: 'hinge',
    difficulty: 'intermediate',
    primaryMuscles: ['gluteus-maximus', 'hamstrings'],
    secondaryMuscles: ['erector-spinae', 'transverse-abdominis', 'anterior-deltoid'],
    unilateral: false,
    setup: [
      '双脚略宽于肩站立，壶铃放在脚前约一脚距离，屈髋俯身双手握把。',
      '将壶铃向后拉到双腿之间，背部中立、核心收紧、肩胛微收。'
    ],
    execution: [
      '呼气，快速伸髋将壶铃向前摆起至约与胸同高，手臂放松、随惯性移动。',
      '吸气，让壶铃自然回落至双腿之间并屈髋缓冲，连续进行。'
    ],
    breathing: ['摆起时呼气，回落时吸气。'],
    commonMistakes: [
      '用手臂抬举壶铃，而不是用伸髋驱动。',
      '下背弯曲或过度伸展，壶铃摆得过高失去控制。'
    ],
    safetyNotes: [
      '先学习屈髋模式并从小重量开始，避免在疲劳时勉强完成。',
      '腰部出现疼痛、麻木或头晕时立即停止并咨询专业人士。'
    ],
    alternatives: ['romanian-deadlift', 'conventional-deadlift'],
    notSuitable: [
      '腰部近期受伤或无法稳定控制屈髋动作者，不宜进行壶铃摇摆。'
    ],
    media: [
      textMedia(
        'kettlebell-swing',
        '壶铃摇摆 · 文字要领',
        '起始：双脚略宽于肩，壶铃放在脚前约一脚距离，屈髋俯身握把，将壶铃拉向双腿之间，背部中立、核心收紧。执行：呼气快速伸髋将壶铃摆至约与胸同高，手臂放松随惯性移动；吸气让壶铃自然回落并屈髋缓冲，连续进行。常见问题是用手臂抬举而非伸髋驱动、下背弯曲或摆得过高失控。'
      ),
      imageMedia('kettlebell-swing', '壶铃摇摆 · 动作轨迹示意（占位）', '壶铃摇摆屈髋与摆起轨迹占位示意图')
    ],
    source: aceSource('ACE 健身动作库：Swing 动作教学', 'https://www.acefitness.org/resources/everyone/exercise-library/391/swing/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['全身', '壶铃', '髋铰链']
  },
  {
    id: 'farmer-carry',
    name: '农夫行走',
    enName: "Farmer's Carry",
    aliasesZh: ['农夫走', '负重行走', '农夫提'],
    aliasesEn: ['farmer carry', 'farmers carry', 'farmer walk'],
    pinyinFull: 'nongfuxingzou',
    pinyinInitials: 'nfxz',
    typoAliases: ['农夫行揍', '农付行走'],
    equipment: 'dumbbell',
    pattern: 'carry',
    difficulty: 'beginner',
    primaryMuscles: ['forearms', 'trapezius-upper'],
    secondaryMuscles: ['obliques', 'quadriceps', 'gluteus-medius'],
    unilateral: false,
    setup: [
      '双手各持一只哑铃或壶铃，站直、肩胛微收，核心收紧。',
      '选择足够长的直线空间，确认地面平整、无障碍物。'
    ],
    execution: [
      '以自然步幅向前行走，躯干保持直立，避免向一侧倾斜。',
      '保持均匀呼吸；握力接近极限或姿势变形时安全放下重物。'
    ],
    breathing: ['保持自然均匀呼吸，不要憋气。'],
    commonMistakes: [
      '身体向一侧倾斜，或耸肩过度。',
      '步幅过大、速度过快导致重心不稳。'
    ],
    safetyNotes: [
      '重量以能保持躯干直立为准，路面湿滑时不要进行。',
      '腰部、肩部或手臂出现疼痛、麻木时停止并咨询专业人士。'
    ],
    alternatives: ['kettlebell-swing'],
    notSuitable: [
      '握力明显不足或肩部、腰部处于急性疼痛期者，可先做徒手负重行走练习。'
    ],
    media: [
      textMedia(
        'farmer-carry',
        '农夫行走 · 文字要领',
        '起始：双手各持哑铃或壶铃，站直、肩胛微收、核心收紧，选择平整无障碍的直线空间。执行：自然步幅向前行走，躯干保持直立、不向一侧倾斜，保持均匀呼吸；握力接近极限或姿势变形时安全放下重物。常见问题是身体侧倾、耸肩过度、步幅过大导致重心不稳。'
      ),
      imageMedia('farmer-carry', '农夫行走 · 动作示意（占位）', '农夫行走双手持铃与直立行走姿势占位示意图')
    ],
    source: aceSource("ACE 健身动作库：Farmer's Carry 动作教学", 'https://www.acefitness.org/resources/everyone/exercise-library/359/farmer-s-carry/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['全身', '负重行走', '握力']
  },
  {
    id: 'rowing-machine',
    name: '划船机',
    enName: 'Rowing Machine',
    aliasesZh: ['室内划船', '划船器', '赛艇机'],
    aliasesEn: ['rowing machine', 'rower', 'indoor rowing'],
    pinyinFull: 'huachuanji',
    pinyinInitials: 'hcj',
    typoAliases: ['划船几', '滑船机'],
    equipment: 'cardio-machine',
    pattern: 'cardio',
    difficulty: 'beginner',
    primaryMuscles: ['latissimus-dorsi', 'quadriceps'],
    secondaryMuscles: ['rhomboids', 'biceps-brachii', 'hamstrings', 'erector-spinae'],
    unilateral: false,
    setup: [
      '调整脚绑带使前脚掌固定、脚跟可以活动；坐稳后双手握住把手。',
      '先把阻力调到低档，确认机器稳定、周围无妨碍。'
    ],
    execution: [
      '起始：屈膝、上身微前倾，手臂伸直。',
      '发力：先蹬腿带动身体后移，再轻拉把手至腹部附近，顺序为腿—髋—臂。',
      '还原：手臂先伸直，屈髋前倾，再屈膝回到起始位。'
    ],
    breathing: ['发力时呼气，还原时吸气，保持节奏均匀。'],
    commonMistakes: [
      '只用手臂拉，忽略蹬腿发力。',
      '含胸驼背或耸肩，节奏忽快忽慢。'
    ],
    safetyNotes: [
      '先以低阻力、短时间熟悉动作，再逐渐延长时间。',
      '腰部或膝关节疼痛，或出现胸闷、头晕、呼吸困难时立即停止并寻求专业意见。'
    ],
    alternatives: ['treadmill-walk-run', 'farmer-carry'],
    notSuitable: [
      '腰部近期受伤，或存在心血管疾病且未获医生许可者，应先咨询专业人士。'
    ],
    media: [
      textMedia(
        'rowing-machine',
        '划船机 · 文字要领',
        '起始：调整脚绑带固定前脚掌，坐稳握把，屈膝、上身微前倾、手臂伸直。发力：先蹬腿带动身体后移，再轻拉把手至腹部附近，顺序为腿—髋—臂。还原：手臂先伸直、屈髋前倾，再屈膝回到起始位。常见问题是只用手臂拉、含胸驼背耸肩、节奏忽快忽慢。'
      ),
      imageMedia('rowing-machine', '划船机 · 动作阶段示意（占位）', '划船机起始、发力、还原三个阶段占位示意图')
    ],
    source: aceSource('ACE 健身文章：室内划船训练与动作要点', 'https://www.acefitness.org/resources/everyone/blog/5881/reap-the-benefits-of-rowing-with-3-fast-and-efficient-workouts/'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['有氧', '器械', '全身']
  },
  {
    id: 'treadmill-walk-run',
    name: '跑步机走跑',
    enName: 'Treadmill Walk-Run',
    aliasesZh: ['跑步机', '跑步机快走', '跑步机慢跑'],
    aliasesEn: ['treadmill', 'treadmill walk', 'treadmill run'],
    pinyinFull: 'paobujizoupao',
    pinyinInitials: 'pbjzp',
    typoAliases: ['跑部机', '跑步机走炮'],
    equipment: 'cardio-machine',
    pattern: 'cardio',
    difficulty: 'beginner',
    primaryMuscles: ['quadriceps', 'hamstrings'],
    secondaryMuscles: ['gastrocnemius', 'gluteus-maximus', 'soleus'],
    unilateral: false,
    setup: [
      '穿稳定防滑的运动鞋，双脚先站在跑带两侧，扶稳扶手后开启机器。',
      '从低速开始，确认速度与坡度适合自己后再开始行走或慢跑。'
    ],
    execution: [
      '行走或慢跑时保持身体直立、目视前方，手臂自然摆动。',
      '逐步调整速度或坡度，结束时先减速再停机，待跑带完全停止后离开。'
    ],
    breathing: ['保持自然节奏的呼吸，必要时降低速度恢复。'],
    commonMistakes: [
      '一开始就使用过快速度，或边跑边低头看手机。',
      '突然变速、跳上跳下跑带，或全程紧握扶手导致姿势代偿。'
    ],
    safetyNotes: [
      '启动与停止时使用扶手和安全夹；疲劳或注意力不集中时降低速度。',
      '出现胸闷、胸痛、呼吸困难、头晕或异常疲劳时立即停止并寻求专业医疗意见。'
    ],
    alternatives: ['rowing-machine'],
    notSuitable: [
      '存在未控制的心血管疾病、近期胸痛或医生限制运动者，应先咨询专业人士。'
    ],
    media: [
      textMedia(
        'treadmill-walk-run',
        '跑步机走跑 · 文字要领',
        '准备：穿防滑运动鞋，先站在跑带两侧，扶稳扶手后启动机器，从低速开始。执行：保持身体直立、目视前方，手臂自然摆动；逐步调整速度或坡度，结束时先减速再停机。常见问题是一开始速度过快、边跑边看手机、突然变速或跳上跳下跑带，以及全程紧握扶手导致姿势代偿。'
      ),
      imageMedia('treadmill-walk-run', '跑步机走跑 · 器械示意（占位）', '跑步机站立位置、安全夹与走跑步态占位示意图')
    ],
    source: nhsSource('NHS：步行促进健康（Walking for health）', 'https://www.nhs.uk/live-well/exercise/walking-for-health/', '2022-12-15'),
    contentStatus: 'approved',
    contentVersion: '2026.10.1',
    updatedAt: '2026-10-22',
    tags: ['有氧', '器械', '心肺']
  }
];

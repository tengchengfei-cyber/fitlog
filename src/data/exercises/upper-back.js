// 上半身动作库 · 背部（10 个动作）
// 字段严格遵循 docs/CONTRACTS.md 3.2-3.6；由 upper.js 汇总导出。
// 内容来源：ACSM 2026 阻力训练立场更新公开摘要、NASM 动作库公开教学页（均已核验可访问）。
// 媒体规则：每个动作 1 条 text(available) + 1 条 image(pending-review, 项目占位)，url 一律 null。

export const CONTENT_VERSION = '2026.10.1';
export const UPDATED_AT = '2026-10-22';

const SOURCE_ACSM = {
  label: 'ACSM 2026 阻力训练立场更新（公开摘要）',
  url: 'https://acsm.org/resistance-training-guidelines-update-2026/',
  publisher: 'ACSM',
  publishedAt: '2026',
  accessedAt: '2026-10-22'
};

const SOURCE_NASM = {
  label: 'NASM 动作库（公开教学页）',
  url: 'https://www.nasm.org/resource-center/exercise-library',
  publisher: 'NASM',
  publishedAt: '未标注',
  accessedAt: '2026-10-22'
};

function makeExercise(fields, source, imageHint, videoHint) {
  const textDescription = `起始姿势：${fields.setup.join(' ')} 执行步骤：${fields.execution.join(' ')}`;
  const media = [
    {
      id: `media_${fields.id}_text`,
      type: 'text',
      title: `${fields.name} · 文字要领`,
      description: textDescription,
      url: null,
      status: 'available',
      license: 'project-original-placeholder',
      source,
      reviewNote: '文字要领为本项目编写，图片或视频不可用时作为降级内容阅读。'
    },
    {
      id: `media_${fields.id}_image`,
      type: 'image',
      title: `${fields.name} · 动作轨迹占位示意图`,
      description: `${imageHint}（原型阶段为占位示意图，正式示范图待授权审核）`,
      url: null,
      alt: `${fields.name}起始与结束位置占位示意图。${imageHint}`,
      status: 'pending-review',
      license: 'project-original-placeholder',
      source,
      reviewNote: '原型阶段使用项目自绘占位示意图，正式示范图待授权审核。'
    }
  ];
  if (videoHint) {
    media.push({
      id: `media_${fields.id}_video`,
      type: 'video',
      title: `${fields.name} · 示范视频占位`,
      description: `${videoHint}（原型阶段不提供真实视频，正式示范视频待授权审核）`,
      url: null,
      alt: videoHint,
      status: 'pending-review',
      license: 'project-original-placeholder',
      source,
      reviewNote: '原型阶段不提供真实视频文件，正式示范视频待授权审核。'
    });
  }
  return {
    ...fields,
    media,
    source,
    contentStatus: 'approved',
    contentVersion: CONTENT_VERSION,
    updatedAt: UPDATED_AT
  };
}

export const backExercises = [
  makeExercise({
    id: 'lat-pulldown',
    name: '高位下拉',
    enName: 'Lat Pulldown',
    aliasesZh: ['下拉机', '宽握下拉', '高位下拉器'],
    aliasesEn: ['lat pulldown', 'wide grip pulldown', 'lat pull down'],
    pinyinFull: 'gaoweixiala',
    pinyinInitials: 'gwxl',
    typoAliases: ['高位下啦', '高为下拉'],
    equipment: 'cable',
    pattern: 'vertical-pull',
    difficulty: 'beginner',
    primaryMuscles: ['latissimus-dorsi'],
    secondaryMuscles: ['biceps-brachii', 'rhomboids', 'trapezius-mid-lower'],
    unilateral: false,
    setup: [
      '调整坐垫高度，使大腿被压垫固定、双脚踩地；握距略宽于肩，正握横杆。',
      '坐稳后躯干略后倾 10 至 15 度，肩胛骨先向下收，核心收紧。'
    ],
    execution: [
      '呼气时先下沉肩胛，再屈肘把横杆拉向上胸，肘部朝身体两侧下方移动。',
      '横杆接近上胸时稍作停顿，感受背阔肌收紧。',
      '吸气缓慢回放至手臂接近伸直，肩胛不完全放松，再进入下一次。'
    ],
    breathing: ['下拉时呼气，回放时吸气，避免持续憋气。'],
    commonMistakes: [
      '把横杆拉到颈后，肩部被迫过度外旋。',
      '身体大幅后仰，用体重把重量甩下来。',
      '回放过快并耸肩，背阔肌失去张力。'
    ],
    safetyNotes: [
      '肩部前侧不适或肩袖有伤时，避免颈后下拉并减小重量。',
      '使用横杆时确认连接牢固，避免脱扣。'
    ],
    alternatives: ['assisted-pull-up', 'pull-up', 'straight-arm-pulldown'],
    notSuitable: ['肩关节上举活动度不足、无法舒适握杆时，可先做大角度斜拉或辅助引体。'],
    tags: ['背部', '垂直拉', '龙门架']
  }, SOURCE_NASM, '坐姿高位下拉，横杆从上方向锁骨与上胸位置拉下', '侧面机位展示肩胛下沉、躯干角度与横杆轨迹'),

  makeExercise({
    id: 'seated-cable-row',
    name: '坐姿绳索划船',
    enName: 'Seated Cable Row',
    aliasesZh: ['坐姿划船机', '坐姿划船', '低位划船'],
    aliasesEn: ['seated cable row', 'seated row', 'cable row'],
    pinyinFull: 'zuozishengsuohuachuan',
    pinyinInitials: 'zzsshc',
    typoAliases: ['坐姿绳索滑船'],
    equipment: 'cable',
    pattern: 'horizontal-pull',
    difficulty: 'beginner',
    primaryMuscles: ['latissimus-dorsi', 'rhomboids'],
    secondaryMuscles: ['biceps-brachii', 'trapezius-mid-lower', 'posterior-deltoid'],
    unilateral: false,
    setup: [
      '调整座椅与踏脚位置，使膝盖微屈、双脚踩稳踏板，躯干保持直立。',
      '双手握住把手，先让手臂伸直、肩胛自然前伸。'
    ],
    execution: [
      '呼气先收紧肩胛向后，再屈肘把把手拉向腹部，肘部贴近身体两侧。',
      '把手接近腹部时停顿约 1 秒，感受中背与背阔肌收紧。',
      '吸气缓慢回放，手臂伸直但肩胛不完全放松。'
    ],
    breathing: ['后拉时呼气，回放时吸气。'],
    commonMistakes: [
      '用腰部大幅前后摆动借力。',
      '耸肩，用斜方肌上束代偿。',
      '回放时把肩胛完全顶出去、失去控制。'
    ],
    safetyNotes: [
      '腰部有不适时减小重量并保持躯干稳定，不前后甩动。',
      '出现背部疼痛、麻木时停止动作并寻求专业医疗意见。'
    ],
    alternatives: ['barbell-row', 't-bar-row', 'one-arm-dumbbell-row'],
    notSuitable: ['坐姿下腰椎有不适者，可先使用胸支撑划船。'],
    tags: ['背部', '水平拉', '龙门架']
  }, SOURCE_NASM, '坐姿划船，把手从前方拉向腹部，肩胛先后缩再回放'),

  makeExercise({
    id: 'barbell-row',
    name: '杠铃俯身划船',
    enName: 'Barbell Row',
    aliasesZh: ['杠铃划船', '俯身划船', '俯身杠铃划船'],
    aliasesEn: ['barbell row', 'bent over row', 'bent-over barbell row'],
    pinyinFull: 'ganglingfushenhuachuan',
    pinyinInitials: 'glfshc',
    typoAliases: ['杠铃滑船'],
    equipment: 'barbell',
    pattern: 'horizontal-pull',
    difficulty: 'intermediate',
    primaryMuscles: ['latissimus-dorsi', 'rhomboids'],
    secondaryMuscles: ['biceps-brachii', 'trapezius-mid-lower', 'erector-spinae'],
    unilateral: false,
    setup: [
      '双脚与髋同宽站立，正握杠铃，握距略宽于肩。',
      '屈髋屈膝俯身，背部保持中立，杠铃位于膝盖下方，核心收紧。'
    ],
    execution: [
      '呼气时先收紧肩胛，再屈肘把杠铃拉向肚脐与下胸之间。',
      '顶端停顿，感受中背收紧；吸气缓慢下放至手臂伸直。',
      '全程保持躯干角度稳定，不靠起身甩动借力。'
    ],
    breathing: ['拉起时呼气，下放时吸气；负荷较大时保持核心张力。'],
    commonMistakes: [
      '弓背或抬头过度，腰椎失去中立位。',
      '用髋部上下弹动甩起杠铃。',
      '拉起时耸肩、肘部外展过多。'
    ],
    safetyNotes: [
      '以能保持背部中立位的重量为准，优先关注动作质量。',
      '腰部出现疼痛、麻木时立即停止并寻求专业医疗意见。'
    ],
    alternatives: ['t-bar-row', 'seated-cable-row', 'one-arm-dumbbell-row'],
    notSuitable: ['腰部疲劳累积较多或当天已做硬拉时，可改用胸支撑划船。'],
    tags: ['背部', '水平拉', '杠铃']
  }, SOURCE_ACSM, '屈髋俯身，杠铃从膝盖下方拉向肚脐与下胸之间'),

  makeExercise({
    id: 'one-arm-dumbbell-row',
    name: '哑铃单臂划船',
    enName: 'One-Arm Dumbbell Row',
    aliasesZh: ['单臂哑铃划船', '单臂划船', '哑铃单手划船'],
    aliasesEn: ['one-arm dumbbell row', 'single-arm dumbbell row', 'dumbbell row'],
    pinyinFull: 'yalingdanbihuachuan',
    pinyinInitials: 'yldbhc',
    typoAliases: ['单臂哑铃滑船'],
    equipment: 'dumbbell',
    pattern: 'horizontal-pull',
    difficulty: 'beginner',
    primaryMuscles: ['latissimus-dorsi'],
    secondaryMuscles: ['rhomboids', 'biceps-brachii', 'posterior-deltoid'],
    unilateral: true,
    setup: [
      '一侧手与膝盖支撑在平板凳上，另一侧脚踩地，背部保持中立。',
      '对侧手持哑铃自然下垂，肩胛骨先向下收，核心收紧。'
    ],
    execution: [
      '呼气时以肘部带动，把哑铃拉向髋部一侧，肘部贴近身体。',
      '顶端停顿，感受背阔肌收紧；吸气缓慢下放至手臂伸直。',
      '完成规定次数后换另一侧，保持两侧动作幅度一致。'
    ],
    breathing: ['拉起时呼气，下放时吸气。'],
    commonMistakes: [
      '身体向支撑侧旋转借力。',
      '耸肩，肘部抬得过高。',
      '只用手臂拉，没有先收紧肩胛。'
    ],
    safetyNotes: [
      '支撑手位置以肩下方为准，避免腰部扭转。',
      '腰部或肩部出现疼痛时停止动作并寻求专业医疗意见。'
    ],
    alternatives: ['chest-supported-row', 'seated-cable-row', 'barbell-row'],
    notSuitable: ['腰部或手腕在支撑位有不适时，可改用胸支撑划船。'],
    tags: ['背部', '单侧', '哑铃']
  }, SOURCE_NASM, '单膝单手撑凳，另一手持哑铃从下方拉向髋部一侧'),

  makeExercise({
    id: 'chest-supported-row',
    name: '俯卧斜板划船',
    enName: 'Chest-Supported Row',
    aliasesZh: ['上斜板哑铃划船', '胸支撑划船', '俯卧划船'],
    aliasesEn: ['chest supported row', 'incline bench dumbbell row'],
    pinyinFull: 'fuwoxiebanhuachuan',
    pinyinInitials: 'fwxbhc',
    typoAliases: ['胸支撑滑船'],
    equipment: 'dumbbell',
    pattern: 'horizontal-pull',
    difficulty: 'beginner',
    primaryMuscles: ['latissimus-dorsi', 'rhomboids'],
    secondaryMuscles: ['biceps-brachii', 'trapezius-mid-lower'],
    unilateral: false,
    setup: [
      '将训练凳靠背调至约 30 至 45 度，俯卧在凳上，胸口贴紧靠垫。',
      '双手各持哑铃自然下垂，肩胛骨先向下收，双脚踩地稳定身体。'
    ],
    execution: [
      '呼气时收紧肩胛，屈肘把哑铃拉向腰侧，肘部沿身体两侧向后。',
      '顶端停顿，感受中背收紧；吸气缓慢下放至手臂伸直。',
      '保持胸部贴垫，不抬起躯干借力。'
    ],
    breathing: ['拉起时呼气，下放时吸气。'],
    commonMistakes: [
      '胸口离开靠垫，用腰部发力。',
      '耸肩，把哑铃拉向肩膀方向。',
      '下放速度过快，肩胛失去控制。'
    ],
    safetyNotes: [
      '靠垫角度以胸口舒适贴紧为准，避免颈部过度后仰。',
      '肩部不适时减小重量并缩短顶端停顿。'
    ],
    alternatives: ['one-arm-dumbbell-row', 'seated-cable-row', 'barbell-row'],
    notSuitable: ['胸口贴垫时有压迫不适感时，可改用坐姿划船。'],
    tags: ['背部', '水平拉', '哑铃']
  }, SOURCE_NASM, '俯卧上斜凳，哑铃从下方拉向腰侧，胸口保持贴垫'),

  makeExercise({
    id: 'pull-up',
    name: '引体向上',
    enName: 'Pull-up',
    aliasesZh: ['引体', '正手引体向上', '宽握引体向上'],
    aliasesEn: ['pull-up', 'pullup', 'overhand pull-up'],
    pinyinFull: 'yintixiangshang',
    pinyinInitials: 'ytxs',
    typoAliases: ['引体想上'],
    equipment: 'pull-up-bar',
    pattern: 'vertical-pull',
    difficulty: 'intermediate',
    primaryMuscles: ['latissimus-dorsi'],
    secondaryMuscles: ['biceps-brachii', 'rhomboids', 'trapezius-mid-lower'],
    unilateral: false,
    setup: [
      '双手正握单杠，握距略宽于肩，手臂伸直、肩胛骨下沉。',
      '身体自然悬垂，核心收紧，双腿并拢或微屈，避免前后摆动。'
    ],
    execution: [
      '呼气时先收紧肩胛向下，再屈肘把身体拉起，至下巴超过横杠。',
      '顶端短暂停顿，吸气控制身体下放至手臂接近伸直。',
      '无法完成完整次数时，可先做辅助引体或只做离心下放。'
    ],
    breathing: ['上拉时呼气，下放时吸气。'],
    commonMistakes: [
      '利用摆荡惯性甩上去。',
      '耸肩、只用手臂拉，背阔肌参与不足。',
      '下放时直接松劲坠落。'
    ],
    safetyNotes: [
      '确认单杠固定牢固，下方有足够空间。',
      '肩部疼痛、麻木或肘部不适时停止并寻求专业医疗意见。'
    ],
    alternatives: ['assisted-pull-up', 'lat-pulldown', 'straight-arm-pulldown'],
    notSuitable: ['当前无法完成至少 1 次标准引体时，可先使用辅助引体或高位下拉。'],
    tags: ['背部', '垂直拉', '自重']
  }, SOURCE_ACSM, '正握单杠，身体从悬垂位拉起至下巴超过横杠，再控制下放'),

  makeExercise({
    id: 'assisted-pull-up',
    name: '辅助引体向上',
    enName: 'Assisted Pull-up',
    aliasesZh: ['助力引体向上', '辅助引体', '器械辅助引体'],
    aliasesEn: ['assisted pull-up', 'assisted pullup', 'machine assisted pull-up'],
    pinyinFull: 'fuzhuyintixiangshang',
    pinyinInitials: 'fzytxs',
    typoAliases: ['辅助引体想上'],
    equipment: 'machine',
    pattern: 'vertical-pull',
    difficulty: 'beginner',
    primaryMuscles: ['latissimus-dorsi'],
    secondaryMuscles: ['biceps-brachii', 'rhomboids'],
    unilateral: false,
    setup: [
      '调整辅助配重：配重越大，辅助越强；选择能完成目标次数的档位。',
      '双膝或双脚放在辅助垫或踏板上，双手正握把手，肩胛骨下沉。'
    ],
    execution: [
      '呼气收紧肩胛并屈肘上拉，至下巴接近或超过把手高度。',
      '顶端停顿，吸气控制身体回到起始位置。',
      '随着力量提升逐步减小辅助配重，保持动作幅度一致。'
    ],
    breathing: ['上拉时呼气，下放时吸气。'],
    commonMistakes: [
      '辅助配重过大，动作几乎不需要用力。',
      '依赖器械垫托身体，核心松散。',
      '下放时速度过快。'
    ],
    safetyNotes: [
      '上机前确认辅助配重插销到位；离开时把配重归位。',
      '肩肘不适时停止动作并寻求专业医疗意见。'
    ],
    alternatives: ['lat-pulldown', 'pull-up', 'straight-arm-pulldown'],
    notSuitable: ['器械尺寸与身高不匹配时，可先做高位下拉积累力量。'],
    tags: ['背部', '垂直拉', '器械辅助']
  }, SOURCE_NASM, '辅助引体器械，身体在辅助垫支撑下完成上拉与下放'),

  makeExercise({
    id: 'straight-arm-pulldown',
    name: '直臂下压',
    enName: 'Straight-Arm Pulldown',
    aliasesZh: ['直臂下拉', '绳索直臂下压'],
    aliasesEn: ['straight-arm pulldown', 'straight arm pull-down'],
    pinyinFull: 'zhibixiaya',
    pinyinInitials: 'zbxy',
    typoAliases: ['直臂下呀'],
    equipment: 'cable',
    pattern: 'vertical-pull',
    difficulty: 'beginner',
    primaryMuscles: ['latissimus-dorsi'],
    secondaryMuscles: ['triceps-brachii', 'posterior-deltoid', 'rectus-abdominis'],
    unilateral: false,
    setup: [
      '面对高位滑轮站立，双手与肩同宽握住直杆或绳索，手臂伸直、肘部微屈。',
      '后退半步让绳索有张力，躯干略前倾，核心收紧。'
    ],
    execution: [
      '呼气时以肩为轴把杆向下压至大腿前侧，手臂保持接近伸直。',
      '底部停顿，感受背阔肌收紧；吸气缓慢回到起始位置。',
      '全程保持躯干角度稳定，不向前俯身借力。'
    ],
    breathing: ['下压时呼气，回放时吸气。'],
    commonMistakes: [
      '屈肘把动作变成三头下压。',
      '身体大幅前倾，用体重压杆。',
      '重量过大导致肩部耸起。'
    ],
    safetyNotes: [
      '重量以能保持手臂稳定、肩胛可控为准。',
      '肩部出现疼痛或不适时停止并寻求专业医疗意见。'
    ],
    alternatives: ['lat-pulldown', 'assisted-pull-up'],
    notSuitable: ['肩关节屈伸活动度不足时，可减小幅度并降低重量。'],
    tags: ['背部', '背阔肌', '孤立']
  }, SOURCE_NASM, '面对高位滑轮，手臂接近伸直，把杆从肩前压向大腿前侧'),

  makeExercise({
    id: 't-bar-row',
    name: 'T杠划船',
    enName: 'T-Bar Row',
    aliasesZh: ['T字划船', 'T杆划船', '地雷管划船'],
    aliasesEn: ['t-bar row', 't bar row', 'landmine row'],
    pinyinFull: 'tganghuachuan',
    pinyinInitials: 'tghc',
    typoAliases: ['T杠滑船'],
    equipment: 'machine',
    pattern: 'horizontal-pull',
    difficulty: 'intermediate',
    primaryMuscles: ['latissimus-dorsi', 'rhomboids'],
    secondaryMuscles: ['biceps-brachii', 'trapezius-mid-lower', 'erector-spinae'],
    unilateral: false,
    setup: [
      '双脚站在 T 杠两侧或踏板上，屈髋俯身握住把手，背部保持中立。',
      '肩胛骨放松下沉，核心收紧，确认杠铃片一端固定稳定。'
    ],
    execution: [
      '呼气时收紧肩胛，屈肘把把手拉向上腹部，肘部贴近身体。',
      '顶端停顿，感受中背收紧；吸气缓慢下放至手臂伸直。',
      '保持躯干角度稳定，用背部而不是髋部弹动完成动作。'
    ],
    breathing: ['拉起时呼气，下放时吸气。'],
    commonMistakes: [
      '弓背或腰部过度反弓。',
      '起身借力，把划船做成硬拉。',
      '拉起时耸肩。'
    ],
    safetyNotes: [
      '重量过大容易让腰部代偿，优先控制动作行程。',
      '腰部或肩部出现疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['barbell-row', 'seated-cable-row', 'chest-supported-row'],
    notSuitable: ['腰部在俯身位有不适时，可改用胸支撑划船或坐姿划船。'],
    tags: ['背部', '水平拉', '器械']
  }, SOURCE_ACSM, '屈髋俯身握住 T 杠把手，把重量拉向上腹部'),

  makeExercise({
    id: 'shrug',
    name: '杠铃耸肩',
    enName: 'Barbell Shrug',
    aliasesZh: ['耸肩', '站姿耸肩'],
    aliasesEn: ['barbell shrug', 'shrug'],
    pinyinFull: 'ganglingsongjian',
    pinyinInitials: 'glsj',
    typoAliases: ['杠铃耸兼'],
    equipment: 'barbell',
    pattern: 'vertical-pull',
    difficulty: 'beginner',
    primaryMuscles: ['trapezius-upper'],
    secondaryMuscles: ['trapezius-mid-lower', 'forearms'],
    unilateral: false,
    setup: [
      '双脚与髋同宽站立，正握杠铃置于大腿前侧，握距略宽于肩。',
      '挺胸收腹，手臂自然伸直，肩部放松下沉。'
    ],
    execution: [
      '呼气时双肩垂直向上耸起，尽量靠近耳朵，肘部保持伸直。',
      '顶端停顿约 1 秒，感受斜方肌上束收紧。',
      '吸气缓慢下放肩部至起始位置，不用屈肘提拉。'
    ],
    breathing: ['耸肩时呼气，下放时吸气。'],
    commonMistakes: [
      '耸肩时前后绕圈，肩关节负担增加。',
      '屈肘把杠铃提起，变成弯举。',
      '重量过大导致身体前后晃动。'
    ],
    safetyNotes: [
      '肩颈区域不适或疼痛时停止动作并寻求专业医疗意见。',
      '使用杠铃时确保周围有足够空间，避免碰撞身体。'
    ],
    alternatives: ['face-pull', 'bent-over-reverse-fly'],
    notSuitable: ['颈椎或肩部有急性疼痛时不适合负重耸肩。'],
    tags: ['背部', '斜方肌', '耸肩']
  }, SOURCE_NASM, '站姿持杠铃，双肩垂直向上耸起靠近耳朵，再缓慢下放')
];

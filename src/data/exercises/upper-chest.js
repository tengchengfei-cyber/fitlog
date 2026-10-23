// 上半身动作库 · 胸部（10 个动作）
// 字段严格遵循 docs/CONTRACTS.md 3.2-3.6；由 upper.js 汇总导出。
// 内容来源：ACSM 2026 阻力训练立场更新公开摘要（已核验可访问）。
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

const SOURCE_NHS = {
  label: 'NHS 力量练习指导（公开页面）',
  url: 'https://www.nhs.uk/live-well/exercise/strength-exercises/',
  publisher: 'NHS',
  publishedAt: '2024',
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

export const chestExercises = [
  makeExercise({
    id: 'barbell-bench-press',
    name: '杠铃卧推',
    enName: 'Barbell Bench Press',
    aliasesZh: ['卧推', '平板卧推', '杠铃平板卧推'],
    aliasesEn: ['barbell bench press', 'flat bench press', 'bench press'],
    pinyinFull: 'ganglingwotui',
    pinyinInitials: 'glwt',
    typoAliases: ['杠铃卧退', '杠玲卧推'],
    equipment: 'barbell',
    pattern: 'horizontal-push',
    difficulty: 'intermediate',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid', 'triceps-brachii', 'serratus-anterior'],
    unilateral: false,
    setup: [
      '仰卧在平板凳上，双眼位于杠铃正下方，肩胛骨向后向下收拢并贴紧凳面。',
      '双脚踩实地面，膝盖约呈 90 度；握距略宽于肩，手腕保持中立，杠铃落在掌根。'
    ],
    execution: [
      '吸气收紧核心，与同伴或保护架配合将杠铃移出深蹲架，稳定在肩关节正上方。',
      '控制杠铃下放，肘部与躯干约呈 45 至 75 度，杠铃轻触胸骨中下部。',
      '稍作停顿后，沿略向斜后上方的轨迹推起，回到起始位置，顶端不完全锁死肘部。'
    ],
    breathing: ['下放时吸气，推起时呼气；大重量时可先吸气收紧、通过最难位置后再呼气。'],
    commonMistakes: [
      '臀部离开凳面，用腰部过度反弓借力。',
      '肘部完全外展到 90 度，压力集中在肩关节前侧。',
      '下放速度过快，让杠铃触碰胸部后弹起。'
    ],
    safetyNotes: [
      '大重量训练使用保护架或请同伴保护，训练前确认卡扣已固定。',
      '肩、肘或手腕出现疼痛、麻木时停止该动作并寻求专业医疗意见。'
    ],
    alternatives: ['dumbbell-bench-press', 'smith-machine-bench-press', 'push-up'],
    notSuitable: [
      '肩部活动度明显受限或推举末端有疼痛时，可先尝试哑铃卧推并缩小幅度。',
      '近期有肩袖或肘部伤病且未获得医生许可时，不建议进行大重量卧推。'
    ],
    tags: ['胸部', '水平推', '杠铃']
  }, SOURCE_ACSM, '仰卧平板凳，杠铃从上胸位置沿略斜向后上的轨迹推起至肩关节上方', '正面与侧面机位展示杠铃轨迹、肩胛稳定与触胸位置'),

  makeExercise({
    id: 'incline-barbell-bench-press',
    name: '上斜杠铃卧推',
    enName: 'Incline Barbell Bench Press',
    aliasesZh: ['上斜卧推', '上斜板卧推'],
    aliasesEn: ['incline barbell bench press', 'incline bench press'],
    pinyinFull: 'shangxieganglingwotui',
    pinyinInitials: 'sxglwt',
    typoAliases: ['上斜杠铃卧退'],
    equipment: 'barbell',
    pattern: 'horizontal-push',
    difficulty: 'intermediate',
    primaryMuscles: ['pectoralis-major', 'anterior-deltoid'],
    secondaryMuscles: ['triceps-brachii', 'serratus-anterior'],
    unilateral: false,
    setup: [
      '将靠背调至约 30 至 45 度，坐稳后仰卧，臀部与上背贴紧凳面。',
      '握距略宽于肩，肩胛骨收紧下沉，双脚踩实地面。'
    ],
    execution: [
      '将杠铃从架上移出，稳定在锁骨与上胸正上方。',
      '控制下放至杠铃轻触上胸（锁骨下方），肘部略低于躯干平面即可。',
      '沿略向后上的轨迹推起至接近伸直，保持肩胛稳定。'
    ],
    breathing: ['下放时吸气，推起时呼气，避免在最高点长时间憋气。'],
    commonMistakes: [
      '靠背角度超过 60 度，动作变成坐姿肩推。',
      '杠铃下放位置过低到中胸，肩前侧压力增大。',
      '借助腰部反弓把杠铃顶起。'
    ],
    safetyNotes: [
      '上斜角度增加时肩部受力方向改变，重量应比平板卧推更保守。',
      '使用保护架或同伴，避免杠铃压到颈部与面部。'
    ],
    alternatives: ['incline-dumbbell-bench-press', 'dumbbell-bench-press', 'machine-chest-press'],
    notSuitable: [
      '肩前侧在推举末端有不适时，可先改用哑铃或器械上斜推胸。',
      '肩关节活动度不足时，避免使用过大重量与过深下放。'
    ],
    tags: ['胸部', '上胸', '水平推']
  }, SOURCE_ACSM, '上斜 30 至 45 度凳面，杠铃从上胸位置推起至肩上方'),

  makeExercise({
    id: 'dumbbell-bench-press',
    name: '哑铃卧推',
    enName: 'Dumbbell Bench Press',
    aliasesZh: ['哑铃平板卧推', '哑铃推胸'],
    aliasesEn: ['dumbbell bench press', 'db bench press'],
    pinyinFull: 'yalingwotui',
    pinyinInitials: 'ylwt',
    typoAliases: ['哑铃卧退'],
    equipment: 'dumbbell',
    pattern: 'horizontal-push',
    difficulty: 'beginner',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid', 'triceps-brachii'],
    unilateral: false,
    setup: [
      '仰卧平板凳，双手各持一只哑铃放在大腿前侧，掌心相对。',
      '用大腿把哑铃送到胸部两侧，肩胛骨收拢贴凳，握距略宽于肩。'
    ],
    execution: [
      '吸气收紧核心，将哑铃推至肩关节正上方，两只铃保持稳定间距。',
      '控制下放，肘部与躯干约 45 至 60 度，哑铃至胸部两侧、与胸线齐平。',
      '呼气推起回到起始位置，顶端不完全锁死肘部。'
    ],
    breathing: ['下放时吸气，推起时呼气。'],
    commonMistakes: [
      '把两只哑铃向中间挤压碰撞，轨迹变成夹胸。',
      '下放过深到肩关节极限，肩前侧出现不适。',
      '起始时直接把哑铃从地面甩到肩部。'
    ],
    safetyNotes: [
      '结束时先把哑铃放回膝盖附近，再借助腿部起身，避免直接丢落。',
      '肩部有疼痛或不稳感时停止动作并寻求专业医疗意见。'
    ],
    alternatives: ['barbell-bench-press', 'machine-chest-press', 'push-up'],
    notSuitable: [
      '单侧肩部控制力不足、哑铃轨迹明显晃动时，可先使用器械推胸。',
      '上肢急性疼痛期不宜进行负重推举。'
    ],
    tags: ['胸部', '哑铃', '水平推']
  }, SOURCE_NASM, '仰卧平板凳，两只哑铃从胸部两侧推至肩关节上方'),

  makeExercise({
    id: 'incline-dumbbell-bench-press',
    name: '上斜哑铃卧推',
    enName: 'Incline Dumbbell Bench Press',
    aliasesZh: ['上斜哑铃推胸', '上斜哑铃推举'],
    aliasesEn: ['incline dumbbell bench press', 'incline dumbbell press'],
    pinyinFull: 'shangxieyalingwotui',
    pinyinInitials: 'sxylwt',
    typoAliases: ['上斜哑铃卧退'],
    equipment: 'dumbbell',
    pattern: 'horizontal-push',
    difficulty: 'beginner',
    primaryMuscles: ['pectoralis-major', 'anterior-deltoid'],
    secondaryMuscles: ['triceps-brachii'],
    unilateral: false,
    setup: [
      '靠背调至约 30 至 45 度，坐稳后仰卧，双脚踩实地面。',
      '哑铃放在大腿上，用腿部辅助送到上胸两侧，肩胛骨收紧。'
    ],
    execution: [
      '将哑铃推至上胸上方，两铃间距约与肩同宽。',
      '控制下放至上胸两侧，肘部略低于躯干，保持前臂接近垂直。',
      '呼气推起回到起始位置，保持肩胛稳定不下滑。'
    ],
    breathing: ['下放时吸气，推起时呼气；每组保持均匀节奏。'],
    commonMistakes: [
      '靠背角度过大，动作变成坐姿肩推。',
      '两只哑铃在顶端相撞，胸肌张力被放松。',
      '下放幅度过大导致肩前侧压力增加。'
    ],
    safetyNotes: [
      '上斜推举对肩前侧要求较高，重量以能稳定控制为准。',
      '结束后先把哑铃收回到膝盖上方再起身。'
    ],
    alternatives: ['incline-barbell-bench-press', 'dumbbell-bench-press', 'machine-chest-press'],
    notSuitable: ['肩部活动度受限或推举末端有疼痛时，可缩小幅度或改用器械。'],
    tags: ['胸部', '上斜', '哑铃']
  }, SOURCE_NASM, '上斜凳面，两只哑铃从上胸两侧推起至肩上方'),

  makeExercise({
    id: 'smith-machine-bench-press',
    name: '史密斯卧推',
    enName: 'Smith Machine Bench Press',
    aliasesZh: ['史密斯机卧推', '史密斯平板卧推', '史密斯推胸'],
    aliasesEn: ['smith machine bench press', 'smith bench press'],
    pinyinFull: 'shimisiwotui',
    pinyinInitials: 'smswt',
    typoAliases: ['史密斯卧退'],
    equipment: 'smith-machine',
    pattern: 'horizontal-push',
    difficulty: 'beginner',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid', 'triceps-brachii'],
    unilateral: false,
    setup: [
      '将平板凳置于史密斯机杠铃正下方，调整高度使杠铃下放时落在胸骨中下部。',
      '仰卧后肩胛骨收紧，握距略宽于肩，确认两侧安全卡扣处于同一位。'
    ],
    execution: [
      '旋转杠铃解锁，控制下放至轻触胸部，肘部与躯干约 45 至 75 度。',
      '沿固定轨迹推起至接近伸直，再进入下一次；结束时旋转锁定。',
      '全程臀部与上背贴紧凳面，不借助杠铃轨道回弹。'
    ],
    breathing: ['下放时吸气，推起时呼气，锁定后恢复自然呼吸。'],
    commonMistakes: [
      '杠铃轨道与胸线不对齐，下放位置太低或压到颈部。',
      '把脚放得很远，形成过度反弓。',
      '依赖轨道回弹完成动作。'
    ],
    safetyNotes: [
      '训练前确认安全卡扣高度，避免杠铃停在无法推起的位置。',
      '肩肘出现疼痛、麻木时停止并寻求专业医疗意见。'
    ],
    alternatives: ['barbell-bench-press', 'machine-chest-press', 'dumbbell-bench-press'],
    notSuitable: ['需要自由轨迹训练者不适合长期只做史密斯卧推，可作为学习期过渡。'],
    tags: ['胸部', '史密斯机', '固定轨迹']
  }, SOURCE_NASM, '平板凳位于史密斯机内，杠铃沿固定轨道在胸部与肩上方之间移动'),

  makeExercise({
    id: 'machine-chest-press',
    name: '坐姿器械推胸',
    enName: 'Machine Chest Press',
    aliasesZh: ['器械推胸', '坐姿推胸', '推胸机'],
    aliasesEn: ['machine chest press', 'seated chest press', 'chest press machine'],
    pinyinFull: 'zuoziqixietuixiong',
    pinyinInitials: 'zzqxtx',
    typoAliases: ['器械推凶'],
    equipment: 'machine',
    pattern: 'horizontal-push',
    difficulty: 'beginner',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid', 'triceps-brachii'],
    unilateral: false,
    setup: [
      '调整座椅高度，使握把与胸部中段齐平；坐稳后背部贴紧靠垫。',
      '双脚踩实地面，肩胛骨收紧下沉，双手握住握把，手腕保持中立。'
    ],
    execution: [
      '呼气向前推出握把，至手臂接近伸直但不锁死。',
      '吸气缓慢回放，至胸部有轻微牵拉感、配重片不碰响。',
      '全程保持肩胛贴靠垫，不用身体前后晃动借力。'
    ],
    breathing: ['推出时呼气，回放时吸气。'],
    commonMistakes: [
      '座椅过低，握把位置高于肩，动作变成上斜推。',
      '回放过快，配重片撞击发出声响。',
      '肩膀向前耸起，肩胛失去靠垫支撑。'
    ],
    safetyNotes: [
      '调整配重销并确认插到底；离开器械前把配重归位。',
      '肩部不适时减小动作幅度或更换器械。'
    ],
    alternatives: ['dumbbell-bench-press', 'smith-machine-bench-press', 'push-up'],
    notSuitable: ['器械尺寸与身高不匹配、无法让握把与胸线对齐时，可改用哑铃卧推。'],
    tags: ['胸部', '器械', '水平推']
  }, SOURCE_NASM, '坐姿器械，握把从胸前推至接近伸直，再缓慢回放'),

  makeExercise({
    id: 'pec-deck-fly',
    name: '蝴蝶机夹胸',
    enName: 'Pec Deck Fly',
    aliasesZh: ['蝴蝶机', '夹胸机', '蝴蝶夹胸', '蝴蝶机飞鸟'],
    aliasesEn: ['pec deck fly', 'pec deck', 'machine fly'],
    pinyinFull: 'hudiejijiaxiong',
    pinyinInitials: 'hdjjx',
    typoAliases: ['蝴蝶机加胸'],
    equipment: 'machine',
    pattern: 'horizontal-push',
    difficulty: 'beginner',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid'],
    unilateral: false,
    setup: [
      '调整座椅高度，使手柄与胸部中段齐平；坐稳后背部贴紧靠垫。',
      '双手握住手柄或前臂贴住臂垫，肘部略低于肩，肩胛骨收紧下沉。'
    ],
    execution: [
      '呼气以肩为轴把两侧手柄向胸前合拢，肘部角度保持基本固定。',
      '在胸前稍作停顿，感受胸肌收缩；吸气缓慢回放至胸部有牵拉感。',
      '回放时控制配重片，不要让配重片完全碰撞在一起。'
    ],
    breathing: ['合拢时呼气，回放时吸气。'],
    commonMistakes: [
      '用肘部反复屈伸代替夹胸，动作变成推。',
      '回放幅度过大，肩部被过度向后拉。',
      '肩部耸起、身体前倾借力。'
    ],
    safetyNotes: [
      '肩部有撞击感或疼痛时停止动作，并寻求专业医疗意见。',
      '调整好座椅与手柄位置后再开始，避免肩关节处于别扭角度。'
    ],
    alternatives: ['cable-fly', 'machine-chest-press', 'push-up'],
    notSuitable: ['肩关节活动度不足、回放阶段肩前侧有挤压感时，可缩小回放幅度。'],
    tags: ['胸部', '器械', '夹胸']
  }, SOURCE_NASM, '坐姿，双侧手柄沿弧线在胸前合拢，再缓慢打开'),

  makeExercise({
    id: 'cable-fly',
    name: '绳索夹胸',
    enName: 'Cable Fly',
    aliasesZh: ['龙门架夹胸', '绳索飞鸟', '龙门架飞鸟'],
    aliasesEn: ['cable fly', 'cable crossover', 'cable chest fly'],
    pinyinFull: 'shengsuojiaxiong',
    pinyinInitials: 'ssjx',
    typoAliases: ['绳索加胸'],
    equipment: 'cable',
    pattern: 'horizontal-push',
    difficulty: 'beginner',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid', 'serratus-anterior'],
    unilateral: false,
    setup: [
      '将两侧滑轮调至略高于肩或与肩同高的位置，选择合适配重。',
      '双手握住把手，向前迈一步成前后站姿，身体微前倾，核心收紧。'
    ],
    execution: [
      '保持肘部微屈固定，以肩为轴把双手向胸前合拢，双手在胸前接近相触。',
      '稍作停顿，吸气缓慢打开手臂至胸部有牵拉感，控制配重不让它把身体拉起。',
      '全程保持躯干稳定，不来回晃动。'
    ],
    breathing: ['合拢时呼气，打开时吸气。'],
    commonMistakes: [
      '肘部反复屈伸，动作变成推举。',
      '身体前后晃动借力，配重失去控制。',
      '打开幅度过大，肩关节被强行拉到极限。'
    ],
    safetyNotes: [
      '配重不宜过大，优先关注可控的离心回放。',
      '肩部出现疼痛或不适时停止动作并寻求专业医疗意见。'
    ],
    alternatives: ['pec-deck-fly', 'machine-chest-press', 'push-up'],
    notSuitable: ['肩部活动度受限时，可把滑轮位置和站距调整到舒适范围。'],
    tags: ['胸部', '龙门架', '夹胸']
  }, SOURCE_NASM, '站姿，双手握把沿弧线在胸前合拢，再缓慢打开'),

  makeExercise({
    id: 'push-up',
    name: '俯卧撑',
    enName: 'Push-up',
    aliasesZh: ['标准俯卧撑', '掌上压', '伏地挺身'],
    aliasesEn: ['push-up', 'pushup', 'press-up'],
    pinyinFull: 'fuwocheng',
    pinyinInitials: 'fwc',
    typoAliases: ['俯卧称'],
    equipment: 'bodyweight',
    pattern: 'horizontal-push',
    difficulty: 'beginner',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['triceps-brachii', 'anterior-deltoid', 'serratus-anterior', 'rectus-abdominis'],
    unilateral: false,
    setup: [
      '双手略宽于肩撑地，手指向前，肩在手腕正上方。',
      '双脚并拢或与髋同宽，收紧核心与臀部，身体从头到脚跟保持一条直线。'
    ],
    execution: [
      '吸气屈肘下放，肘部与躯干约 45 度，胸口接近地面。',
      '呼气推地回到起始位置，顶端肩胛骨轻微前伸但不塌腰。',
      '如需降低难度，可改为跪姿或手撑高位（桌面、墙面）完成。'
    ],
    breathing: ['下放时吸气，推起时呼气。'],
    commonMistakes: [
      '塌腰或撅臀，身体不在一条直线上。',
      '手肘完全外展成 90 度。',
      '下放幅度只有几厘米，没有完成有效行程。'
    ],
    safetyNotes: [
      '手腕不适时可用俯卧撑支架或握拳支撑，减少腕关节压力。',
      '出现肩部疼痛、麻木或眩晕时停止动作并寻求专业医疗意见。'
    ],
    alternatives: ['dip', 'machine-chest-press', 'barbell-bench-press'],
    notSuitable: [
      '肩部或手腕有疼痛、体重较大且核心控制不足时，可先做墙推或高位俯卧撑。'
    ],
    tags: ['胸部', '自重', '水平推']
  }, SOURCE_NHS, '俯卧撑姿，身体从头到脚跟保持直线并完成上下移动'),

  makeExercise({
    id: 'dip',
    name: '双杠臂屈伸',
    enName: 'Dip',
    aliasesZh: ['双杠撑体', '平行杠臂屈伸'],
    aliasesEn: ['dip', 'chest dip', 'parallel bar dip'],
    pinyinFull: 'shuanggangbiquishen',
    pinyinInitials: 'sgbqs',
    typoAliases: ['双杠臂屈申'],
    equipment: 'bodyweight',
    pattern: 'horizontal-push',
    difficulty: 'intermediate',
    primaryMuscles: ['pectoralis-major', 'triceps-brachii'],
    secondaryMuscles: ['anterior-deltoid', 'serratus-anterior'],
    unilateral: false,
    setup: [
      '双手撑住双杠，肩胛骨下沉，手臂伸直但肘部不锁死。',
      '身体略前倾、双腿屈膝交叉或自然下垂，核心收紧。'
    ],
    execution: [
      '吸气屈肘下放，肘部略向后外方，降至上臂接近与地面平行或肩部舒适的位置。',
      '呼气推起回到起始位置，顶端保持肩胛稳定。',
      '力量不足时可使用辅助器械或弹力带辅助，或先做窄幅半程动作。'
    ],
    breathing: ['下放时吸气，推起时呼气。'],
    commonMistakes: [
      '下放过深，肩关节前侧压力过大。',
      '身体摆动借力，肩部耸起。',
      '在顶端完全锁死并放松肩胛。'
    ],
    safetyNotes: [
      '双杠间距过宽会增加肩部压力，选择舒适间距。',
      '肩部疼痛、麻木或关节不稳时立即停止并寻求专业医疗意见。'
    ],
    alternatives: ['push-up', 'close-grip-bench-press', 'machine-chest-press'],
    notSuitable: ['肩部活动度不足或既往肩伤尚未恢复时，不建议进行负重双杠臂屈伸。'],
    tags: ['胸部', '三头', '自重']
  }, SOURCE_NASM, '双手撑双杠，身体下降再推起，上臂接近与地面平行')
];

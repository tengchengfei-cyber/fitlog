// 上半身动作库 · 肩部（6 个动作）
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

export const shouldersExercises = [
  makeExercise({
    id: 'overhead-barbell-press',
    name: '杠铃站姿推举',
    enName: 'Overhead Barbell Press',
    aliasesZh: ['站姿杠铃推举', '杠铃肩推', '军事推举'],
    aliasesEn: ['overhead press', 'barbell overhead press', 'military press', 'standing barbell press'],
    pinyinFull: 'ganglingzhanzituiju',
    pinyinInitials: 'glzztj',
    typoAliases: ['杠铃站姿推局'],
    equipment: 'barbell',
    pattern: 'vertical-push',
    difficulty: 'intermediate',
    primaryMuscles: ['anterior-deltoid'],
    secondaryMuscles: ['lateral-deltoid', 'triceps-brachii', 'trapezius-upper'],
    unilateral: false,
    setup: [
      '双脚与肩同宽站立，杠铃置于锁骨前侧，握距略宽于肩，手腕保持中立。',
      '收腹夹臀，肋骨下沉，肩胛骨轻微上旋，核心收紧。'
    ],
    execution: [
      '吸气收紧核心，呼气把杠铃垂直向上推过头顶，头部略后避让。',
      '杠铃过头后手臂伸直但不锁死，肩胛骨向上转动，身体保持直立。',
      '吸气控制下放至锁骨位置，再进入下一次。'
    ],
    breathing: ['上推时呼气，下放时吸气；负荷较大时先收紧核心再推。'],
    commonMistakes: [
      '腰部过度反弓，把推举变成站姿下斜推。',
      '杠铃绕头前方推起，轨迹不垂直。',
      '手腕过度后伸。'
    ],
    safetyNotes: [
      '训练前确认杠铃架与头顶空间；重量以能保持躯干直立为准。',
      '肩部疼痛、头晕或手臂麻木时立即停止并寻求专业医疗意见。'
    ],
    alternatives: ['dumbbell-shoulder-press', 'arnold-press'],
    notSuitable: ['肩关节上举活动度不足或推举时肩前侧有疼痛者，可先做哑铃肩推并减小幅度。'],
    tags: ['肩部', '垂直推', '杠铃']
  }, SOURCE_ACSM, '站姿，杠铃从锁骨前侧垂直推过头顶，再控制下放', '侧面机位展示躯干直立、杠铃垂直轨迹与头部避让'),

  makeExercise({
    id: 'dumbbell-shoulder-press',
    name: '哑铃坐姿肩推',
    enName: 'Dumbbell Shoulder Press',
    aliasesZh: ['哑铃肩推', '坐姿哑铃推举', '哑铃推肩'],
    aliasesEn: ['dumbbell shoulder press', 'seated dumbbell press'],
    pinyinFull: 'yalingzuozijiantui',
    pinyinInitials: 'ylzzjt',
    typoAliases: ['哑铃坐姿肩退'],
    equipment: 'dumbbell',
    pattern: 'vertical-push',
    difficulty: 'beginner',
    primaryMuscles: ['anterior-deltoid', 'lateral-deltoid'],
    secondaryMuscles: ['triceps-brachii', 'trapezius-upper'],
    unilateral: false,
    setup: [
      '坐姿，靠背调至接近竖直或略后倾，双脚踩实地面。',
      '双手各持哑铃举至肩部两侧，掌心向前或略相对，肘部略低于肩。'
    ],
    execution: [
      '呼气把哑铃向上推至头顶上方，两只铃保持稳定间距。',
      '顶端停顿，不锁死肘部；吸气控制下放至肩部两侧。',
      '保持躯干贴靠垫，不用腰部反弓借力。'
    ],
    breathing: ['上推时呼气，下放时吸气。'],
    commonMistakes: [
      '腰部过度反弓、肋骨外翻。',
      '哑铃在头顶相撞。',
      '下放过低，让肩部处于过度外旋位置。'
    ],
    safetyNotes: [
      '起始时用腿部把哑铃送到肩部，避免直接从地面甩起。',
      '肩部疼痛或麻木时停止并寻求专业医疗意见。'
    ],
    alternatives: ['overhead-barbell-press', 'arnold-press'],
    notSuitable: ['肩部活动度受限时，可改为单臂交替推举并缩小幅度。'],
    tags: ['肩部', '哑铃', '垂直推']
  }, SOURCE_NASM, '坐姿，两只哑铃从肩部两侧推至头顶上方'),

  makeExercise({
    id: 'lateral-raise',
    name: '哑铃侧平举',
    enName: 'Dumbbell Lateral Raise',
    aliasesZh: ['侧平举', '哑铃侧举', '侧举'],
    aliasesEn: ['lateral raise', 'dumbbell lateral raise', 'side raise'],
    pinyinFull: 'yalingcepingju',
    pinyinInitials: 'ylcpj',
    typoAliases: ['侧平局'],
    equipment: 'dumbbell',
    pattern: 'vertical-push',
    difficulty: 'beginner',
    primaryMuscles: ['lateral-deltoid'],
    secondaryMuscles: ['anterior-deltoid', 'trapezius-upper'],
    unilateral: false,
    setup: [
      '双脚与髋同宽站立，双手各持哑铃置于身体两侧，肘部微屈。',
      '挺胸收腹，肩胛骨下沉，身体保持直立。'
    ],
    execution: [
      '呼气时以肩为轴把哑铃向两侧抬起，至手臂接近与肩同高。',
      '肘部保持微屈并略高于手腕，像倒水一样让大拇指略向下。',
      '吸气缓慢下放至身体两侧，保持张力而不甩动。'
    ],
    breathing: ['抬起时呼气，下放时吸气。'],
    commonMistakes: [
      '借助身体摆动甩起哑铃。',
      '耸肩，斜方肌上束代偿明显。',
      '抬得过高，超过肩部后关节压力增加。'
    ],
    safetyNotes: [
      '重量宜轻，优先关注控制与肩部舒适。',
      '肩部出现撞击感或疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['face-pull', 'bent-over-reverse-fly'],
    notSuitable: ['肩关节上举时出现撞击样不适者，可先缩小幅度或改做前平举。'],
    tags: ['肩部', '中束', '哑铃']
  }, SOURCE_NASM, '站姿，两只哑铃从身体两侧抬起至接近肩高'),

  makeExercise({
    id: 'bent-over-reverse-fly',
    name: '俯身反向飞鸟',
    enName: 'Bent-Over Reverse Fly',
    aliasesZh: ['反向飞鸟', '俯身飞鸟', '后束飞鸟'],
    aliasesEn: ['bent-over reverse fly', 'reverse fly', 'rear delt fly'],
    pinyinFull: 'fushenfanxiangfeiniao',
    pinyinInitials: 'fsfxfn',
    typoAliases: ['俯身反向非鸟'],
    equipment: 'dumbbell',
    pattern: 'horizontal-pull',
    difficulty: 'beginner',
    primaryMuscles: ['posterior-deltoid'],
    secondaryMuscles: ['rhomboids', 'trapezius-mid-lower'],
    unilateral: false,
    setup: [
      '双脚与髋同宽，屈髋俯身至躯干接近水平，背部保持中立。',
      '双手各持轻哑铃自然下垂，肘部微屈，肩胛骨放松。'
    ],
    execution: [
      '呼气以肩为轴把双臂向两侧打开，至与肩同高、肩胛骨轻微收紧。',
      '顶端停顿，感受三角肌后束收紧；吸气缓慢下放。',
      '全程保持俯身角度稳定，不用腰部起伏借力。'
    ],
    breathing: ['打开时呼气，下放时吸气。'],
    commonMistakes: [
      '重量过大，用背部甩动。',
      '耸肩，把动作变成斜方肌训练。',
      '起身借力，身体角度不断变化。'
    ],
    safetyNotes: [
      '俯身位对腰部有要求，重量宜轻并保持背部中立。',
      '腰部或肩部出现疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['face-pull', 'lateral-raise'],
    notSuitable: ['腰部在俯身位不适时，可改为胸支撑或坐姿反向飞鸟。'],
    tags: ['肩部', '后束', '哑铃']
  }, SOURCE_NASM, '俯身位，两只哑铃从身体下方沿两侧打开至肩高'),

  makeExercise({
    id: 'face-pull',
    name: '绳索面拉',
    enName: 'Face Pull',
    aliasesZh: ['面拉', '绳索面拉', '高位面拉'],
    aliasesEn: ['face pull', 'cable face pull'],
    pinyinFull: 'shengsuomianla',
    pinyinInitials: 'ssml',
    typoAliases: ['绳索面啦'],
    equipment: 'cable',
    pattern: 'horizontal-pull',
    difficulty: 'beginner',
    primaryMuscles: ['posterior-deltoid', 'rhomboids'],
    secondaryMuscles: ['trapezius-mid-lower', 'rotator-cuff'],
    unilateral: false,
    setup: [
      '将滑轮调至略高于肩或与肩同高的位置，装上绳索把手，双手对握绳头。',
      '后退一步让绳索有张力，手臂伸直，身体略后仰，核心收紧。'
    ],
    execution: [
      '呼气时把绳索拉向面部，双手向两侧分开，肘部抬至接近与肩同高。',
      '末端停顿，感受三角肌后束与肩胛周围收紧。',
      '吸气缓慢回放至手臂伸直，保持躯干稳定。'
    ],
    breathing: ['后拉时呼气，回放时吸气。'],
    commonMistakes: [
      '重量过大，用身体后仰把绳索拉下来。',
      '肘部过低，动作变成划船。',
      '耸肩，颈部紧张。'
    ],
    safetyNotes: [
      '重量宜轻，优先关注肩胛与肩袖区域的舒适控制。',
      '肩部出现疼痛或麻木时停止并寻求专业医疗意见。'
    ],
    alternatives: ['bent-over-reverse-fly', 'seated-cable-row'],
    notSuitable: ['肩部活动度受限、无法舒适抬肘时，可降低滑轮高度与重量。'],
    tags: ['肩部', '后束', '龙门架']
  }, SOURCE_NASM, '双手对握绳索，把绳头拉向面部并向两侧分开'),

  makeExercise({
    id: 'arnold-press',
    name: '阿诺德推举',
    enName: 'Arnold Press',
    aliasesZh: ['阿诺德哑铃推举', '阿诺推举', '旋转肩推'],
    aliasesEn: ['arnold press', 'arnold dumbbell press'],
    pinyinFull: 'anuodetuiju',
    pinyinInitials: 'andtj',
    typoAliases: ['阿诺德推局'],
    equipment: 'dumbbell',
    pattern: 'vertical-push',
    difficulty: 'intermediate',
    primaryMuscles: ['anterior-deltoid', 'lateral-deltoid'],
    secondaryMuscles: ['triceps-brachii', 'trapezius-upper'],
    unilateral: false,
    setup: [
      '坐姿或站姿，靠背接近竖直；双手各持哑铃于肩前，掌心朝向自己，肘部贴近身体。',
      '收腹，肩胛骨下沉，核心收紧。'
    ],
    execution: [
      '呼气推起的同时前臂外旋，使掌心在头顶上方转为向前。',
      '顶端停顿，吸气下放并反向旋转，回到掌心朝向自己的起始位置。',
      '两侧动作同步，保持肘部与躯干的距离稳定。'
    ],
    breathing: ['推起时呼气，下放时吸气。'],
    commonMistakes: [
      '只做旋转不做推举，动作幅度过小。',
      '重量过大导致腰部反弓。',
      '旋转过快，肩关节缺乏控制。'
    ],
    safetyNotes: [
      '旋转过程缓慢可控，肩部有不适时改用普通哑铃肩推。',
      '肩部疼痛、麻木时停止并寻求专业医疗意见。'
    ],
    alternatives: ['dumbbell-shoulder-press', 'overhead-barbell-press'],
    notSuitable: ['肩关节活动度不足或肩袖有伤时，不建议加入旋转动作。'],
    tags: ['肩部', '哑铃', '垂直推']
  }, SOURCE_NASM, '坐姿哑铃从肩前掌心相对位置边推起边旋转至掌心向前')
];

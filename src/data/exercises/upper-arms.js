// 上半身动作库 · 手臂（9 个动作）
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

export const armsExercises = [
  makeExercise({
    id: 'barbell-curl',
    name: '杠铃弯举',
    enName: 'Barbell Curl',
    aliasesZh: ['杠铃二头弯举', '站姿杠铃弯举'],
    aliasesEn: ['barbell curl', 'standing barbell curl'],
    pinyinFull: 'ganglingwanju',
    pinyinInitials: 'glwj',
    typoAliases: ['杠铃弯局'],
    equipment: 'barbell',
    pattern: 'arms-flexion',
    difficulty: 'beginner',
    primaryMuscles: ['biceps-brachii'],
    secondaryMuscles: ['brachialis', 'forearms'],
    unilateral: false,
    setup: [
      '双脚与髋同宽站立，正握杠铃，握距约与肩同宽，手臂自然下垂。',
      '挺胸收腹，肘部贴近身体两侧，肩胛骨下沉。'
    ],
    execution: [
      '呼气时屈肘把杠铃向上弯举，肘部位置保持固定。',
      '至前臂接近垂直、杠铃接近锁骨高度时停顿，感受肱二头肌收紧。',
      '吸气缓慢下放至手臂接近伸直，保持张力再进入下一次。'
    ],
    breathing: ['弯举时呼气，下放时吸气。'],
    commonMistakes: [
      '甩动身体或后仰借力。',
      '肘部向前移动，肩部代偿。',
      '下放过快，失去离心控制。'
    ],
    safetyNotes: [
      '选择能保持肘部固定的重量，手腕不适时可改用曲杆。',
      '肘部或手腕出现疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['hammer-curl', 'preacher-curl', 'concentration-curl'],
    notSuitable: ['手腕在正握位有明显不适时，可先改用 EZ 曲杆或锤式弯举。'],
    tags: ['手臂', '肱二头肌', '杠铃']
  }, SOURCE_ACSM, '站姿正握杠铃，屈肘把杠铃从大腿前侧弯举至锁骨附近', '侧面机位展示肘部固定、身体不摆动与完整下放'),

  makeExercise({
    id: 'hammer-curl',
    name: '锤式弯举',
    enName: 'Hammer Curl',
    aliasesZh: ['哑铃锤式弯举', '锤式哑铃弯举'],
    aliasesEn: ['hammer curl', 'dumbbell hammer curl'],
    pinyinFull: 'chuishiwanju',
    pinyinInitials: 'cswj',
    typoAliases: ['垂式弯举'],
    equipment: 'dumbbell',
    pattern: 'arms-flexion',
    difficulty: 'beginner',
    primaryMuscles: ['brachialis', 'biceps-brachii'],
    secondaryMuscles: ['forearms'],
    unilateral: false,
    setup: [
      '双脚与髋同宽站立，双手各持哑铃，掌心相对，手臂自然下垂。',
      '挺胸收腹，肘部贴近身体两侧，核心收紧。'
    ],
    execution: [
      '呼气时保持掌心相对，屈肘把哑铃向上弯举，肘部固定。',
      '至哑铃接近肩部高度，停顿感受肱肌与前臂收紧。',
      '吸气缓慢下放至手臂接近伸直，两侧可同时或交替进行。'
    ],
    breathing: ['弯举时呼气，下放时吸气。'],
    commonMistakes: [
      '手腕随发力向内旋转，失去中立位。',
      '肘部前后移动，用肩部借力。',
      '身体摆动甩起哑铃。'
    ],
    safetyNotes: [
      '手腕保持中立，重量以能控制离心下放为准。',
      '肘部或手腕疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['barbell-curl', 'concentration-curl', 'reverse-curl'],
    notSuitable: ['肩部在动作末端有不适时，可改为靠墙站姿减少身体借力。'],
    tags: ['手臂', '肱肌', '哑铃']
  }, SOURCE_NASM, '站姿掌心相对持哑铃，屈肘把哑铃弯举至肩部高度'),

  makeExercise({
    id: 'preacher-curl',
    name: '牧师凳弯举',
    enName: 'Preacher Curl',
    aliasesZh: ['牧师椅弯举', '斜托弯举', '牧师凳二头弯举'],
    aliasesEn: ['preacher curl', 'preacher bench curl'],
    pinyinFull: 'mushidengwanju',
    pinyinInitials: 'msdwj',
    typoAliases: ['牧师登弯举'],
    equipment: 'ez-bar',
    pattern: 'arms-flexion',
    difficulty: 'beginner',
    primaryMuscles: ['biceps-brachii'],
    secondaryMuscles: ['brachialis', 'forearms'],
    unilateral: false,
    setup: [
      '调整座椅高度，使上臂放在斜托垫上、腋窝贴近垫面上缘。',
      '双手握 EZ 曲杆，掌心向上，肘部保持微屈，不要完全伸直锁死。'
    ],
    execution: [
      '呼气时屈肘把曲杆向上弯举至前臂接近垂直。',
      '顶端停顿，感受肱二头肌收紧；吸气缓慢下放。',
      '下放至肘部接近伸直但保持微屈，再进入下一次。'
    ],
    breathing: ['弯举时呼气，下放时吸气。'],
    commonMistakes: [
      '下放时把肘部完全锁死，关节压力增加。',
      '借助肩部把上臂抬离托垫。',
      '重量过大，只完成半程幅度。'
    ],
    safetyNotes: [
      '托垫上缘不要顶住腋窝过深，避免肩部受到压迫。',
      '肘部出现疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['barbell-curl', 'hammer-curl', 'concentration-curl'],
    notSuitable: ['肘部在托垫上无法舒适放置时，可改用站姿弯举。'],
    tags: ['手臂', '肱二头肌', '曲杆']
  }, SOURCE_NASM, '上臂放在斜托垫上，握 EZ 曲杆完成弯举与可控下放'),

  makeExercise({
    id: 'concentration-curl',
    name: '集中弯举',
    enName: 'Concentration Curl',
    aliasesZh: ['单臂集中弯举', '坐姿集中弯举', '集中二头弯举'],
    aliasesEn: ['concentration curl', 'seated concentration curl'],
    pinyinFull: 'jizhongwanju',
    pinyinInitials: 'jzwj',
    typoAliases: ['集中弯局'],
    equipment: 'dumbbell',
    pattern: 'arms-flexion',
    difficulty: 'beginner',
    primaryMuscles: ['biceps-brachii'],
    secondaryMuscles: ['brachialis', 'forearms'],
    unilateral: true,
    setup: [
      '坐在训练凳边缘，双脚分开踩地，身体略前倾。',
      '单手持哑铃，上臂内侧抵住同侧大腿内侧，手臂自然下垂。'
    ],
    execution: [
      '呼气时屈肘把哑铃向上弯举，上臂保持抵住大腿固定。',
      '至哑铃接近肩部，停顿感受肱二头肌收紧。',
      '吸气缓慢下放至手臂接近伸直，完成次数后换另一侧。'
    ],
    breathing: ['弯举时呼气，下放时吸气。'],
    commonMistakes: [
      '上臂离开大腿，肩部参与发力。',
      '身体摆动借力。',
      '下放幅度不足。'
    ],
    safetyNotes: [
      '上臂抵住大腿时不要过度压迫，以舒适为准。',
      '肘部或手腕疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['preacher-curl', 'barbell-curl', 'hammer-curl'],
    notSuitable: ['大腿抵住上臂时有明显压迫不适者，可改用牧师凳弯举。'],
    tags: ['手臂', '单侧', '肱二头肌']
  }, SOURCE_NASM, '坐姿前倾，上臂抵住大腿内侧，单手持哑铃完成弯举'),

  makeExercise({
    id: 'reverse-curl',
    name: '反握弯举',
    enName: 'Reverse Curl',
    aliasesZh: ['反手弯举', '反握曲杆弯举'],
    aliasesEn: ['reverse curl', 'reverse barbell curl'],
    pinyinFull: 'fanwowanju',
    pinyinInitials: 'fwwj',
    typoAliases: ['反握弯局'],
    equipment: 'ez-bar',
    pattern: 'arms-flexion',
    difficulty: 'beginner',
    primaryMuscles: ['forearms', 'brachialis'],
    secondaryMuscles: ['biceps-brachii'],
    unilateral: false,
    setup: [
      '双脚与髋同宽站立，反握 EZ 曲杆（掌心向下），握距约与肩同宽。',
      '挺胸收腹，肘部贴近身体，手腕保持中立。'
    ],
    execution: [
      '呼气时屈肘把曲杆向上弯举，手腕保持稳定不上翻。',
      '至前臂接近垂直时停顿，感受前臂与肱肌收紧。',
      '吸气缓慢下放至手臂接近伸直。'
    ],
    breathing: ['弯举时呼气，下放时吸气。'],
    commonMistakes: [
      '手腕向上翻卷，关节压力增加。',
      '重量过大，甩动身体。',
      '肘部向前移动借力。'
    ],
    safetyNotes: [
      '反握对前臂要求较高，新手宜从轻重量开始。',
      '手腕或肘部出现疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['barbell-curl', 'hammer-curl'],
    notSuitable: ['手腕在反握位有疼痛时，可先做锤式弯举强化前臂。'],
    tags: ['手臂', '前臂', '反握']
  }, SOURCE_NASM, '站姿反握曲杆，掌心向下完成弯举与缓慢下放'),

  makeExercise({
    id: 'cable-triceps-pushdown',
    name: '绳索下压',
    enName: 'Cable Triceps Pushdown',
    aliasesZh: ['三头下压', '绳索臂屈伸', '肱三头下压'],
    aliasesEn: ['cable triceps pushdown', 'triceps pushdown', 'rope pushdown'],
    pinyinFull: 'shengsuoxiaya',
    pinyinInitials: 'ssxy',
    typoAliases: ['绳索下呀'],
    equipment: 'cable',
    pattern: 'arms-extension',
    difficulty: 'beginner',
    primaryMuscles: ['triceps-brachii'],
    secondaryMuscles: ['forearms'],
    unilateral: false,
    setup: [
      '面对高位滑轮站立，双手握住绳索两端或直杆，肘部贴近身体两侧。',
      '身体略前倾，核心收紧，上臂保持固定。'
    ],
    execution: [
      '呼气时伸肘把绳索向下压至手臂接近伸直，绳索两端向两侧分开。',
      '底端停顿，感受肱三头肌收紧；吸气缓慢回放至肘部约 90 度。',
      '上臂全程不前后摆动，只做肘关节屈伸。'
    ],
    breathing: ['下压时呼气，回放时吸气。'],
    commonMistakes: [
      '上臂前后摆动，用体重压下去。',
      '耸肩、身体上下起伏借力。',
      '回放时配重片撞击。'
    ],
    safetyNotes: [
      '重量以能保持上臂固定为准；肘部不适时减小重量。',
      '肘部或手腕疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['overhead-triceps-extension', 'close-grip-bench-press', 'skull-crusher'],
    notSuitable: ['肘部在固定位上不适时，可改用仰卧臂屈伸并减小幅度。'],
    tags: ['手臂', '肱三头肌', '龙门架']
  }, SOURCE_NASM, '面对高位滑轮，上臂固定，绳索从肩前下压至手臂接近伸直'),

  makeExercise({
    id: 'overhead-triceps-extension',
    name: '过顶臂屈伸',
    enName: 'Overhead Triceps Extension',
    aliasesZh: ['过顶三头臂屈伸', '颈后臂屈伸', '哑铃过顶臂屈伸'],
    aliasesEn: ['overhead triceps extension', 'overhead extension', 'overhead dumbbell extension'],
    pinyinFull: 'guodingbiquishen',
    pinyinInitials: 'gdbqs',
    typoAliases: ['过顶臂屈申'],
    equipment: 'dumbbell',
    pattern: 'arms-extension',
    difficulty: 'beginner',
    primaryMuscles: ['triceps-brachii'],
    secondaryMuscles: ['forearms'],
    unilateral: false,
    setup: [
      '坐姿或站姿，双手握住一只哑铃的一端，举过头顶，手臂伸直。',
      '收腹，肩胛骨下沉，肘部尽量靠近头部两侧，上臂保持垂直。'
    ],
    execution: [
      '吸气屈肘把哑铃下放至头后，上臂保持不动，肘部指向正上方。',
      '至前臂与上臂约 90 度或舒适范围，呼气伸肘回到起始位置。',
      '顶端不完全锁死，保持肱三头肌张力。'
    ],
    breathing: ['下放时吸气，伸直时呼气。'],
    commonMistakes: [
      '肘部向两侧大幅打开。',
      '腰部反弓、肋骨外翻。',
      '重量过大导致肩部代偿。'
    ],
    safetyNotes: [
      '肩部活动度不足时减小下放幅度，避免强行拉伸。',
      '肩部或肘部疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['cable-triceps-pushdown', 'skull-crusher', 'close-grip-bench-press'],
    notSuitable: ['肩关节上举活动度不足时，可先做单臂版本并缩小幅度。'],
    tags: ['手臂', '肱三头肌', '过顶']
  }, SOURCE_NASM, '双手握哑铃举过头顶，屈肘下放至头后再伸直'),

  makeExercise({
    id: 'close-grip-bench-press',
    name: '窄距卧推',
    enName: 'Close-Grip Bench Press',
    aliasesZh: ['窄握卧推', '窄距杠铃卧推', '窄握推胸'],
    aliasesEn: ['close-grip bench press', 'close grip bench'],
    pinyinFull: 'zhaijuwotui',
    pinyinInitials: 'zjwt',
    typoAliases: ['窄距卧退'],
    equipment: 'barbell',
    pattern: 'horizontal-push',
    difficulty: 'intermediate',
    primaryMuscles: ['triceps-brachii'],
    secondaryMuscles: ['pectoralis-major', 'anterior-deltoid'],
    unilateral: false,
    setup: [
      '仰卧平板凳，双手正握杠铃，握距约与肩同宽或略窄，手腕保持中立。',
      '肩胛骨收紧下沉，双脚踩实地面，杠铃位于胸部上方。'
    ],
    execution: [
      '吸气控制杠铃下放至胸骨下部，肘部贴近身体两侧。',
      '轻触胸部后呼气推起，保持肘部内收约 30 至 45 度。',
      '顶端不完全锁死，保持肱三头肌张力。'
    ],
    breathing: ['下放时吸气，推起时呼气。'],
    commonMistakes: [
      '握距过窄，手腕压力过大。',
      '肘部外展，动作变成普通卧推。',
      '杠铃下放速度过快。'
    ],
    safetyNotes: [
      '使用保护架或同伴；手腕不适时适当加宽握距。',
      '肩肘或手腕疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['cable-triceps-pushdown', 'overhead-triceps-extension', 'barbell-bench-press'],
    notSuitable: ['手腕在窄握位有明显不适时，可改用哑铃或绳索下压训练三头。'],
    tags: ['手臂', '肱三头肌', '杠铃']
  }, SOURCE_ACSM, '仰卧平板凳窄握杠铃，下放至胸骨下部后推起'),

  makeExercise({
    id: 'skull-crusher',
    name: '仰卧臂屈伸',
    enName: 'Skull Crusher',
    aliasesZh: ['仰卧三头臂屈伸', '碎颅者', '仰卧杠铃臂屈伸'],
    aliasesEn: ['skull crusher', 'lying triceps extension'],
    pinyinFull: 'yangwobiquishen',
    pinyinInitials: 'ywbqs',
    typoAliases: ['仰卧臂屈申'],
    equipment: 'ez-bar',
    pattern: 'arms-extension',
    difficulty: 'intermediate',
    primaryMuscles: ['triceps-brachii'],
    secondaryMuscles: ['forearms'],
    unilateral: false,
    setup: [
      '仰卧平板凳，双手握 EZ 曲杆，手臂伸向胸部上方，握距约与肩同宽。',
      '肩胛骨收紧，上臂保持相对垂直，核心收紧。'
    ],
    execution: [
      '吸气屈肘把曲杆下放至额头或头顶上方，肘部保持指向上方。',
      '至前臂与上臂约 90 度或舒适位置，呼气伸肘回到起始位置。',
      '上臂角度保持稳定，不用肩部推起重量。'
    ],
    breathing: ['下放时吸气，伸直时呼气。'],
    commonMistakes: [
      '肘部大幅外展，肩部代偿。',
      '下放位置偏向脸部，缺乏安全控制。',
      '重量过大，动作幅度失控。'
    ],
    safetyNotes: [
      '建议使用保护架或同伴，避免曲杆落到面部。',
      '肘部或肩部疼痛时停止并寻求专业医疗意见。'
    ],
    alternatives: ['cable-triceps-pushdown', 'overhead-triceps-extension', 'close-grip-bench-press'],
    notSuitable: ['肘部不适或无法稳定控制曲杆时，可改用绳索下压。'],
    tags: ['手臂', '肱三头肌', '曲杆']
  }, SOURCE_NASM, '仰卧平板凳握 EZ 曲杆，屈肘下放至额头上方后再伸直')
];

/**
 * 动作详情页（#/library/:exerciseId）。
 * - 媒体切换：图片占位示意 / 视频（授权审核中降级）/ 文字完整要领
 * - 展示肌群、器械、模式、难度、起始姿势、步骤、呼吸、常见错误、安全提醒、
 *   替代动作、不适用提示、来源与许可证、内容版本/审核状态/更新时间、免责声明
 */
import { el, clear } from '../../app/dom.js';
import { navigate } from '../../app/router.js';
import {
  screen,
  sectionTitle,
  card,
  button,
  badge,
  segmentedControl,
  callout,
  emptyState,
  disclosure,
  icon
} from '../../ui/index.js';
import {
  getExercise,
  resolveAlternatives,
  equipmentLabel,
  patternLabel,
  difficultyLabel
} from '../../data/exercises/index.js';
import { getMuscle, groupName, muscleName } from '../../data/muscles.js';
import { getSettings } from '../../app/store.js';

const MEDIA_TYPES = [
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'text', label: '文字' }
];

const MEDIA_TYPE_LABELS = { image: '图片', video: '视频', text: '文字' };

const CONTENT_STATUS_LABELS = {
  approved: { label: '内容已审核', tone: 'success' },
  'pending-review': { label: '内容审核中', tone: 'warning' },
  unavailable: { label: '内容暂不可用', tone: 'danger' }
};

const MEDIA_STATUS_LABELS = {
  available: { label: '可展示', tone: 'success' },
  'pending-review': { label: '授权审核中', tone: 'warning' },
  unavailable: { label: '暂不可用', tone: 'danger' }
};

const LICENSE_LABELS = {
  'project-original-placeholder': '项目自绘占位素材',
  unknown: '来源未知（待补充）',
  'external-link-embed': '外链嵌入（原型不提供外链）'
};

function contentStatusBadge(status) {
  const info = CONTENT_STATUS_LABELS[status] || { label: '审核状态未知', tone: 'neutral' };
  return badge({ label: info.label, tone: info.tone });
}

function mediaStatusBadge(status) {
  const info = MEDIA_STATUS_LABELS[status] || { label: '状态未知', tone: 'neutral' };
  return badge({ label: `素材：${info.label}`, tone: info.tone });
}

function findMedia(exercise, type) {
  const media = Array.isArray(exercise.media) ? exercise.media : [];
  return media.find((item) => item && item.type === type) || null;
}

function sourceLine(source) {
  if (!source) return el('p', { className: 'source-meta', textContent: '来源待补充' });
  const meta = [source.publisher, source.publishedAt].filter(Boolean).join(' · ');
  return el(
    'div',
    { className: 'source-row' },
    el('p', { className: 'source-label', textContent: source.label || '未命名来源' }),
    meta ? el('p', { className: 'source-meta', textContent: meta }) : null,
    source.url
      ? el(
          'a',
          {
            className: 'link source-link',
            href: source.url,
            target: '_blank',
            rel: 'noopener noreferrer',
            textContent: '查看来源'
          },
          icon('external', { size: 14 })
        )
      : null,
    source.accessedAt ? el('p', { className: 'source-meta', textContent: `访问日期：${source.accessedAt}` }) : null
  );
}

function cueList(items, { ordered = false } = {}) {
  if (!Array.isArray(items) || !items.length) {
    return el('p', { className: 'muted', textContent: '暂未收录，待内容补充。' });
  }
  const tag = ordered ? 'ol' : 'ul';
  const list = el(tag, { className: `detail-list ${ordered ? 'detail-list--ordered' : ''}`.trim() });
  for (const item of items) {
    list.appendChild(el('li', { className: 'detail-list__item' }, el('span', { textContent: item })));
  }
  return list;
}

function detailSection(title, children, hint) {
  return el(
    'section',
    { className: 'detail-section' },
    sectionTitle({ title, hint }),
    el('div', { className: 'detail-section__body' }, children)
  );
}

function muscleTags(exercise) {
  const primary = (exercise.primaryMuscles || []).map((id) => ({ id, muscle: getMuscle(id) }));
  const secondary = (exercise.secondaryMuscles || []).map((id) => ({ id, muscle: getMuscle(id) }));
  const renderTag = (entry, tone) =>
    el(
      'span',
      { className: `muscle-tag muscle-tag--${tone}` },
      el('span', { className: 'muscle-tag__name', textContent: entry.muscle ? entry.muscle.name : muscleName(entry.id) }),
      entry.muscle ? el('span', { className: 'muscle-tag__group', textContent: groupName(entry.muscle.groupId) }) : null
    );

  return el(
    'div',
    { className: 'muscle-groups' },
    el(
      'div',
      { className: 'muscle-group' },
      el('p', { className: 'muscle-group__label', textContent: '估计的直接训练暴露' }),
      el('div', { className: 'muscle-tags' }, primary.length ? primary.map((entry) => renderTag(entry, 'direct')) : el('span', { className: 'muted', textContent: '未标注' }))
    ),
    el(
      'div',
      { className: 'muscle-group' },
      el('p', { className: 'muscle-group__label', textContent: '估计的间接训练暴露' }),
      el('div', { className: 'muscle-tags' }, secondary.length ? secondary.map((entry) => renderTag(entry, 'indirect')) : el('span', { className: 'muted', textContent: '未标注' }))
    ),
    el('p', {
      className: 'muscle-note',
      textContent: '肌群标注是「动作通常涉及的肌群映射」，用于估计训练暴露，不代表精确激活比例或个体生理差异。'
    })
  );
}

function renderImageMedia(exercise) {
  const media = findMedia(exercise, 'image');
  const status = media ? media.status : 'unavailable';
  return el(
    'div',
    { className: 'media-panel' },
    el(
      'div',
      { className: 'media-frame media-frame--image' },
      el(
        'div',
        { className: 'media-canvas' },
        el('span', { className: 'media-tag', textContent: '占位示意图·非真实示范' }),
        el(
          'div',
          { className: 'media-figure' },
          el('span', { className: 'media-figure__track' }),
          el('span', { className: 'media-figure__icon' }, icon('dumbbell', { size: 54 }))
        )
      ),
      el(
        'div',
        { className: 'media-caption' },
        el(
          'div',
          { className: 'media-caption__head' },
          el('span', { className: 'media-caption__title', textContent: media ? media.title : '器械轨迹占位示意图' }),
          mediaStatusBadge(status)
        ),
        el('p', {
          className: 'media-caption__text',
          textContent:
            media && media.description
              ? media.description
              : '正式示范图待授权审核；当前使用项目自绘占位示意图，非真实动作示范。'
        }),
        media && media.reviewNote ? el('p', { className: 'media-caption__note', textContent: media.reviewNote }) : null,
        status !== 'available'
          ? callout({
              tone: status === 'pending-review' ? 'warning' : 'info',
              children:
                status === 'pending-review'
                  ? '图片素材授权审核中，暂不提供真实示范图。可切换到「文字」查看完整要领。'
                  : '图片素材暂不可用，请使用文字要领。'
            })
          : null
      )
    )
  );
}

function renderVideoMedia(exercise) {
  const media = findMedia(exercise, 'video');
  const status = media ? media.status : 'unavailable';
  const textMedia = findMedia(exercise, 'text');
  return el(
    'div',
    { className: 'media-panel' },
    el(
      'div',
      { className: 'media-frame media-frame--video' },
      el(
        'div',
        { className: 'media-canvas media-canvas--video' },
        el('span', { className: 'media-tag', textContent: '视频占位 · 授权审核中' }),
        el(
          'div',
          { className: 'media-figure media-figure--play' },
          el('span', { className: 'media-figure__icon' }, icon('play', { size: 46 }))
        )
      ),
      el(
        'div',
        { className: 'media-caption' },
        el(
          'div',
          { className: 'media-caption__head' },
          el('span', { className: 'media-caption__title', textContent: media ? media.title : '示范视频（待授权）' }),
          mediaStatusBadge(status)
        ),
        status !== 'available'
          ? callout({
              tone: 'warning',
              title: '授权审核中，暂不提供外链',
              children:
                '本原型不盗链、不下载第三方视频素材。正式示范视频需完成授权审核后提供；当前已降级为文字要领。'
            })
          : null,
        el('p', {
          className: 'media-caption__text',
          textContent:
            (media && media.description) ||
            (textMedia && textMedia.description) ||
            '视频素材待授权审核，可切换到「文字」查看完整动作要领。'
        }),
        el(
          'div',
          { className: 'media-fallback' },
          el('p', { className: 'media-fallback__title', textContent: '文字要领降级' }),
          cueList([...(exercise.setup || []), ...(exercise.execution || [])], { ordered: true })
        )
      )
    )
  );
}

function renderTextMedia(exercise) {
  const media = findMedia(exercise, 'text');
  const status = media ? media.status : 'available';
  return el(
    'div',
    { className: 'media-panel' },
    card({
      className: 'media-text',
      children: [
        el(
          'div',
          { className: 'media-caption__head' },
          el('span', { className: 'media-caption__title', textContent: media ? media.title : '文字要领' }),
          mediaStatusBadge(status)
        ),
        el('p', {
          className: 'media-caption__text',
          textContent:
            (media && media.description) ||
            '本动作以文字要领为主：先调整起始姿势，再按步骤缓慢完成动作，保持呼吸顺畅并在无痛范围内进行。'
        }),
        media && media.reviewNote ? el('p', { className: 'media-caption__note', textContent: media.reviewNote }) : null,
        el('div', { className: 'media-text__block' }, el('p', { className: 'media-fallback__title', textContent: '完整文字要领' }), cueList([
          ...(exercise.setup || []).map((line) => `起始：${line}`),
          ...(exercise.execution || []).map((line, index) => `步骤 ${index + 1}：${line}`),
          ...(exercise.breathing || []).map((line) => `呼吸：${line}`)
        ], { ordered: true }))
      ]
    })
  );
}

function renderMediaByType(host, exercise, type) {
  clear(host);
  if (type === 'video') host.appendChild(renderVideoMedia(exercise));
  else if (type === 'text') host.appendChild(renderTextMedia(exercise));
  else host.appendChild(renderImageMedia(exercise));
}

function renderAlternatives(exercise) {
  const alternatives = resolveAlternatives(exercise);
  if (!alternatives.length) return el('p', { className: 'muted', textContent: '暂无替代动作记录。' });
  const list = el('div', { className: 'alternative-list' });
  for (const alternative of alternatives) {
    list.appendChild(
      el(
        'button',
        {
          className: 'alternative-item',
          type: 'button',
          onClick: () => navigate(`/library/${alternative.id}`),
          'aria-label': `查看替代动作：${alternative.name}`
        },
        el('span', { className: 'alternative-item__icon' }, icon('arrow-right', { size: 16 })),
        el(
          'span',
          { className: 'alternative-item__main' },
          el('span', { className: 'alternative-item__name', textContent: alternative.name }),
          el('span', {
            className: 'alternative-item__meta',
            textContent: `${equipmentLabel(alternative.equipment)} · ${patternLabel(alternative.pattern)} · ${difficultyLabel(alternative.difficulty)}`
          })
        ),
        icon('chevron-right', { size: 16 })
      )
    );
  }
  return list;
}

function buildSourceSection(exercise) {
  const media = findMedia(exercise, 'image') || (exercise.media || [])[0] || null;
  const statusInfo = CONTENT_STATUS_LABELS[exercise.contentStatus] || CONTENT_STATUS_LABELS.approved;
  const children = [
    el(
      'div',
      { className: 'source-block' },
      el('p', { className: 'source-block__title', textContent: '动作内容来源' }),
      sourceLine(exercise.source)
    ),
    media
      ? el(
          'div',
          { className: 'source-block' },
          el('p', { className: 'source-block__title', textContent: '当前素材来源与许可证' }),
          sourceLine(media.source),
          el('p', { className: 'source-meta', textContent: `许可证：${LICENSE_LABELS[media.license] || media.license || '待补充'}` }),
          media.reviewNote ? el('p', { className: 'source-meta', textContent: `审核说明：${media.reviewNote}` }) : null
        )
      : null,
    el(
      'div',
      { className: 'source-meta-grid' },
      el('span', { className: 'source-meta-grid__item', textContent: `内容版本：${exercise.contentVersion || '未标注'}` }),
      el('span', { className: 'source-meta-grid__item', textContent: `审核状态：${statusInfo.label}` }),
      el('span', { className: 'source-meta-grid__item', textContent: `更新时间：${exercise.updatedAt || '未标注'}` })
    ),
    disclosure({
      summary: '关于动作数据的说明',
      iconName: 'info',
      children: [
        el('p', {
          textContent:
            '动作图鉴内容为通用训练教学信息，来源与审核状态在页面中标注；未完成审核的内容会明确显示审核状态。'
        }),
        el('p', {
          textContent:
            '本原型阶段不使用真实示范图/视频，不盗链第三方素材；占位素材为项目自绘，仅用于说明界面结构。'
        })
      ]
    })
  ];
  return detailSection('来源与许可证', children);
}

export function exerciseDetailPage(ctx) {
  const exerciseId = ctx && ctx.params ? ctx.params.exerciseId : '';
  const exercise = getExercise(exerciseId);

  if (!exercise) {
    return screen({
      title: '动作不存在',
      back: '/library',
      children: [
        emptyState({
          title: '没有找到这个动作',
          text: '链接可能已失效，或该动作尚未收录。动作库是搜索的唯一可信源，不会临时生成动作。',
          iconName: 'search',
          action: button({ label: '返回动作图鉴', variant: 'secondary', onClick: () => navigate('/library') })
        })
      ]
    });
  }

  const settings = getSettings();
  const preferred = MEDIA_TYPES.some((type) => type.value === settings.mediaPreference) ? settings.mediaPreference : 'image';
  const state = { media: preferred };

  const mediaHost = el('div', { className: 'media-host' });
  const segmentedHost = el('div', { className: 'media-switch' });

  function renderSegmented() {
    clear(segmentedHost);
    segmentedHost.appendChild(
      segmentedControl({
        options: MEDIA_TYPES.map((type) => ({ ...type, label: MEDIA_TYPE_LABELS[type.value] || type.label })),
        value: state.media,
        name: '动作媒体类型',
        onChange: (value) => {
          state.media = value;
          renderSegmented();
          renderMediaByType(mediaHost, exercise, state.media);
        }
      })
    );
  }

  renderSegmented();
  renderMediaByType(mediaHost, exercise, state.media);

  const contentStatus = exercise.contentStatus || 'approved';
  const headerSubtitle = [exercise.enName, equipmentLabel(exercise.equipment), patternLabel(exercise.pattern)]
    .filter(Boolean)
    .join(' · ');

  const children = [];

  if (contentStatus !== 'approved') {
    children.push(
      callout({
        tone: contentStatus === 'pending-review' ? 'warning' : 'danger',
        title: contentStatus === 'pending-review' ? '内容审核中' : '内容暂不可用',
        children:
          contentStatus === 'pending-review'
            ? '本动作资料仍在审核中，要点与来源可能调整，请仅作参考。'
            : '本动作资料暂不可用，建议先选择其它已审核的替代动作。'
      })
    );
  }

  children.push(
    card({
      className: 'detail-media-card',
      children: [
        el(
          'div',
          { className: 'detail-media-card__head' },
          el(
            'div',
            {},
            el('p', { className: 'detail-media-card__title', textContent: '动作媒体' }),
            el('p', {
              className: 'detail-media-card__hint',
              textContent: '默认为设置中的媒体偏好，可切换图片 / 视频 / 文字'
            })
          ),
          contentStatusBadge(contentStatus)
        ),
        segmentedHost,
        mediaHost
      ]
    })
  );

  children.push(
    detailSection('动作摘要', [
      el(
        'div',
        { className: 'detail-summary' },
        el('div', { className: 'detail-summary__row' }, el('span', { className: 'detail-summary__label', textContent: '器械' }), el('span', { className: 'detail-summary__value', textContent: equipmentLabel(exercise.equipment) })),
        el('div', { className: 'detail-summary__row' }, el('span', { className: 'detail-summary__label', textContent: '动作模式' }), el('span', { className: 'detail-summary__value', textContent: patternLabel(exercise.pattern) })),
        el('div', { className: 'detail-summary__row' }, el('span', { className: 'detail-summary__label', textContent: '难度' }), el('span', { className: 'detail-summary__value', textContent: difficultyLabel(exercise.difficulty) })),
        el('div', { className: 'detail-summary__row' }, el('span', { className: 'detail-summary__label', textContent: '单侧记录' }), el('span', { className: 'detail-summary__value', textContent: exercise.unilateral ? '支持（可按单侧记录）' : '通常双侧' }))
      )
    ], '难度为动作学习难度参考，不是能力评估')
  );

  children.push(detailSection('主要训练肌群', [muscleTags(exercise)]));
  children.push(detailSection('起始姿势', [cueList(exercise.setup)], '1-3 条准备步骤'));
  children.push(detailSection('执行步骤', [cueList(exercise.execution, { ordered: true })], '在无痛范围内缓慢完成'));
  children.push(detailSection('呼吸与控制', [cueList(exercise.breathing)], '保持呼吸顺畅，避免憋气'));
  children.push(detailSection('常见错误', [cueList(exercise.commonMistakes)], '用于自查动作质量'));

  children.push(
    detailSection('安全提醒', [
      el(
        'div',
        { className: 'detail-safety' },
        callout({
          tone: 'warning',
          title: '训练中注意',
          children: cueList(exercise.safetyNotes)
        }),
        el('p', {
          className: 'detail-note',
          textContent:
            '出现疼痛、胸痛、呼吸困难、眩晕、麻木或异常疲劳时，应停止训练并寻求专业医疗意见；本页内容不构成医疗诊断或康复处方。'
        })
      )
    ])
  );

  children.push(
    detailSection('不适用提示', [
      callout({
        tone: 'info',
        children: cueList(exercise.notSuitable)
      })
    ], '条件性提醒，请结合自身情况判断')
  );

  children.push(detailSection('替代动作', [renderAlternatives(exercise)], '点击可直接查看替代动作详情'));
  children.push(buildSourceSection(exercise));

  children.push(
    card({
      className: 'detail-disclaimer',
      children: [
        el('p', { className: 'detail-disclaimer__title', textContent: '免责声明' }),
        el('p', {
          className: 'detail-note',
          textContent:
            '本页内容为通用训练教学信息，不构成医疗建议或个体化康复处方；不承诺增肌/减脂等具体结果，也不推断个体生理属性。训练前请确认自身健康状况，必要时咨询专业人士。'
        }),
        el('p', {
          className: 'library-footer-note',
          textContent: '原型：数据仅保存在本机；动作库是查询动作的唯一可信源。'
        })
      ]
    })
  );

  children.push(
    el(
      'div',
      { className: 'detail-footer' },
      button({
        label: '返回动作图鉴',
        variant: 'secondary',
        iconName: 'back',
        full: true,
        onClick: () => navigate('/library')
      }),
      el('p', {
        className: 'library-footer-note',
        textContent: '相关动作（同类模式或肌群）仅供参考，训练选择请结合自身情况。'
      })
    )
  );

  return screen({
    title: exercise.name,
    subtitle: headerSubtitle,
    back: '/library',
    children
  });
}

/**
 * 内联 SVG 图标集（stroke 风格，24×24）。由 UI kit 的 icon() 渲染。
 */

const NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  home: ['M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z'],
  dumbbell: ['M4 9v6', 'M7 7v10', 'M17 7v10', 'M20 9v6', 'M7 12h10'],
  library: ['M4 19V5a1 1 0 0 1 1-1h6v16H5a1 1 0 0 1-1-1z', 'M13 4h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-6z'],
  log: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 8v8', 'M8 12h8'],
  history: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2'],
  settings: ['M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3', 'M4.5 4.5 6.6 6.6', 'M17.4 17.4l2.1 2.1', 'M19.5 4.5 17.4 6.6', 'M6.6 17.4l-2.1 2.1'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4-4'],
  filter: ['M4 6h16', 'M7 12h10', 'M10 18h4'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  back: ['M15 19l-7-7 7-7'],
  check: ['M5 13l4 4L19 7'],
  'chevron-right': ['M9 5l7 7-7 7'],
  'chevron-down': ['M6 9l6 6 6-6'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M7 7l1 13h8l1-13', 'M10 11v6', 'M14 11v6'],
  edit: ['M4 20h4L20 8l-4-4L4 16z', 'M14 8l2 2'],
  copy: ['M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z', 'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1'],
  grip: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v5', 'M12 8h.01'],
  warning: ['M12 3 22 20H2z', 'M12 9v5', 'M12 17h.01'],
  shield: ['M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6z', 'M9 12l2 2 4-4'],
  play: ['M8 5v14l11-7z'],
  image: ['M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M4 16l5-5 4 4 3-3 4 4', 'M8.5 10h.01'],
  text: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  video: ['M3 7h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z', 'M16 10l5-3v10l-5-3'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
  sync: ['M20 12a8 8 0 0 1-13.7 5.6', 'M4 12a8 8 0 0 1 13.7-5.6', 'M20 4v4h-4', 'M4 20v-4h4'],
  offline: ['M3 3l18 18', 'M7 18a4 4 0 0 1 0-8 6 6 0 0 1 9.5-3.6', 'M17 18h1a3.5 3.5 0 0 0 .5-7'],
  target: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 11v2'],
  flame: ['M12 22c4 0 7-2.8 7-7 0-3-2-5.5-3.5-7.5C14 5 13 3 12 2c0 3-1.5 4.5-1.5 4.5S9 5 9 3.5C7 6 5 8.5 5 13c0 4.2 3 9 7 9z'],
  timer: ['M9 2h6', 'M12 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M12 10v5'],
  heart: ['M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z'],
  sparkles: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', 'M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z'],
  external: ['M14 4h6v6', 'M20 4l-8 8', 'M10 5H5v15h15v-5'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3.5 6h.01', 'M3.5 12h.01', 'M3.5 18h.01'],
  calendar: ['M4 6h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z', 'M8 3v4', 'M16 3v4', 'M3 11h18'],
  activity: ['M3 12h4l3-8 4 16 3-8h4'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  lightbulb: ['M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 1 4 10.5c-.7.7-1 1.5-1 2.5h-6c0-1-.3-1.8-1-2.5A6 6 0 0 1 12 3z'],
  rotate: ['M9 14l-4-4 4-4', 'M5 10h9a5 5 0 0 1 0 10h-3'],
  book: ['M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z', 'M8 3v18', 'M12 8h4', 'M12 12h4'],
  link: ['M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1', 'M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  bell: ['M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7', 'M10 19a2 2 0 0 0 4 0'],
  scale: ['M12 4v16', 'M5 8h14', 'M5 8l-3 7h6z', 'M19 8l-3 7h6z'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6', 'M3 18l6-6', 'M21 18l-6-6'],
  logout: ['M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4', 'M16 8l4 4-4 4', 'M20 12H9'],
  cloud: ['M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.3 2A3.5 3.5 0 0 1 17 18z'],
  server: ['M4 4h16v5H4z', 'M4 15h16v5H4z', 'M8 6.5h.01', 'M8 17.5h.01', 'M4 9v6'],
  eye_off: ['M3 3l18 18', 'M10 6.5A9.9 9.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.7', 'M6.5 6.7C3.9 8.4 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3.5-.6']
};

export const ICON_NAMES = Object.keys(PATHS);

export function icon(name, { size = 20, className = '' } = {}) {
  const paths = PATHS[name];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `icon ${className}`.trim());
  if (!paths) {
    return svg;
  }
  for (const d of paths) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    if (name === 'play') {
      p.setAttribute('fill', 'currentColor');
      p.setAttribute('stroke', 'none');
    }
    svg.appendChild(p);
  }
  return svg;
}

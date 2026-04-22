// 主题调色板：与 CSS 变量保持一致。
// 所有 Canvas 绘制都用 getPalette(theme) 返回的对象而不是硬编码颜色。

const LIGHT = {
  name:          'light',
  canvas_bg:     '#f7fafc',

  bg_a:          '#eaf6ff',
  bg_b:          '#f4faff',

  grid:          'rgba(15, 23, 42, 0.08)',

  start_fill:    'rgba(34, 197, 94, 0.18)',
  start_stroke:  'rgba(34, 197, 94, 0.60)',

  goal_fill:     'rgba(234, 179, 8, 0.18)',
  goal_stroke:   'rgba(234, 179, 8, 0.70)',

  hover_fill:    'rgba(14, 165, 233, 0.18)',
  hover_stroke:  'rgba(14, 165, 233, 0.70)',

  wall_body:     '#64748b',
  wall_dark:     '#475569',
  wall_top:      '#94a3b8',
  wall_line:     '#475569',

  bread_body:    '#f59e0b',
  bread_top:     '#fbbf24',
  bread_dark:    '#b45309',

  chest_body:    '#eab308',
  chest_dark:    '#a16207',
  chest_hi:      '#fde68a',

  trap_body:     '#ef4444',
  trap_dark:     '#b91c1c',
  trap_hi:       '#fca5a5',

  agent_body:    '#22c55e',
  agent_dark:    '#15803d',
  agent_hi:      '#86efac',
  agent_eye:     '#ffffff',
  agent_pupil:   '#0f172a',

  heat_pos:      [34, 197, 94],    // r g b
  heat_neg:      [239, 68, 68],
  heat_text_pos: '#166534',
  heat_text_neg: '#991b1b',
  heat_text_bg:  'rgba(255, 255, 255, 0.85)',

  arrow_stroke:  'rgba(15, 23, 42, 0.85)',
  arrow_fill:    'rgba(15, 23, 42, 0.85)',

  trail_color:   [34, 197, 94],
};

const DARK = {
  name:          'dark',
  canvas_bg:     '#0f172a',

  bg_a:          '#0b1220',
  bg_b:          '#111a2e',

  grid:          'rgba(148, 163, 184, 0.10)',

  start_fill:    'rgba(34, 197, 94, 0.22)',
  start_stroke:  'rgba(34, 197, 94, 0.75)',

  goal_fill:     'rgba(234, 179, 8, 0.22)',
  goal_stroke:   'rgba(234, 179, 8, 0.80)',

  hover_fill:    'rgba(56, 189, 248, 0.22)',
  hover_stroke:  'rgba(56, 189, 248, 0.75)',

  wall_body:     '#334155',
  wall_dark:     '#1e293b',
  wall_top:      '#475569',
  wall_line:     '#0f172a',

  bread_body:    '#f59e0b',
  bread_top:     '#fcd34d',
  bread_dark:    '#92400e',

  chest_body:    '#facc15',
  chest_dark:    '#854d0e',
  chest_hi:      '#fef3c7',

  trap_body:     '#f87171',
  trap_dark:     '#7f1d1d',
  trap_hi:       '#fecaca',

  agent_body:    '#22c55e',
  agent_dark:    '#14532d',
  agent_hi:      '#bbf7d0',
  agent_eye:     '#f8fafc',
  agent_pupil:   '#0b1220',

  heat_pos:      [34, 197, 94],
  heat_neg:      [248, 113, 113],
  heat_text_pos: '#bbf7d0',
  heat_text_neg: '#fecaca',
  heat_text_bg:  'rgba(15, 23, 42, 0.80)',

  arrow_stroke:  'rgba(226, 232, 240, 0.92)',
  arrow_fill:    'rgba(226, 232, 240, 0.92)',

  trail_color:   [56, 189, 248],
};

export function getPalette(theme = 'light') {
  return theme === 'dark' ? DARK : LIGHT;
}

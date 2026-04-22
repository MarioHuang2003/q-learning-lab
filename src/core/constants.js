// 核心常量：动作集、地形、默认奖励
// 所有数值可被上层覆盖（环境里保存的是活动配置的深拷贝）

export const ACTIONS = ['up', 'down', 'left', 'right'];

export const ACTION_DELTA = {
  up:    { dr: -1, dc:  0 },
  down:  { dr:  1, dc:  0 },
  left:  { dr:  0, dc: -1 },
  right: { dr:  0, dc:  1 },
};

// 箭头方向夹角（渲染策略箭头用）
export const ACTION_ANGLE = {
  up:    -Math.PI / 2,
  down:   Math.PI / 2,
  left:   Math.PI,
  right:  0,
};

export const TILES = {
  EMPTY:    'empty',
  WALL:     'wall',
  BREAD:    'bread',
  TREASURE: 'treasure',
  TRAP:     'trap',
};

// 默认奖励配置（可在 UI 中被覆盖）
export const DEFAULT_REWARDS = {
  empty:    { reward:   -0.1, done: false },
  wall:     { reward:   -1.0, done: false },
  bread:    { reward:    1.0, done: false },
  treasure: { reward:  100.0, done: true  },
  trap:     { reward: -100.0, done: true  },
};

// 算法注册表：id → 元信息（供 UI 生成下拉框和说明）
export const ALGORITHMS = [
  {
    id: 'q-learning',
    label: 'Q-Learning',
    desc: 'Off-policy · 学最优策略但按 ε-greedy 行动',
    formula: 'Q(s,a) ← Q(s,a) + α[r + γ maxₐ′ Q(s′,a′) − Q(s,a)]',
  },
  {
    id: 'sarsa',
    label: 'SARSA',
    desc: 'On-policy · 行动和更新用同一策略',
    formula: 'Q(s,a) ← Q(s,a) + α[r + γ Q(s′,a′) − Q(s,a)]',
  },
  {
    id: 'expected-sarsa',
    label: 'Expected SARSA',
    desc: '低方差的 SARSA：用策略下的期望 Q 代替采样',
    formula: 'Q(s,a) ← Q(s,a) + α[r + γ Σπ(a′|s′)Q(s′,a′) − Q(s,a)]',
  },
  {
    id: 'double-q',
    label: 'Double Q-Learning',
    desc: '双 Q 表交替更新，消除最大化偏差',
    formula: 'QA ← QA + α[r + γ QB(s′, argmaxₐ′ QA(s′,a′)) − QA]',
  },
  {
    id: 'dyna-q',
    label: 'Dyna-Q',
    desc: '基于模型的规划：真实交互 + N 次虚拟回放',
    formula: '真实更新 + N 次 (s,a)→(r,s′) 随机重放',
  },
];

// ε 衰减策略
export const DECAY_SCHEDULES = [
  { id: 'constant',    label: '恒定',    desc: 'ε 始终保持滑动条当前值' },
  { id: 'linear',      label: '线性衰减', desc: '每回合线性减少到 ε_min' },
  { id: 'exponential', label: '指数衰减', desc: '每回合乘以 decay ∈ (0,1)' },
];

// 可视化叠加层
export const OVERLAYS = [
  { id: 'heatmap',   label: 'Q 热力图',  desc: '按 max Q(s,·) 着色' },
  { id: 'policy',    label: '策略箭头',  desc: '每格画出 argmax 动作' },
  { id: 'quadrants', label: '四向 Q 值', desc: '每格分 4 个三角显示方向 Q' },
  { id: 'value',     label: '状态价值',  desc: '显示 V(s)=max_a Q(s,a) 数字' },
  { id: 'none',      label: '关闭',      desc: '只渲染地形和勇者' },
];

export const DEFAULT_GRID_SIZE = 12;
export const MIN_GRID_SIZE = 5;
export const MAX_GRID_SIZE = 20;

// 轨迹拖尾保留步数
export const TRAIL_LENGTH = 18;

// 经典 RL 教科书场景预设
// 每个 preset 返回 { gridSize, grid, start, rewards?, slipProb?, note }

import { TILES, DEFAULT_REWARDS } from './constants.js';

const { EMPTY, WALL, BREAD, TREASURE, TRAP } = TILES;

function make(n, fill = EMPTY) {
  return Array.from({ length: n }, () => Array(n).fill(fill));
}

function emptyPreset() {
  const n = 12;
  const g = make(n);
  g[1][n - 2] = TREASURE;
  return {
    id: 'empty',
    label: '空旷世界',
    note: '最简单的场景：从左下走到右上的宝箱（确定性环境）',
    gridSize: n,
    grid: g,
    start: { row: n - 1, col: 0 },
    slipProb: 0,
  };
}

// 经典 Cliff Walking（Sutton & Barto 6.6）
function cliffPreset() {
  const n = 12;
  const g = make(n);
  // 最底一行从 col 1 到 col n-2 全是陷阱，终点在右下
  for (let c = 1; c < n - 1; c++) g[n - 1][c] = TRAP;
  g[n - 1][n - 1] = TREASURE;
  return {
    id: 'cliff',
    label: '悬崖漫步',
    note: 'SARSA 会学会绕远路，Q-Learning 敢贴着悬崖走（经典确定性环境）',
    gridSize: n,
    grid: g,
    start: { row: n - 1, col: 0 },
    slipProb: 0,
  };
}

// Four Rooms（Sutton 1999）
function fourRoomsPreset() {
  const n = 11;
  const g = make(n);
  const mid = Math.floor(n / 2);
  // 四面外墙不画（边界自动当墙），只画内部十字墙
  for (let c = 0; c < n; c++) g[mid][c] = WALL;
  for (let r = 0; r < n; r++) g[r][mid] = WALL;
  // 开 4 个门
  g[mid][Math.floor(mid / 2)]       = EMPTY;
  g[mid][mid + Math.floor(mid / 2)] = EMPTY;
  g[Math.floor(mid / 2)][mid]       = EMPTY;
  g[mid + Math.floor(mid / 2)][mid] = EMPTY;
  g[0][n - 1] = TREASURE;
  return {
    id: 'four-rooms',
    label: '四房间',
    note: '看 Q 值如何通过狭窄门洞传播到隔壁房间（确定性环境）',
    gridSize: n,
    grid: g,
    start: { row: n - 1, col: 0 },
    slipProb: 0,
  };
}

// 风之网格（固定滑动效果）——这里用 slipProb 近似，纯粹地形无变化
function windyPreset() {
  const n = 12;
  const g = make(n);
  // 路径上撒一些面包作为稀疏奖励
  g[n - 3][3] = BREAD;
  g[n - 5][6] = BREAD;
  g[n - 8][8] = BREAD;
  g[2][n - 2] = TREASURE;
  // 中间几条竖墙模拟"风"的推挤感
  for (let r = 3; r < n - 2; r++) g[r][4] = WALL;
  g[6][4] = EMPTY; g[9][4] = EMPTY;
  return {
    id: 'windy',
    label: '风之网格',
    note: '有面包奖励（+1）可以"捡经验"，配合 30% 滑动概率',
    gridSize: n,
    grid: g,
    start: { row: n - 1, col: 0 },
    slipProb: 0.3,
  };
}

// Frozen Lake 风格（稀疏陷阱 + 高滑动）
function frozenLakePreset() {
  const n = 8;
  const g = make(n);
  const traps = [[1,1],[1,3],[2,3],[3,5],[4,3],[5,1],[5,3],[5,6]];
  traps.forEach(([r, c]) => { g[r][c] = TRAP; });
  g[n - 1][n - 1] = TREASURE;
  return {
    id: 'frozen-lake',
    label: '冰湖',
    note: '稀疏陷阱 + 50% 滑动概率，考验算法稳健性',
    gridSize: n,
    grid: g,
    start: { row: 0, col: 0 },
    slipProb: 0.5,
  };
}

export const PRESETS = [
  emptyPreset(),
  cliffPreset(),
  fourRoomsPreset(),
  windyPreset(),
  frozenLakePreset(),
];

export function getPreset(id) {
  return PRESETS.find(p => p.id === id) ?? PRESETS[0];
}

export { DEFAULT_REWARDS };

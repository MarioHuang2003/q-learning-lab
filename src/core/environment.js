// MazeEnvironment — 支持：
//  · 可变网格
//  · 随机滑动概率（slipProb）
//  · 自定义奖励表
//  · 可移动起点
//  · 多终点（任何 treasure/trap 都会结束回合）
//
// 纯状态机，不含 DOM 代码。

import { ACTIONS, ACTION_DELTA, TILES, DEFAULT_REWARDS } from './constants.js';

export class MazeEnvironment {
  constructor({ gridSize = 10, rewards = DEFAULT_REWARDS, slipProb = 0 } = {}) {
    this.gridSize  = gridSize;
    this.rewards   = { ...DEFAULT_REWARDS, ...rewards };
    this.slipProb  = slipProb;
    this.gridData  = this._emptyGrid(gridSize);
    this.startPos  = { row: 0, col: 0 };
    this.agentPos  = { row: 0, col: 0 };
  }

  _emptyGrid(n) {
    return Array.from({ length: n }, () => Array(n).fill(TILES.EMPTY));
  }

  // 换一张全新地图（可连带改变 gridSize）
  setGrid(gridData) {
    this.gridData = gridData;
    this.gridSize = gridData.length;
    this._clampStart();
  }

  setRewards(rewards) {
    this.rewards = { ...DEFAULT_REWARDS, ...rewards };
  }

  setSlipProb(p) {
    this.slipProb = Math.max(0, Math.min(1, p));
  }

  setStart(row, col) {
    if (this._inBounds(row, col) && this.gridData[row][col] !== TILES.WALL) {
      this.startPos = { row, col };
      this.agentPos = { row, col };
      return true;
    }
    return false;
  }

  resize(newSize) {
    const old = this.gridData;
    const oldN = old.length;
    const n = newSize;
    if (n === oldN) return;
    const fresh = this._emptyGrid(n);
    const copySize = Math.min(oldN, n);
    for (let r = 0; r < copySize; r++) {
      for (let c = 0; c < copySize; c++) {
        fresh[r][c] = old[r][c];
      }
    }
    this.gridData = fresh;
    this.gridSize = n;
    this._clampStart();
  }

  // 一次性加载 preset：比 resize + setGrid + setStart 三连快得多，
  // 也避免了 setGrid 内部 _clampStart 和外部 setStart 的重复工作。
  loadPreset(preset) {
    const n = preset.gridSize;
    this.gridSize = n;
    // 深拷贝一次，防止与 PRESETS 共享引用
    this.gridData = preset.grid.map(row => row.slice());
    const sr = preset.start.row;
    const sc = preset.start.col;
    this.startPos = { row: sr, col: sc };
    this.agentPos = { row: sr, col: sc };
    if (preset.slipProb != null) this.setSlipProb(preset.slipProb);
  }

  reset() {
    this.agentPos = { ...this.startPos };
    return this.getState();
  }

  getState() {
    return `${this.agentPos.row},${this.agentPos.col}`;
  }

  stateAt(row, col) {
    return `${row},${col}`;
  }

  getTile(row, col) {
    if (!this._inBounds(row, col)) return TILES.WALL;
    return this.gridData[row][col];
  }

  // 应用滑动概率：以 slipProb/2 概率向两侧滑动（perpendicular slip）
  _applySlip(action) {
    if (this.slipProb <= 0) return action;
    if (Math.random() >= this.slipProb) return action;
    // 垂直方向两个滑动候选
    const perpendicular = {
      up:    ['left', 'right'],
      down:  ['left', 'right'],
      left:  ['up',   'down'],
      right: ['up',   'down'],
    }[action];
    return perpendicular[Math.floor(Math.random() * perpendicular.length)];
  }

  step(intendedAction) {
    const action = this._applySlip(intendedAction);
    const { dr, dc } = ACTION_DELTA[action];
    const { row, col } = this.agentPos;
    const newRow = row + dr;
    const newCol = col + dc;

    let tileType;
    let nextPos;

    if (!this._inBounds(newRow, newCol)) {
      tileType = TILES.WALL;
      nextPos  = { row, col };
    } else {
      tileType = this.gridData[newRow][newCol];
      nextPos  = tileType === TILES.WALL
        ? { row, col }
        : { row: newRow, col: newCol };
    }

    const { reward, done } = this.rewards[tileType] ?? this.rewards[TILES.EMPTY];

    this.agentPos = nextPos;

    return {
      nextState: `${nextPos.row},${nextPos.col}`,
      nextPos,
      reward,
      done,
      tileType,
      intendedAction,
      actualAction: action,
      slipped: action !== intendedAction,
    };
  }

  _inBounds(r, c) {
    return r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize;
  }

  _clampStart() {
    const { row, col } = this.startPos;
    const r = Math.min(row, this.gridSize - 1);
    const c = Math.min(col, this.gridSize - 1);
    if (this.gridData[r][c] === TILES.WALL) {
      this.startPos = { row: 0, col: 0 };
    } else {
      this.startPos = { row: r, col: c };
    }
    this.agentPos = { ...this.startPos };
  }

  // 快速枚举所有非墙格子（值迭代等用得上）
  *iterStates() {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.gridData[r][c] !== TILES.WALL) yield { row: r, col: c };
      }
    }
  }
}

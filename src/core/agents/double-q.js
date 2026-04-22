// Double Q-Learning —— 维护两张 Q 表 QA/QB，每步随机选一张做更新
// 规避 max 算子对噪声的乐观偏差，学得更稳。
//
// 注意：对外暴露的 qTable 始终是 (QA+QB)/2，这样渲染层无需感知算法细节。

import { BaseAgent } from './base.js';
import { ACTIONS } from '../constants.js';

export class DoubleQAgent extends BaseAgent {
  static AGENT_ID = 'double-q';

  constructor(opts) {
    super(opts);
    this.qA = new Map();
    this.qB = new Map();
  }

  _getQAB(stateKey, table) {
    if (!table.has(stateKey)) table.set(stateKey, new Float64Array(4));
    return table.get(stateKey);
  }

  _argmaxOf(q) {
    let best = -Infinity;
    const ties = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i] > best) { best = q[i]; ties.length = 0; ties.push(i); }
      else if (q[i] === best) ties.push(i);
    }
    return ties[Math.floor(Math.random() * ties.length)];
  }

  // 决策时用 QA+QB 的平均
  _selectAction(state) {
    if (Math.random() < this.epsilon) {
      return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    }
    const a = this._getQAB(state, this.qA);
    const b = this._getQAB(state, this.qB);
    const sum = new Float64Array(4);
    for (let i = 0; i < 4; i++) sum[i] = a[i] + b[i];
    return ACTIONS[this._argmaxOf(sum)];
  }

  _update({ state, action, reward, nextState, done }) {
    const actIdx = ACTIONS.indexOf(action);
    const updateA = Math.random() < 0.5;
    const [primary, secondary] = updateA ? [this.qA, this.qB] : [this.qB, this.qA];
    const qCur  = this._getQAB(state, primary);

    let target;
    if (done) {
      target = reward;
    } else {
      const pNext = this._getQAB(nextState, primary);
      const sNext = this._getQAB(nextState, secondary);
      // 用 primary 选 argmax 动作，secondary 估值
      const bestIdx = this._argmaxOf(pNext);
      target = reward + this.gamma * sNext[bestIdx];
    }

    const tdError = target - qCur[actIdx];
    qCur[actIdx] += this.alpha * tdError;

    // 同步对外的 qTable：当前状态的 Q = (A+B)/2
    this._syncAverage(state);
    return tdError;
  }

  _syncAverage(stateKey) {
    const a = this._getQAB(stateKey, this.qA);
    const b = this._getQAB(stateKey, this.qB);
    const avg = this._getQ(stateKey); // base class 的 qTable
    for (let i = 0; i < 4; i++) avg[i] = (a[i] + b[i]) * 0.5;
  }

  resetAll() {
    super.resetAll();
    this.qA = new Map();
    this.qB = new Map();
  }

  exportSnapshot() {
    const base = super.exportSnapshot();
    const serialize = (m) => {
      const o = {};
      for (const [k, v] of m) o[k] = Array.from(v);
      return o;
    };
    base.qA = serialize(this.qA);
    base.qB = serialize(this.qB);
    return base;
  }

  importSnapshot(snap) {
    super.importSnapshot(snap);
    this.qA = new Map();
    this.qB = new Map();
    if (snap?.qA) for (const [k, v] of Object.entries(snap.qA)) this.qA.set(k, Float64Array.from(v));
    if (snap?.qB) for (const [k, v] of Object.entries(snap.qB)) this.qB.set(k, Float64Array.from(v));
  }
}

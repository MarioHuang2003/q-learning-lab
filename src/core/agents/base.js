// BaseAgent —— 所有 RL 算法的共用骨架
// 提供：Q 表管理、ε-greedy、统计量、参数热更新
// 子类必须覆写 _update(transition)，并可覆写 _selectAction(state)

import { ACTIONS } from '../constants.js';

export class BaseAgent {
  constructor({ alpha = 0.1, gamma = 0.9, epsilon = 0.3 } = {}) {
    this.alpha   = alpha;
    this.gamma   = gamma;
    this.epsilon = epsilon;

    this.qTable = new Map();

    // 跨回合统计
    this.episodeCount  = 0;
    this.totalSteps    = 0;
    this.totalReward   = 0;

    // 本回合统计
    this.episodeSteps  = 0;
    this.episodeReward = 0;

    // 最近若干回合（供图表使用）
    this.history = {
      rewards:  [],   // 每回合总奖励
      steps:    [],   // 每回合步数
      tdErrors: [],   // 每步 |TD error| 的滚动均值
    };
    this._tdAccum = 0;
    this._tdCount = 0;
  }

  // === 子类可覆盖：动作选择与 Q 更新 =====================================

  _selectAction(state) {
    if (Math.random() < this.epsilon) {
      return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    }
    return ACTIONS[this._argmax(this._getQ(state))];
  }

  // 返回 TD error（绝对值），用于可视化
  _update(/* transition */) {
    throw new Error('_update must be implemented by subclass');
  }

  // === 公共辅助 =========================================================

  _getQ(stateKey, table) {
    const t = table ?? this.qTable;
    if (!t.has(stateKey)) t.set(stateKey, new Float64Array(4));
    return t.get(stateKey);
  }

  _argmax(qVals) {
    let best = -Infinity;
    const ties = [];
    for (let i = 0; i < qVals.length; i++) {
      if (qVals[i] > best) { best = qVals[i]; ties.length = 0; ties.push(i); }
      else if (qVals[i] === best) ties.push(i);
    }
    return ties[Math.floor(Math.random() * ties.length)];
  }

  // 某状态下 ε-greedy 策略对每个动作的概率（Expected SARSA 用）
  _policyProbs(stateKey) {
    const q = this._getQ(stateKey);
    const best = this._argmax(q);
    const n = ACTIONS.length;
    const probs = new Array(n).fill(this.epsilon / n);
    probs[best] += 1 - this.epsilon;
    return probs;
  }

  setParams({ alpha, gamma, epsilon } = {}) {
    if (alpha   !== undefined) this.alpha   = alpha;
    if (gamma   !== undefined) this.gamma   = gamma;
    if (epsilon !== undefined) this.epsilon = epsilon;
  }

  // 与环境进行一步交互的通用流程
  step(env) {
    const state  = env.getState();
    const action = this._selectAction(state);
    const transition = env.step(action);
    transition.state = state;
    transition.action = action;
    // 子类的 _update 可能需要选择/生成 nextAction（SARSA），在此之前没有
    const tdError = this._update(transition, env);

    // 统计
    this.totalSteps++;
    this.episodeSteps++;
    this.episodeReward += transition.reward;
    this.totalReward   += transition.reward;

    this._tdAccum += Math.abs(tdError);
    this._tdCount++;

    const done = transition.done;
    const result = {
      ...transition,
      tdError,
      totalSteps:    this.totalSteps,
      episodeSteps:  this.episodeSteps,
      episodeReward: this.episodeReward,
      totalReward:   this.totalReward,
      episodeCount:  this.episodeCount,
    };

    if (done) {
      this.episodeCount++;
      result.episodeCount = this.episodeCount;

      this.history.rewards.push(this.episodeReward);
      this.history.steps.push(this.episodeSteps);
      const avgTd = this._tdCount > 0 ? this._tdAccum / this._tdCount : 0;
      this.history.tdErrors.push(avgTd);
      this._trimHistory();

      env.reset();

      this.episodeSteps  = 0;
      this.episodeReward = 0;
      this._tdAccum = 0;
      this._tdCount = 0;

      this._onEpisodeEnd?.(env);
    }

    return result;
  }

  _trimHistory(max = 500) {
    for (const key of Object.keys(this.history)) {
      const arr = this.history[key];
      if (arr.length > max) arr.splice(0, arr.length - max);
    }
  }

  resetAll() {
    this.qTable = new Map();
    this.episodeCount  = 0;
    this.totalSteps    = 0;
    this.totalReward   = 0;
    this.episodeSteps  = 0;
    this.episodeReward = 0;
    this._tdAccum = 0;
    this._tdCount = 0;
    this.history = { rewards: [], steps: [], tdErrors: [] };
  }

  // ==== 查询接口（渲染层使用）==========================================

  getQValues(row, col) {
    const k = `${row},${col}`;
    return this.qTable.has(k) ? this.qTable.get(k) : null;
  }

  getMaxQ(row, col) {
    const q = this.getQValues(row, col);
    return q ? Math.max(...q) : 0;
  }

  getBestAction(row, col) {
    const q = this.getQValues(row, col);
    return q ? ACTIONS[this._argmax(q)] : null;
  }

  getQRange() {
    let min = Infinity, max = -Infinity;
    for (const q of this.qTable.values()) {
      for (const v of q) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (!isFinite(min)) return { min: 0, max: 0 };
    return { min, max };
  }

  get exploredStates() {
    return this.qTable.size;
  }

  exportSnapshot() {
    const obj = {};
    for (const [k, v] of this.qTable) obj[k] = Array.from(v);
    return {
      algorithm: this.constructor.AGENT_ID,
      params: { alpha: this.alpha, gamma: this.gamma, epsilon: this.epsilon },
      stats: {
        episodeCount: this.episodeCount,
        totalSteps:   this.totalSteps,
        totalReward:  this.totalReward,
      },
      qTable: obj,
      history: {
        rewards:  [...this.history.rewards],
        steps:    [...this.history.steps],
        tdErrors: [...this.history.tdErrors],
      },
    };
  }

  importSnapshot(snap) {
    if (!snap) return;
    if (snap.params) this.setParams(snap.params);
    this.qTable = new Map();
    if (snap.qTable) {
      for (const [k, v] of Object.entries(snap.qTable)) {
        this.qTable.set(k, Float64Array.from(v));
      }
    }
    if (snap.stats) {
      this.episodeCount = snap.stats.episodeCount ?? 0;
      this.totalSteps   = snap.stats.totalSteps   ?? 0;
      this.totalReward  = snap.stats.totalReward  ?? 0;
    }
    if (snap.history) {
      this.history = {
        rewards:  [...(snap.history.rewards  ?? [])],
        steps:    [...(snap.history.steps    ?? [])],
        tdErrors: [...(snap.history.tdErrors ?? [])],
      };
    }
  }
}

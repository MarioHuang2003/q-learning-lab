// Dyna-Q —— Q-Learning + 基于模型的规划
// 每步真实交互之后，从已观测过的 (s,a) 中随机抽样 N 次做"虚拟回放"，
// 在少量交互下就能学得更快。当 planningSteps=0 时退化为普通 Q-Learning。

import { BaseAgent } from './base.js';
import { ACTIONS } from '../constants.js';

export class DynaQAgent extends BaseAgent {
  static AGENT_ID = 'dyna-q';

  constructor(opts = {}) {
    super(opts);
    this.planningSteps = opts.planningSteps ?? 10;
    // model: Map<stateKey, Map<actionIdx, {reward, nextState, done}>>
    this.model = new Map();
    // 曾经看到过的 (state, actionIdx) 清单（便于均匀采样）
    this._observed = [];
  }

  setPlanningSteps(n) {
    this.planningSteps = Math.max(0, n | 0);
  }

  _recordModel(state, actionIdx, reward, nextState, done) {
    if (!this.model.has(state)) {
      this.model.set(state, new Map());
      // 第一次见该 state 时下面不能无脑 push，要等具体 action 看到
    }
    const perState = this.model.get(state);
    const existed = perState.has(actionIdx);
    perState.set(actionIdx, { reward, nextState, done });
    if (!existed) this._observed.push([state, actionIdx]);
  }

  _qLearningUpdate(state, actionIdx, reward, nextState, done) {
    const qCur = this._getQ(state);
    const target = done
      ? reward
      : reward + this.gamma * Math.max(...this._getQ(nextState));
    const tdError = target - qCur[actionIdx];
    qCur[actionIdx] += this.alpha * tdError;
    return tdError;
  }

  _update({ state, action, reward, nextState, done }) {
    const actIdx = ACTIONS.indexOf(action);

    // 1) 真实经验更新
    const tdError = this._qLearningUpdate(state, actIdx, reward, nextState, done);

    // 2) 更新模型
    this._recordModel(state, actIdx, reward, nextState, done);

    // 3) N 次规划（从已观测过的 (s,a) 中随机采样）
    if (this.planningSteps > 0 && this._observed.length > 0) {
      for (let k = 0; k < this.planningSteps; k++) {
        const [s, aIdx] = this._observed[Math.floor(Math.random() * this._observed.length)];
        const sim = this.model.get(s)?.get(aIdx);
        if (!sim) continue;
        this._qLearningUpdate(s, aIdx, sim.reward, sim.nextState, sim.done);
      }
    }

    return tdError;
  }

  resetAll() {
    super.resetAll();
    this.model = new Map();
    this._observed = [];
  }
}

// SARSA —— on-policy TD 控制
// 与 Q-Learning 的差别在于用"下一步实际会采取的动作 a'"来更新 Q(s,a)。
// 这里的做法是：在 _update 里就提前为下一步采样动作并缓存，step() 下一轮直接用。

import { BaseAgent } from './base.js';
import { ACTIONS } from '../constants.js';

export class SarsaAgent extends BaseAgent {
  static AGENT_ID = 'sarsa';

  constructor(opts) {
    super(opts);
    this._pendingAction = null;
  }

  _selectAction(state) {
    if (this._pendingAction) {
      const a = this._pendingAction;
      this._pendingAction = null;
      return a;
    }
    return super._selectAction(state);
  }

  _update({ state, action, reward, nextState, done }) {
    const qCur = this._getQ(state);
    const actIdx = ACTIONS.indexOf(action);

    let target;
    if (done) {
      target = reward;
    } else {
      // 为 s' 采样下一动作 a'，同时缓存到 _pendingAction
      const nextAction = super._selectAction(nextState);
      this._pendingAction = nextAction;
      const qNext = this._getQ(nextState);
      target = reward + this.gamma * qNext[ACTIONS.indexOf(nextAction)];
    }

    const tdError = target - qCur[actIdx];
    qCur[actIdx] += this.alpha * tdError;
    return tdError;
  }

  _onEpisodeEnd() {
    this._pendingAction = null;
  }

  resetAll() {
    super.resetAll();
    this._pendingAction = null;
  }
}

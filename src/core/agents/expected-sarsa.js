// Expected SARSA —— 用 ε-greedy 策略下的期望 Q 代替单次采样
// 更新方差更低，收敛通常更平滑。

import { BaseAgent } from './base.js';
import { ACTIONS } from '../constants.js';

export class ExpectedSarsaAgent extends BaseAgent {
  static AGENT_ID = 'expected-sarsa';

  _update({ state, action, reward, nextState, done }) {
    const qCur = this._getQ(state);
    const actIdx = ACTIONS.indexOf(action);

    let target;
    if (done) {
      target = reward;
    } else {
      const qNext = this._getQ(nextState);
      const probs = this._policyProbs(nextState);
      let expected = 0;
      for (let i = 0; i < ACTIONS.length; i++) expected += probs[i] * qNext[i];
      target = reward + this.gamma * expected;
    }

    const tdError = target - qCur[actIdx];
    qCur[actIdx] += this.alpha * tdError;
    return tdError;
  }
}

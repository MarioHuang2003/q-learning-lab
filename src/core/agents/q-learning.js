import { BaseAgent } from './base.js';
import { ACTIONS } from '../constants.js';

export class QLearningAgent extends BaseAgent {
  static AGENT_ID = 'q-learning';

  _update({ state, action, reward, nextState }) {
    const qCur  = this._getQ(state);
    const qNext = this._getQ(nextState);
    const actIdx = ACTIONS.indexOf(action);
    const tdError = reward + this.gamma * Math.max(...qNext) - qCur[actIdx];
    qCur[actIdx] += this.alpha * tdError;
    return tdError;
  }
}

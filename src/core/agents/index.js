// 工厂：根据算法 id 构造 Agent
import { QLearningAgent }      from './q-learning.js';
import { SarsaAgent }          from './sarsa.js';
import { ExpectedSarsaAgent }  from './expected-sarsa.js';
import { DoubleQAgent }        from './double-q.js';
import { DynaQAgent }          from './dyna-q.js';

const REGISTRY = {
  'q-learning':     QLearningAgent,
  'sarsa':          SarsaAgent,
  'expected-sarsa': ExpectedSarsaAgent,
  'double-q':       DoubleQAgent,
  'dyna-q':         DynaQAgent,
};

export function createAgent(id, params) {
  const Cls = REGISTRY[id] ?? QLearningAgent;
  return new Cls(params);
}

export { QLearningAgent, SarsaAgent, ExpectedSarsaAgent, DoubleQAgent, DynaQAgent };

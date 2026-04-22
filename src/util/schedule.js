// ε 衰减调度器
// 使用方式：schedule.getEpsilon(episodeCount) → 当前应使用的 ε

export function createSchedule({ kind = 'constant', start = 0.3, min = 0.02, decay = 0.995 } = {}) {
  return {
    kind, start, min, decay,
    getEpsilon(episode) {
      if (kind === 'constant')    return start;
      if (kind === 'linear') {
        // 500 个回合内线性降到 min
        const t = Math.min(episode / 500, 1);
        return start + (min - start) * t;
      }
      if (kind === 'exponential') {
        return Math.max(min, start * Math.pow(decay, episode));
      }
      return start;
    },
  };
}

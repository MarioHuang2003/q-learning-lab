// 极简 pub/sub，供跨模块解耦通信
export class EventBus {
  constructor() { this.map = new Map(); }

  on(event, fn) {
    if (!this.map.has(event)) this.map.set(event, new Set());
    this.map.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) { this.map.get(event)?.delete(fn); }

  emit(event, payload) {
    const set = this.map.get(event);
    if (!set) return;
    for (const fn of set) { try { fn(payload); } catch (e) { console.error(e); } }
  }
}

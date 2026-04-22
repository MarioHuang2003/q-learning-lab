// 训练日志组件：追加、限长、自动滚动
export class LogView {
  constructor(container, { maxEntries = 120 } = {}) {
    this.container = container;
    this.max = maxEntries;
  }

  push(msg, kind = 'info') {
    const p = document.createElement('p');
    p.className = `log-entry log-${kind}`;
    p.textContent = msg;
    this.container.appendChild(p);
    while (this.container.children.length > this.max) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.scrollTop = this.container.scrollHeight;
  }

  clear() { this.container.innerHTML = ''; }
}

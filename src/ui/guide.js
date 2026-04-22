// 教学向导（Guide）
// 职责：
//   · 首次访问自动打开（localStorage 记录 version，大改内容时 bump 会重新弹）
//   · 顶栏「?」按钮随时打开
//   · 左侧章节导航 + 右侧滚动内容
//   · 键盘：Esc 关闭 · ↑/↓ 或 j/k 切换章节
//   · 完成后按"进入实验室"关闭

import { CHAPTERS, GUIDE_VERSION } from './guide-content.js';

const SEEN_KEY = 'reward-architect.guide-seen';

export class Guide {
  constructor() {
    this.overlay = document.getElementById('guideOverlay');
    this.sidebar = document.getElementById('guideSidebar');
    this.main    = document.getElementById('guideMain');
    this.closeBtn = document.getElementById('guideClose');
    this.doneBtn = document.getElementById('guideDone');
    this.progressEl = document.getElementById('guideProgress');
    this.activeId = CHAPTERS[0].id;
    this._onKey = this._onKey.bind(this);
  }

  mount() {
    this._buildSidebar();
    this._renderChapter(this.activeId);

    this.closeBtn?.addEventListener('click', () => this.close());
    this.doneBtn?.addEventListener('click', () => this.close(true));

    // 点击遮罩外关闭
    this.overlay?.addEventListener('mousedown', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // 首次自动弹
    if (!this._hasSeenCurrentVersion()) this.open();
  }

  // ============================================================
  //  Sidebar
  // ============================================================
  _buildSidebar() {
    this.sidebar.innerHTML = '';
    CHAPTERS.forEach((ch, i) => {
      const btn = document.createElement('button');
      btn.className = 'guide-nav-item';
      btn.dataset.id = ch.id;
      btn.innerHTML = `
        <span class="nav-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="nav-text">
          <span class="nav-title">${ch.title}</span>
          <span class="nav-lead">${ch.lead}</span>
        </span>
      `;
      btn.addEventListener('click', () => this._renderChapter(ch.id));
      this.sidebar.appendChild(btn);
    });
  }

  // ============================================================
  //  Chapter rendering
  // ============================================================
  _renderChapter(id) {
    const ch = CHAPTERS.find(c => c.id === id) ?? CHAPTERS[0];
    this.activeId = ch.id;

    const idx = CHAPTERS.indexOf(ch);
    const prev = CHAPTERS[idx - 1];
    const next = CHAPTERS[idx + 1];

    this.main.innerHTML = `
      <article class="guide-chapter">
        <header class="chapter-head">
          <div class="chapter-kicker">第 ${String(idx + 1).padStart(2, '0')} 章 / 共 ${CHAPTERS.length} 章</div>
          <h1 class="chapter-title">
            ${ch.title}
          </h1>
          <p class="chapter-lead">${ch.lead}</p>
        </header>
        <section class="chapter-body">${ch.body}</section>
        <nav class="chapter-pager">
          ${prev ? `<button class="pager-btn pager-prev" data-go="${prev.id}">
                     ← <span class="pager-label"><small>上一章</small>${prev.title}</span></button>` : '<span></span>'}
          ${next
             ? `<button class="pager-btn pager-next" data-go="${next.id}">
                  <span class="pager-label"><small>下一章</small>${next.title}</span> →
                </button>`
             : `<button class="pager-btn pager-done-inline" id="guideDoneInline">
                  <span class="pager-label"><small>教程结束</small>进入实验室</span> 🚀
                </button>`}
        </nav>
      </article>
    `;

    this.main.querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => this._renderChapter(btn.dataset.go));
    });
    this.main.querySelector('#guideDoneInline')?.addEventListener('click', () => this.close(true));

    // 高亮侧边栏
    this.sidebar.querySelectorAll('.guide-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === ch.id);
    });

    // 更新进度条
    if (this.progressEl) {
      const pct = Math.round(((idx + 1) / CHAPTERS.length) * 100);
      this.progressEl.style.width = pct + '%';
    }

    // 滚回顶部
    this.main.scrollTop = 0;
  }

  // ============================================================
  //  Open / Close
  // ============================================================
  open() {
    this.overlay.classList.add('is-open');
    document.body.classList.add('guide-locked');
    window.addEventListener('keydown', this._onKey);
  }

  close(markDone = false) {
    this.overlay.classList.remove('is-open');
    document.body.classList.remove('guide-locked');
    window.removeEventListener('keydown', this._onKey);
    if (markDone) this._markSeen();
  }

  isOpen() { return this.overlay.classList.contains('is-open'); }

  _onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
    const idx = CHAPTERS.findIndex(c => c.id === this.activeId);
    if ((e.key === 'j' || e.key === 'ArrowDown') && idx < CHAPTERS.length - 1) {
      e.preventDefault();
      this._renderChapter(CHAPTERS[idx + 1].id);
    } else if ((e.key === 'k' || e.key === 'ArrowUp') && idx > 0) {
      e.preventDefault();
      this._renderChapter(CHAPTERS[idx - 1].id);
    }
  }

  // ============================================================
  //  localStorage：版本号记录
  // ============================================================
  _hasSeenCurrentVersion() {
    try {
      const v = parseInt(localStorage.getItem(SEEN_KEY) || '0', 10);
      return v >= GUIDE_VERSION;
    } catch { return false; }
  }

  _markSeen() {
    try { localStorage.setItem(SEEN_KEY, String(GUIDE_VERSION)); } catch {}
  }
}

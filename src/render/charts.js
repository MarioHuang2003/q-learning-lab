// 折线图：高 DPI · 滑动平均 · 悬停准星 · 窗口缩放
//
// 用法：
//   const sp = new Sparkline(canvas, { color, negColor, emptyText, zeroLine });
//   sp.setTheme('dark' | 'light');
//   sp.setWindow(100 | Infinity);
//   sp.draw([...])

import { getPalette } from './palette.js';

const FONT = "'Nunito', sans-serif";

export class Sparkline {
  constructor(canvas, {
    color = '#22c55e',
    negColor = '#ef4444',
    label = '',
    emptyText = '训练后显示曲线',
    zeroLine = true,
  } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.color = color;
    this.negColor = negColor;
    this.label = label;
    this.emptyText = emptyText;
    this.zeroLine = zeroLine;
    this.theme = 'light';

    this._dpr = Math.max(1, window.devicePixelRatio || 1);
    this._data = [];
    this._window = Infinity;
    this._hover = null;            // {x, y, idx, val} in CSS pixels
    this._cachedLayout = null;     // 最近一次几何，用于 hover 反查

    this._onMove  = e => this._handleMove(e);
    this._onLeave = () => { this._hover = null; this._redraw(); };
    canvas.addEventListener('mousemove', this._onMove);
    canvas.addEventListener('mouseleave', this._onLeave);
    // 触屏
    canvas.addEventListener('touchstart', e => this._handleMove(e.touches[0]), { passive: true });
    canvas.addEventListener('touchmove',  e => this._handleMove(e.touches[0]), { passive: true });
    canvas.addEventListener('touchend',   this._onLeave);

    // 尺寸响应：日志折叠 / 面板变化时自动刷新内部分辨率
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._syncResolution());
      this._ro.observe(canvas);
    } else {
      window.addEventListener('resize', () => this._syncResolution());
    }
    this._syncResolution();
  }

  setTheme(t) { this.theme = t; this._redraw(); }

  setWindow(n) {
    this._window = (n == null || n <= 0) ? Infinity : n;
    this._redraw();
  }

  draw(data) {
    this._data = data || [];
    this._redraw();
  }

  // ───── 内部 ─────

  _syncResolution() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width  * this._dpr));
    const h = Math.max(1, Math.round(rect.height * this._dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width  = w;
      this.canvas.height = h;
    }
    this._redraw();
  }

  _sliceData() {
    const d = this._data;
    if (!d || d.length === 0) return { data: [], offset: 0 };
    if (!Number.isFinite(this._window) || d.length <= this._window) {
      return { data: d, offset: 0 };
    }
    const offset = d.length - this._window;
    return { data: d.slice(offset), offset };
  }

  _movingAverage(arr, win) {
    if (!arr.length) return [];
    const out = new Array(arr.length);
    let sum = 0;
    const q = [];
    for (let i = 0; i < arr.length; i++) {
      q.push(arr[i]); sum += arr[i];
      if (q.length > win) sum -= q.shift();
      out[i] = sum / q.length;
    }
    return out;
  }

  _redraw() {
    const ctx = this.ctx;
    const dpr = this._dpr;
    const Wcss = this.canvas.width  / dpr;
    const Hcss = this.canvas.height / dpr;
    const pal  = getPalette(this.theme);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Wcss, Hcss);

    const isDark = this.theme === 'dark';
    const fgMuted = isDark ? 'rgba(148,163,184,0.90)' : 'rgba(15,23,42,0.72)';
    const gridLine = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.10)';

    const { data, offset } = this._sliceData();

    const PAD = { top: 10, bottom: 12, left: 34, right: 8 };

    // 空状态
    if (!data || data.length < 2) {
      ctx.fillStyle = isDark ? 'rgba(226,232,240,0.45)' : 'rgba(15,23,42,0.40)';
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emptyText, Wcss / 2, Hcss / 2);
      this._cachedLayout = null;
      return;
    }

    const plotW = Wcss - PAD.left - PAD.right;
    const plotH = Hcss - PAD.top  - PAD.bottom;

    // 值域
    let minVal = Infinity, maxVal = -Infinity;
    for (const v of data) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    if (minVal === maxVal) { minVal -= 1; maxVal += 1; }
    const pad = (maxVal - minVal) * 0.10;
    minVal -= pad; maxVal += pad;
    const range = maxVal - minVal;

    const yOf = v => PAD.top + plotH * (1 - (v - minVal) / range);
    const xOf = i => PAD.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * plotW);

    // 零线（只在跨零时）
    if (this.zeroLine && minVal < 0 && maxVal > 0) {
      ctx.strokeStyle = gridLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(PAD.left, yOf(0));
      ctx.lineTo(PAD.left + plotW, yOf(0));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Y 轴标签 min / mid / max（大 11px，粗字）
    ctx.fillStyle = fgMuted;
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fmt(maxVal), 2, PAD.top - 3);
    ctx.textBaseline = 'bottom';
    ctx.fillText(fmt(minVal), 2, Hcss - PAD.bottom + 6);
    const midVal = (minVal + maxVal) / 2;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark ? 'rgba(148,163,184,0.55)' : 'rgba(15,23,42,0.40)';
    ctx.fillText(fmt(midVal), 2, yOf(midVal));

    // 末值颜色 —— 以最新值符号决定基色
    const lastVal = data[data.length - 1];
    const baseColor = lastVal >= 0 ? this.color : this.negColor;

    // 渐变填充（低 α）
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + plotH);
    grad.addColorStop(0, hexToRgba(baseColor, 0.22));
    grad.addColorStop(1, hexToRgba(baseColor, 0.02));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(xOf(0), PAD.top + plotH);
    for (let i = 0; i < data.length; i++) ctx.lineTo(xOf(i), yOf(data[i]));
    ctx.lineTo(xOf(data.length - 1), PAD.top + plotH);
    ctx.closePath();
    ctx.fill();

    // 原始曲线：数据密集时用淡薄线
    const densityFactor = data.length / Math.max(60, plotW);
    const rawAlpha = densityFactor <= 1 ? 1 : 0.35;
    const rawWidth = densityFactor <= 1 ? 1.8 : 1.1;

    ctx.strokeStyle = hexToRgba(baseColor, rawAlpha);
    ctx.lineWidth = rawWidth;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = xOf(i), y = yOf(data[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 滑动平均：训练久了用粗实线凸显趋势
    if (data.length >= 12) {
      const win = Math.max(3, Math.min(40, Math.floor(data.length / 20)));
      const ma = this._movingAverage(data, win);
      ctx.strokeStyle = hexToRgba(baseColor, 1);
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < ma.length; i++) {
        const x = xOf(i), y = yOf(ma[i]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 最新点圆点
    const lastX = xOf(data.length - 1);
    const lastY = yOf(lastVal);
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0f172a' : '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 缓存几何，用于 hover
    this._cachedLayout = { PAD, plotW, plotH, Wcss, Hcss, minVal, maxVal, offset, data };

    // Hover 叠加层
    if (this._hover) this._drawHoverOverlay();
  }

  _drawHoverOverlay() {
    const L = this._cachedLayout;
    if (!L) return;
    const ctx = this.ctx;
    const { PAD, plotH, Wcss, data } = L;

    // 反查最近索引
    const relX = this._hover.cssX - PAD.left;
    const frac = Math.max(0, Math.min(1, relX / (Wcss - PAD.left - PAD.right)));
    const idx  = Math.round(frac * (data.length - 1));
    const val  = data[idx];
    const x = PAD.left + (data.length === 1 ? 0 : (idx / (data.length - 1)) * (Wcss - PAD.left - PAD.right));
    const y = PAD.top + plotH * (1 - (val - L.minVal) / (L.maxVal - L.minVal));

    const isDark = this.theme === 'dark';
    const crossColor = isDark ? 'rgba(226,232,240,0.55)' : 'rgba(15,23,42,0.55)';

    ctx.strokeStyle = crossColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // 焦点圆
    const baseColor = val >= 0 ? this.color : this.negColor;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0f172a' : '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 数值气泡
    const episodeNum = L.offset + idx + 1;
    const label = `#${episodeNum}  ${fmt(val)}`;
    ctx.font = `700 10.5px ${FONT}`;
    const textW = ctx.measureText(label).width;
    const boxW = textW + 10, boxH = 18;
    let bx = x + 8;
    if (bx + boxW > Wcss - 2) bx = x - 8 - boxW;
    const by = Math.max(2, PAD.top + 2);

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.90)' : 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = isDark ? 'rgba(226,232,240,0.35)' : 'rgba(15,23,42,0.20)';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + 5, by + boxH / 2);
  }

  _handleMove(e) {
    if (!this._cachedLayout) return;
    const rect = this.canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    // 超出绘制区就当离开
    const L = this._cachedLayout;
    if (cssX < L.PAD.left - 4 || cssX > L.Wcss - L.PAD.right + 4) {
      if (this._hover) { this._hover = null; this._redraw(); }
      return;
    }
    this._hover = { cssX, cssY };
    this._redraw();
  }

  destroy() {
    this._ro?.disconnect();
    this.canvas.removeEventListener('mousemove', this._onMove);
    this.canvas.removeEventListener('mouseleave', this._onLeave);
  }
}

// ───── 工具函数 ─────

function fmt(v) {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1000) return (v / 1000).toFixed(1) + 'k';
  if (abs >= 100)  return v.toFixed(0);
  if (abs >= 10)   return v.toFixed(1);
  return v.toFixed(2);
}

function hexToRgba(hex, a) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb(')) return hex;
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

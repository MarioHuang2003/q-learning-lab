// MazeRenderer —— 动态网格、多种可视化叠加、主题切换
//
// 依赖：
//   palette：主题调色板对象
//   env    ：MazeEnvironment（gridSize、gridData、startPos）
//   agent  ：BaseAgent（getQValues、getBestAction、getQRange、exploredStates）
//   opts   ：{ overlay, showTrail, trail }

import { ACTIONS, ACTION_ANGLE, TILES, TRAIL_LENGTH } from '../core/constants.js';
import { getPalette } from './palette.js';

export class MazeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.theme  = 'light';
    this.hovered = null;
    this.flashes = [];
    this._animating = false;
    this._tickHandler = null;
  }

  setTheme(theme) { this.theme = theme; }

  // 往 flashes 列表里加一个 "+" 特效
  addFlash(row, col) {
    const now = performance.now();
    const hit = this.flashes.find(f => f.row === row && f.col === col);
    if (hit) { hit.startTime = now; return; }
    if (this.flashes.length > 60) this.flashes.shift();
    this.flashes.push({ row, col, startTime: now });
  }

  hasActiveFlashes() {
    const now = performance.now();
    return this.flashes.some(f => now - f.startTime < 900);
  }

  // 主渲染入口
  draw({ env, agent, overlay = 'heatmap', showTrail = true, trail = [] } = {}) {
    const pal = getPalette(this.theme);
    const ctx = this.ctx;
    const { width: W, height: H } = this.canvas;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = pal.canvas_bg;
    ctx.fillRect(0, 0, W, H);

    const n = env.gridSize;
    const cell = Math.min(W, H) / n;
    const offsetX = (W - cell * n) / 2;
    const offsetY = (H - cell * n) / 2;

    this._layout = { cell, offsetX, offsetY, n };

    // 1) 棋盘 & 地形
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        this._drawCellBackground(r, c, pal);
      }
    }

    // 2) 起点 / 终点高亮背景
    this._drawStartMark(env.startPos.row, env.startPos.col, pal);

    // 3) Q 值可视化叠加层（在地形下方，视觉上做成热力）
    if (agent && overlay !== 'none') {
      if (overlay === 'heatmap')   this._drawHeatmap(agent, pal);
      if (overlay === 'quadrants') this._drawQuadrants(agent, pal);
      if (overlay === 'value')     this._drawValueText(agent, pal);
    }

    // 4) 地形图元
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const type = env.gridData[r][c];
        if (type === TILES.WALL)     this._drawWall(r, c, pal);
        else if (type === TILES.BREAD)    this._drawBread(r, c, pal);
        else if (type === TILES.TREASURE) this._drawTreasure(r, c, pal);
        else if (type === TILES.TRAP)     this._drawTrap(r, c, pal);
      }
    }

    // 5) 策略箭头（画在地形之上）
    if (agent && overlay === 'policy') this._drawPolicyArrows(env, agent, pal);

    // 6) 轨迹拖尾
    if (showTrail && trail?.length > 1) this._drawTrail(trail, pal);

    // 7) 勇者
    this._drawAgent(env.agentPos.row, env.agentPos.col, pal);

    // 8) 网格线
    this._drawGridLines(pal);

    // 9) 悬停高亮
    if (this.hovered) this._drawHover(this.hovered.row, this.hovered.col, pal);

    // 10) "+" 特效
    this._drawFlashes(pal);
  }

  // Canvas 像素 → 格子坐标
  pixelToCell(px, py) {
    if (!this._layout) return null;
    const { cell, offsetX, offsetY, n } = this._layout;
    const c = Math.floor((px - offsetX) / cell);
    const r = Math.floor((py - offsetY) / cell);
    if (r < 0 || r >= n || c < 0 || c >= n) return null;
    return { row: r, col: c };
  }

  // === 绘制各层 =========================================================

  _cellXY(r, c) {
    const { cell, offsetX, offsetY } = this._layout;
    return { x: offsetX + c * cell, y: offsetY + r * cell, s: cell };
  }

  _drawCellBackground(r, c, pal) {
    const { x, y, s } = this._cellXY(r, c);
    this.ctx.fillStyle = (r + c) % 2 === 0 ? pal.bg_a : pal.bg_b;
    this.ctx.fillRect(x, y, s, s);
  }

  _drawStartMark(r, c, pal) {
    const { x, y, s } = this._cellXY(r, c);
    this.ctx.fillStyle = pal.start_fill;
    this.ctx.fillRect(x, y, s, s);
    this.ctx.strokeStyle = pal.start_stroke;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
  }

  _drawHover(r, c, pal) {
    const { x, y, s } = this._cellXY(r, c);
    this.ctx.fillStyle = pal.hover_fill;
    this.ctx.fillRect(x, y, s, s);
    this.ctx.strokeStyle = pal.hover_stroke;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
  }

  _drawGridLines(pal) {
    const { cell, offsetX, offsetY, n } = this._layout;
    this.ctx.strokeStyle = pal.grid;
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      const p = i * cell;
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, offsetY + p);
      this.ctx.lineTo(offsetX + n * cell, offsetY + p);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX + p, offsetY);
      this.ctx.lineTo(offsetX + p, offsetY + n * cell);
      this.ctx.stroke();
    }
  }

  // === 热力图：每格用最大 Q 值上色 ===
  _drawHeatmap(agent, pal) {
    const { min: gMin, max: gMax } = agent.getQRange();
    const posRef = Math.max(gMax,  5);
    const negRef = Math.min(gMin, -5);
    const n = this._layout.n;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const q = agent.getQValues(r, c);
        if (!q) continue;
        const maxQ = Math.max(...q);
        if (Math.abs(maxQ) < 0.05) continue;

        const { x, y, s } = this._cellXY(r, c);
        let rgb, norm;
        if (maxQ > 0) {
          norm = Math.min(maxQ / posRef, 1);
          rgb = pal.heat_pos;
          this.ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(norm * 0.45).toFixed(3)})`;
        } else {
          norm = Math.min(Math.abs(maxQ) / Math.abs(negRef), 1);
          rgb = pal.heat_neg;
          this.ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(norm * 0.40).toFixed(3)})`;
        }
        this.ctx.fillRect(x, y, s, s);

        // 数字标注（小于阈值不标注，避免杂乱）
        if (Math.abs(maxQ) >= 0.8 && s >= 36) {
          this._drawQCorner(r, c, maxQ, pal);
        }
      }
    }
  }

  _drawQCorner(r, c, v, pal) {
    const { x, y, s } = this._cellXY(r, c);
    this.ctx.save();
    this.ctx.font = `800 ${Math.round(s * 0.18)}px 'Nunito', sans-serif`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    const text = v >= 0 ? '+' + v.toFixed(1) : v.toFixed(1);
    this.ctx.strokeStyle = pal.heat_text_bg;
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(text, x + s - 4, y + 3);
    this.ctx.fillStyle = v >= 0 ? pal.heat_text_pos : pal.heat_text_neg;
    this.ctx.fillText(text, x + s - 4, y + 3);
    this.ctx.restore();
  }

  // === 四向 Q 值：每格分成 4 个三角 ===
  _drawQuadrants(agent, pal) {
    const { min: gMin, max: gMax } = agent.getQRange();
    const posRef = Math.max(gMax,  5);
    const negRef = Math.min(gMin, -5);
    const n = this._layout.n;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const q = agent.getQValues(r, c);
        if (!q) continue;
        this._drawCellQuadrants(r, c, q, posRef, negRef, pal);
      }
    }
  }

  _drawCellQuadrants(r, c, q, posRef, negRef, pal) {
    const { x, y, s } = this._cellXY(r, c);
    const cx = x + s / 2, cy = y + s / 2;
    const corners = [
      [x, y], [x + s, y], [x + s, y + s], [x, y + s],
    ];
    // 四个三角形按 up/right/down/left 顺序（从上方开始顺时针）
    // ACTIONS 顺序是 up, down, left, right，我们重新映射
    const triIndexByAction = { up: 0, right: 1, down: 2, left: 3 };
    for (const action of ACTIONS) {
      const qi = ACTIONS.indexOf(action);
      const v = q[qi];
      const triIdx = triIndexByAction[action];
      const p1 = corners[triIdx];
      const p2 = corners[(triIdx + 1) % 4];
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(p1[0], p1[1]);
      this.ctx.lineTo(p2[0], p2[1]);
      this.ctx.closePath();
      if (v > 0.05) {
        const norm = Math.min(v / posRef, 1);
        const [rr, gg, bb] = pal.heat_pos;
        this.ctx.fillStyle = `rgba(${rr},${gg},${bb},${(norm * 0.55).toFixed(3)})`;
      } else if (v < -0.05) {
        const norm = Math.min(Math.abs(v) / Math.abs(negRef), 1);
        const [rr, gg, bb] = pal.heat_neg;
        this.ctx.fillStyle = `rgba(${rr},${gg},${bb},${(norm * 0.45).toFixed(3)})`;
      } else continue;
      this.ctx.fill();
    }
  }

  // === 状态值文字 ===
  _drawValueText(agent, pal) {
    const n = this._layout.n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const q = agent.getQValues(r, c);
        if (!q) continue;
        const maxQ = Math.max(...q);
        if (Math.abs(maxQ) < 0.2) continue;
        this._drawQCorner(r, c, maxQ, pal);
      }
    }
  }

  // === 策略箭头 ===
  _drawPolicyArrows(env, agent, pal) {
    const n = this._layout.n;
    const s = this._layout.cell;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (env.gridData[r][c] === TILES.WALL) continue;
        const q = agent.getQValues(r, c);
        if (!q) continue;
        const maxQ = Math.max(...q);
        if (Math.abs(maxQ) < 0.3) continue;

        const { x, y } = this._cellXY(r, c);
        const cx = x + s / 2;
        const cy = y + s / 2;
        const best = agent.getBestAction(r, c);
        this._drawArrow(cx, cy, ACTION_ANGLE[best], s * 0.32, pal);
      }
    }
  }

  _drawArrow(cx, cy, angle, size, pal) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = pal.arrow_stroke;
    ctx.fillStyle   = pal.arrow_fill;
    ctx.lineWidth   = Math.max(1.5, size * 0.12);
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    const body = size * 0.75;
    ctx.beginPath();
    ctx.moveTo(-body, 0);
    ctx.lineTo( body * 0.5, 0);
    ctx.stroke();
    // 箭头三角
    ctx.beginPath();
    ctx.moveTo(body, 0);
    ctx.lineTo(body * 0.3, -size * 0.38);
    ctx.lineTo(body * 0.3,  size * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // === 轨迹拖尾 ===
  _drawTrail(trail, pal) {
    const s = this._layout.cell;
    const [rr, gg, bb] = pal.trail_color;
    const n = trail.length;
    for (let i = 0; i < n; i++) {
      const p = trail[i];
      const alpha = ((i + 1) / n) * 0.5;
      const radius = s * (0.10 + 0.15 * ((i + 1) / n));
      const { x, y } = this._cellXY(p.row, p.col);
      this.ctx.fillStyle = `rgba(${rr},${gg},${bb},${alpha.toFixed(3)})`;
      this.ctx.beginPath();
      this.ctx.arc(x + s / 2, y + s / 2, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // === 地形图元（卡通化，尺寸自适应）=========================

  _drawWall(r, c, pal) {
    const { x, y, s } = this._cellXY(r, c);
    const ctx = this.ctx;
    const pad = s * 0.08;
    const radius = s * 0.14;
    ctx.fillStyle = pal.wall_dark;
    this._roundRect(x + pad, y + pad + 3, s - pad * 2, s - pad * 2, radius); ctx.fill();
    ctx.fillStyle = pal.wall_body;
    this._roundRect(x + pad, y + pad, s - pad * 2, s - pad * 2, radius); ctx.fill();
    ctx.fillStyle = pal.wall_top;
    this._roundRect(x + pad, y + pad, s - pad * 2, (s - pad * 2) * 0.35, radius); ctx.fill();
    ctx.strokeStyle = pal.wall_line;
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(x + pad + 4, y + s / 2);
    ctx.lineTo(x + s - pad - 4, y + s / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + pad + 4);
    ctx.lineTo(x + s / 2, y + s - pad - 4);
    ctx.stroke();
    ctx.strokeStyle = pal.wall_dark;
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    this._roundRect(x + pad, y + pad, s - pad * 2, s - pad * 2, radius); ctx.stroke();
  }

  _drawBread(r, c, pal) {
    const { x, y, s } = this._cellXY(r, c);
    const ctx = this.ctx;
    const cx = x + s / 2, cy = y + s / 2 - 2;
    const rad = s * 0.26;
    ctx.fillStyle = pal.bread_dark;
    ctx.beginPath(); ctx.arc(cx, cy + 3, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.bread_body;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.bread_top;
    ctx.beginPath(); ctx.arc(cx, cy - rad * 0.15, rad * 0.85, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(cx - rad * 0.25, cy - rad * 0.30, rad * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.bread_dark;
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
    if (s >= 40) this._tileLabel('+1', cx, y + s - Math.max(8, s * 0.16), pal.bread_dark, s * 0.22);
  }

  _drawTreasure(r, c, pal) {
    const { x, y, s } = this._cellXY(r, c);
    const ctx = this.ctx;
    const cx = x + s / 2, cy = y + s / 2 - 3;
    const rad = s * 0.30;
    ctx.fillStyle = pal.chest_dark;
    this._star(cx, cy + 3, rad, rad * 0.50, 5); ctx.fill();
    ctx.fillStyle = pal.chest_body;
    this._star(cx, cy, rad, rad * 0.50, 5); ctx.fill();
    ctx.fillStyle = pal.chest_hi;
    this._star(cx - rad * 0.05, cy - rad * 0.12, rad * 0.65, rad * 0.32, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(cx - rad * 0.30, cy - rad * 0.35, rad * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.chest_dark;
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    this._star(cx, cy, rad, rad * 0.50, 5); ctx.stroke();
    if (s >= 40) this._tileLabel('+100', cx, y + s - Math.max(8, s * 0.14), pal.chest_dark, s * 0.20);
  }

  _drawTrap(r, c, pal) {
    const { x, y, s } = this._cellXY(r, c);
    const ctx = this.ctx;
    const cx = x + s / 2, cy = y + s / 2 - 2;
    const rad = s * 0.26;
    ctx.fillStyle = pal.trap_dark;
    ctx.beginPath(); ctx.arc(cx, cy + 3, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.trap_body;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.trap_hi;
    ctx.beginPath(); ctx.arc(cx, cy - rad * 0.15, rad * 0.85, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = pal.trap_dark;
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();

    const xr = rad * 0.40;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - xr, cy - xr); ctx.lineTo(cx + xr, cy + xr);
    ctx.moveTo(cx + xr, cy - xr); ctx.lineTo(cx - xr, cy + xr);
    ctx.stroke();
    ctx.lineCap = 'butt';
    if (s >= 40) this._tileLabel('−100', cx, y + s - Math.max(8, s * 0.14), pal.trap_dark, s * 0.20);
  }

  _tileLabel(text, cx, cy, darkColor, fontSize) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `800 ${Math.round(fontSize)}px 'Nunito', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 3;
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, cx, cy);
    ctx.restore();
  }

  _drawAgent(r, c, pal) {
    const { x, y, s } = this._cellXY(r, c);
    const ctx = this.ctx;
    const cx = x + s / 2, cy = y + s / 2;
    const rad = s * 0.32;
    ctx.fillStyle = pal.agent_dark;
    ctx.beginPath(); ctx.arc(cx, cy + 3, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.agent_body;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.agent_hi;
    ctx.beginPath(); ctx.arc(cx, cy - rad * 0.15, rad * 0.85, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = pal.agent_dark;
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();

    // 眼睛
    ctx.fillStyle = pal.agent_eye;
    ctx.beginPath();
    ctx.ellipse(cx - rad * 0.30, cy - rad * 0.15, rad * 0.18, rad * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + rad * 0.30, cy - rad * 0.15, rad * 0.18, rad * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.agent_pupil;
    ctx.beginPath(); ctx.arc(cx - rad * 0.27, cy - rad * 0.10, rad * 0.10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + rad * 0.33, cy - rad * 0.10, rad * 0.10, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = pal.agent_pupil;
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + rad * 0.06, rad * 0.34, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  _drawFlashes(pal) {
    if (this.flashes.length === 0) return;
    const now = performance.now();
    const DUR = 900;
    const s = this._layout.cell;
    const ctx = this.ctx;
    this.flashes = this.flashes.filter(f => now - f.startTime < DUR);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.flashes) {
      const t = (now - f.startTime) / DUR;
      const opacity = Math.pow(1 - t, 1.4);
      const scale = 0.45 + t * 1.20;
      const yOff = -t * 18;
      const { x, y } = this._cellXY(f.row, f.col);
      const cx = x + s / 2;
      const cy = y + s / 2 + yOff;
      const fontSize = Math.round(s * 0.48 * scale);
      ctx.font = `900 ${fontSize}px 'Nunito', sans-serif`;
      ctx.strokeStyle = `rgba(255,255,255,${(opacity * 0.8).toFixed(3)})`;
      ctx.lineWidth = 5;
      ctx.strokeText('+', cx, cy);
      const [rr, gg, bb] = pal.heat_pos;
      ctx.fillStyle = `rgba(${rr},${gg},${bb},${opacity.toFixed(3)})`;
      ctx.fillText('+', cx, cy);
    }
    ctx.restore();
  }

  // === 辅助几何 =========================================================

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
    ctx.closePath();
  }

  _star(cx, cy, outerR, innerR, points) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / points - Math.PI / 2;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}

export { TRAIL_LENGTH };

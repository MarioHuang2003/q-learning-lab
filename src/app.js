// 主应用：把 core / render / ui 粘起来
// 负责：UI 事件绑定、训练主循环、看板刷新、键盘快捷键、持久化

import {
  ACTIONS, TILES, DEFAULT_REWARDS, ALGORITHMS, DECAY_SCHEDULES, OVERLAYS,
  DEFAULT_GRID_SIZE, MIN_GRID_SIZE, MAX_GRID_SIZE, TRAIL_LENGTH,
} from './core/constants.js';
import { MazeEnvironment } from './core/environment.js';
import { createAgent }     from './core/agents/index.js';
import { PRESETS, getPreset } from './core/presets.js';

import { MazeRenderer }    from './render/maze.js';
import { Sparkline }       from './render/charts.js';

import { createSchedule }  from './util/schedule.js';
import { saveState, loadState, downloadJSON, uploadJSON } from './util/storage.js';

import { LogView } from './ui/log.js';
import { Guide }   from './ui/guide.js';

// ────────────────────────────────────────────────────────────
export class App {
  constructor() {
    this.state = {
      theme:    document.documentElement.dataset.theme || 'light',
      running:  false,
      stepMode: false,
      speed:    6,                    // 每帧执行 N 步
      brush:    'wall',
      overlay:  'heatmap',
      showTrail: true,
      algorithmId: 'q-learning',
      schedule: { kind: 'constant', start: 0.3, min: 0.02, decay: 0.995 },
      lastEpisodeReward: null,
      chartWindow: 0,          // 0 = 全部；50 / 100 = 最近 N 回合
      logExpanded: false,      // false = 折叠（只显示几条）；true = 展开（滚动查看更多）
    };

    // 核心对象
    this.env      = new MazeEnvironment({ gridSize: DEFAULT_GRID_SIZE });
    this.agent    = createAgent(this.state.algorithmId, { alpha: 0.10, gamma: 0.90, epsilon: 0.30 });
    this.renderer = null;
    this.trail    = [];
    this._animFrame = null;

    this._stats = { bestReward: -Infinity, best100: null };
    this._scheduleCache = null;
  }

  // ============================================================
  //  入口
  // ============================================================
  async start() {
    this._setupDOM();
    this._buildSelects();
    this._bindEvents();
    this._bindKeyboard();

    const restored = loadState();
    if (restored) this._restoreSnapshot(restored);
    else this._applyPreset('empty');

    // 应用图表窗口 & 日志折叠的初始状态
    this._setChartWindow(this.state.chartWindow ?? 0);
    this._applyLogCollapse();

    // 挂载教学向导（首次自动弹出）
    this.guide = new Guide();
    this.guide.mount();
    document.getElementById('btnGuide')?.addEventListener('click', () => this.guide.open());

    this.log.push('系统就绪。按 ? 重看教程，Space 开始训练，1–5 切换算法。', 'info');
    this._refreshAll();
  }

  // ============================================================
  //  DOM 引用
  // ============================================================
  _setupDOM() {
    this.$ = {
      canvas:   document.getElementById('gameCanvas'),

      // 顶栏
      themeToggle: document.getElementById('themeToggle'),
      presetSelect: document.getElementById('presetSelect'),
      btnSave:  document.getElementById('btnSave'),
      btnLoad:  document.getElementById('btnLoad'),
      btnReset: document.getElementById('btnReset'),

      // 算法
      algorithmSelect: document.getElementById('algorithmSelect'),
      algorithmDesc:   document.getElementById('algorithmDesc'),
      algorithmFormula: document.getElementById('algorithmFormula'),
      planningRow:     document.getElementById('planningRow'),
      planningSteps:   document.getElementById('planningSteps'),
      planningStepsVal: document.getElementById('planningStepsVal'),

      // 超参数
      alphaSlider:   document.getElementById('alpha'),
      gammaSlider:   document.getElementById('gamma'),
      epsilonSlider: document.getElementById('epsilon'),
      alphaVal:   document.getElementById('alphaVal'),
      gammaVal:   document.getElementById('gammaVal'),
      epsilonVal: document.getElementById('epsilonVal'),
      scheduleSelect: document.getElementById('scheduleSelect'),

      // 环境
      gridSize:     document.getElementById('gridSize'),
      gridSizeVal:  document.getElementById('gridSizeVal'),
      slipProb:     document.getElementById('slipProb'),
      slipProbVal:  document.getElementById('slipProbVal'),

      // 画笔
      brushes:     document.querySelectorAll('input[name="brush"]'),

      // 播放
      btnPlay:    document.getElementById('btnPlay'),
      btnStep:    document.getElementById('btnStep'),
      btnResetEp: document.getElementById('btnResetEp'),
      speedSlider: document.getElementById('speed'),
      speedVal:   document.getElementById('speedVal'),

      // 叠加层
      overlaySelect: document.getElementById('overlaySelect'),
      showTrail:     document.getElementById('showTrail'),

      // 状态栏
      epochDisplay:  document.getElementById('epochDisplay'),
      stepDisplay:   document.getElementById('stepDisplay'),
      rewardDisplay: document.getElementById('rewardDisplay'),
      lastEpReward:  document.getElementById('lastEpReward'),

      // 看板
      dashEpisode:     document.getElementById('dashEpisode'),
      dashEpReward:    document.getElementById('dashEpReward'),
      dashAvg100:      document.getElementById('dashAvg100'),
      dashBest:        document.getElementById('dashBest'),
      dashCoverage:    document.getElementById('dashCoverage'),
      dashTdError:     document.getElementById('dashTdError'),
      dashEpsilon:     document.getElementById('dashEpsilon'),

      // 图表
      chartReward:  document.getElementById('chartReward'),
      chartSteps:   document.getElementById('chartSteps'),
      chartTd:      document.getElementById('chartTd'),

      // 日志
      logPanel:   document.getElementById('logPanel'),
      logFoldBtn: document.getElementById('logFoldBtn'),
      logScroll:  document.getElementById('logScroll'),

      // 图表工具条
      chartToolbar: document.querySelector('.chart-toolbar'),
    };

    this.renderer = new MazeRenderer(this.$.canvas);
    this.renderer.setTheme(this.state.theme);

    this.charts = {
      reward: new Sparkline(this.$.chartReward, { color: '#22c55e', negColor: '#ef4444', emptyText: '每回合收益' }),
      steps:  new Sparkline(this.$.chartSteps,  { color: '#0ea5e9', negColor: '#0ea5e9', emptyText: '每回合步数', zeroLine: false }),
      td:     new Sparkline(this.$.chartTd,     { color: '#a855f7', negColor: '#a855f7', emptyText: '平均 TD 误差',   zeroLine: false }),
    };
    for (const c of Object.values(this.charts)) c.setTheme(this.state.theme);

    this.log = new LogView(this.$.logScroll);
  }

  // ============================================================
  //  下拉菜单构建
  // ============================================================
  _buildSelects() {
    const fill = (el, items) => {
      el.innerHTML = '';
      for (const it of items) {
        const opt = document.createElement('option');
        opt.value = it.id;
        opt.textContent = it.label;
        el.appendChild(opt);
      }
    };
    fill(this.$.algorithmSelect, ALGORITHMS);
    fill(this.$.scheduleSelect,  DECAY_SCHEDULES);
    fill(this.$.overlaySelect,   OVERLAYS);
    fill(this.$.presetSelect,    PRESETS);

    this.$.algorithmSelect.value = this.state.algorithmId;
    this.$.overlaySelect.value   = this.state.overlay;
    this.$.scheduleSelect.value  = this.state.schedule.kind;

    this._updateAlgorithmInfo();
  }

  _updateAlgorithmInfo() {
    const meta = ALGORITHMS.find(a => a.id === this.state.algorithmId) ?? ALGORITHMS[0];
    this.$.algorithmDesc.textContent    = meta.desc;
    this.$.algorithmFormula.textContent = meta.formula;
    // 只有 Dyna-Q 需要 planningSteps
    this.$.planningRow.classList.toggle('hidden', this.state.algorithmId !== 'dyna-q');
  }

  // ============================================================
  //  事件绑定
  // ============================================================
  _bindEvents() {
    // 主题
    this.$.themeToggle.addEventListener('click', () => this._toggleTheme());

    // 预设
    this.$.presetSelect.addEventListener('change', e => {
      this._applyPreset(e.target.value);
    });

    // 算法切换
    this.$.algorithmSelect.addEventListener('change', e => {
      this._switchAlgorithm(e.target.value);
    });

    // 规划步数（Dyna-Q）
    this._bindSliderNumber(this.$.planningSteps, this.$.planningStepsVal, v => {
      if (this.agent.setPlanningSteps) this.agent.setPlanningSteps(v);
    }, 0);

    // 超参数
    this._bindSliderNumber(this.$.alphaSlider,   this.$.alphaVal,   v => { this.agent.alpha = v; });
    this._bindSliderNumber(this.$.gammaSlider,   this.$.gammaVal,   v => { this.agent.gamma = v; });
    this._bindSliderNumber(this.$.epsilonSlider, this.$.epsilonVal, v => {
      this.state.schedule.start = v;
      this.agent.epsilon = this._currentEpsilon();
    });

    this.$.scheduleSelect.addEventListener('change', e => {
      this.state.schedule.kind = e.target.value;
      this.agent.epsilon = this._currentEpsilon();
      this._refreshDashboard();
    });

    // 环境：大小（只在"松手"时提交，避免拖动过程中反复重建 Q 表）
    this._bindSliderNumber(this.$.gridSize, this.$.gridSizeVal, v => {
      const n = v | 0;
      if (n === this.env.gridSize) return;   // 值没变就啥也别干
      this._pause();
      this.env.resize(n);
      this.agent.resetAll();
      this.trail.length = 0;
      this._scheduleCache = null;
      this._render();
      this._refreshAll();
      this._autosave();
      this.log.push(`网格尺寸调整为 ${n}×${n}，Q 表已清空`, 'event');
    }, 0, { commitOn: 'change', fireInitial: false });
    this._bindSliderNumber(this.$.slipProb, this.$.slipProbVal, v => {
      this.env.setSlipProb(v);
    });

    // 画笔
    this.$.brushes.forEach(el => el.addEventListener('change', () => {
      this.state.brush = document.querySelector('input[name="brush"]:checked').value;
    }));

    // 播放
    this.$.btnPlay.addEventListener('click', () => this._togglePlay());
    this.$.btnStep.addEventListener('click', () => this._singleStep());
    this.$.btnResetEp.addEventListener('click', () => this._resetEpisode());
    this._bindSliderNumber(this.$.speedSlider, this.$.speedVal, v => {
      this.state.speed = v;
    }, 0);

    // 叠加层
    this.$.overlaySelect.addEventListener('change', e => {
      this.state.overlay = e.target.value;
      this._render();
    });
    this.$.showTrail.addEventListener('change', e => {
      this.state.showTrail = e.target.checked;
      this._render();
    });

    // 顶栏：导入 / 导出 / 重置
    this.$.btnSave.addEventListener('click', () => this._exportJSON());
    this.$.btnLoad.addEventListener('click', () => this._importJSON());
    this.$.btnReset.addEventListener('click', () => this._fullReset());

    // Canvas 交互：左键绘制、右键设置起点
    this._bindCanvas();

    // 图表窗口切换
    if (this.$.chartToolbar) {
      this.$.chartToolbar.addEventListener('click', e => {
        const btn = e.target.closest('button[data-window]');
        if (!btn) return;
        const w = parseInt(btn.dataset.window, 10);
        this._setChartWindow(w);
      });
    }

    // 日志折叠
    this.$.logFoldBtn?.addEventListener('click', () => this._toggleLog());

    // 窗口尺寸变化时重绘
    window.addEventListener('resize', () => this._resizeCanvas());
    this._resizeCanvas();
  }

  _setChartWindow(n) {
    this.state.chartWindow = n;
    const active = n | 0;
    for (const btn of this.$.chartToolbar.querySelectorAll('button[data-window]')) {
      btn.classList.toggle('is-active', parseInt(btn.dataset.window, 10) === active);
    }
    const winVal = n > 0 ? n : Infinity;
    for (const c of Object.values(this.charts)) c.setWindow(winVal);
    this._autosave();
  }

  _toggleLog() {
    this.state.logExpanded = !this.state.logExpanded;
    this._applyLogCollapse();
    // 展开后把滚动条拉到最新
    if (this.state.logExpanded) {
      this.$.logScroll.scrollTop = this.$.logScroll.scrollHeight;
    }
    this._autosave();
  }

  _applyLogCollapse() {
    const expanded = !!this.state.logExpanded;
    this.$.logPanel.dataset.expanded = String(expanded);
    this.$.logFoldBtn.setAttribute('aria-expanded', String(expanded));
    this.$.logFoldBtn.setAttribute('aria-label', expanded ? '折叠日志' : '展开日志');
    this.$.logFoldBtn.title = expanded ? '折叠日志' : '展开日志';
    const chev = this.$.logFoldBtn.querySelector('.fold-chevron');
    if (chev) chev.textContent = expanded ? '▴' : '▾';
  }

  // 通用 slider 绑定。
  //   commitOn    'input'  - 拖动过程中实时触发（默认，适合 ε / α / γ / 速度等）
  //               'change' - 仅松手时触发（适合会重置 Q 表这种"重操作"）
  //   fireInitial 是否在绑定时立刻跑一次 onChange（默认 true，保持向后兼容）
  _bindSliderNumber(slider, label, onChange, digits = 2, opts = {}) {
    const { commitOn = 'input', fireInitial = true } = opts;
    const format = v => (digits === 0 ? String(v | 0) : v.toFixed(digits));
    const syncLabel = () => {
      label.textContent = format(parseFloat(slider.value));
    };

    slider.addEventListener('input', () => {
      syncLabel();
      if (commitOn === 'input') onChange(parseFloat(slider.value));
    });
    if (commitOn === 'change') {
      slider.addEventListener('change', () => onChange(parseFloat(slider.value)));
    }

    syncLabel();
    if (fireInitial && commitOn === 'input') {
      onChange(parseFloat(slider.value));
    }
  }

  _bindCanvas() {
    const c = this.$.canvas;
    let painting = false;
    let lastKey = null;

    const pixelOf = e => {
      const rect = c.getBoundingClientRect();
      return {
        px: (e.clientX - rect.left) * (c.width / rect.width),
        py: (e.clientY - rect.top)  * (c.height / rect.height),
      };
    };

    c.addEventListener('mousedown', e => {
      if (this.state.running) return;
      const { px, py } = pixelOf(e);
      const cell = this.renderer.pixelToCell(px, py);
      if (!cell) return;
      if (e.button === 2) {
        if (this.env.setStart(cell.row, cell.col)) {
          this.log.push(`起点设置为 (${cell.row}, ${cell.col})`, 'event');
          this._render();
        }
        return;
      }
      painting = true;
      lastKey = `${cell.row},${cell.col}`;
      this._paintCell(cell.row, cell.col);
    });

    c.addEventListener('mousemove', e => {
      const { px, py } = pixelOf(e);
      const cell = this.renderer.pixelToCell(px, py);
      this.renderer.hovered = this.state.running ? null : cell;
      if (painting && cell && !this.state.running) {
        const key = `${cell.row},${cell.col}`;
        if (key !== lastKey) {
          lastKey = key;
          this._paintCell(cell.row, cell.col, true /* skipLog */);
        }
      }
      if (!this.state.running) this._render();
    });

    c.addEventListener('mouseup',    () => { painting = false; lastKey = null; });
    c.addEventListener('mouseleave', () => {
      painting = false; lastKey = null;
      this.renderer.hovered = null;
      if (!this.state.running) this._render();
    });
    c.addEventListener('contextmenu', e => e.preventDefault());
  }

  _paintCell(row, col, skipLog = false) {
    if (row === this.env.startPos.row && col === this.env.startPos.col) return;
    const brush = this.state.brush;
    const cur = this.env.gridData[row][col];
    const labels = {
      wall: '墙壁', bread: '面包', treasure: '宝箱', trap: '陷阱', empty: '空地',
    };
    if (cur === brush) {
      this.env.gridData[row][col] = TILES.EMPTY;
      if (!skipLog) this.log.push(`(${row},${col}) 清空`, 'info');
    } else {
      this.env.gridData[row][col] = brush;
      if (!skipLog) this.log.push(`(${row},${col}) ${labels[cur]} → ${labels[brush]}`, 'event');
    }
    this._render();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      // 打开指南：? 或 Shift+/ —— 任何时候都可以按
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        this.guide?.open();
        return;
      }

      // 指南打开时其它快捷键由指南自己处理（Esc / ↑↓ / jk）
      if (this.guide?.isOpen()) return;

      if (e.code === 'Space') { e.preventDefault(); this._togglePlay(); return; }
      if (e.key === 's' || e.key === 'S') { this._singleStep(); return; }
      if (e.key === 'r' || e.key === 'R') { this._resetEpisode(); return; }
      if (e.key === 't' || e.key === 'T') { this._toggleTheme(); return; }

      if (['1','2','3','4','5'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < ALGORITHMS.length) {
          this.$.algorithmSelect.value = ALGORITHMS[idx].id;
          this._switchAlgorithm(ALGORITHMS[idx].id);
        }
      }
    });
  }

  // ============================================================
  //  画布尺寸自适应
  // ============================================================
  _resizeCanvas() {
    const c = this.$.canvas;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (c.width !== targetW || c.height !== targetH) {
      c.width = targetW;
      c.height = targetH;
    }
    this._render();
  }

  // ============================================================
  //  播放控制
  // ============================================================
  _togglePlay() {
    if (this.state.running) this._pause(); else this._play();
  }

  _play() {
    this.state.running = true;
    this.$.btnPlay.querySelector('.btn-icon').textContent = '⏸';
    this.$.btnPlay.querySelector('.btn-text').textContent = '暂停';
    this.$.btnPlay.classList.add('is-playing');
    this.$.canvas.classList.add('is-locked');
    const p = { alpha: this.agent.alpha, gamma: this.agent.gamma, epsilon: this.agent.epsilon };
    this.log.push(`▶ 开始训练  α=${p.alpha.toFixed(2)}  γ=${p.gamma.toFixed(2)}  ε=${p.epsilon.toFixed(2)}`, 'event');
    this._animFrame = requestAnimationFrame(() => this._loop());
  }

  _pause() {
    if (!this.state.running && !this._animFrame) return;
    this.state.running = false;
    this.$.btnPlay.querySelector('.btn-icon').textContent = '▶';
    this.$.btnPlay.querySelector('.btn-text').textContent = '开始';
    this.$.btnPlay.classList.remove('is-playing');
    this.$.canvas.classList.remove('is-locked');
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
    this.log.push(`⏸ 暂停  回合 ${this.agent.episodeCount}  总步 ${this.agent.totalSteps}`, 'info');
    this._autosave();
  }

  _singleStep() {
    if (this.state.running) return;
    this._doSteps(1);
    this._render();
    this._refreshAll();
  }

  _resetEpisode() {
    this._pause();
    this.env.reset();
    this.trail.length = 0;
    this._render();
    this._refreshAll();
    this.log.push('↺ 重置当前回合（Q 表保留）', 'info');
  }

  _loop() {
    try {
      this._doSteps(this.state.speed);
      this._render();
      this._refreshAll();
    } catch (err) {
      // 不要让异常静默杀死 rAF 链——打到日志里让你看到
      console.error('[train-loop]', err);
      this.log.push(`⚠ 训练循环异常：${err.message || err}`, 'penalty');
      this._pause();
      return;
    }
    if (this.state.running) this._animFrame = requestAnimationFrame(() => this._loop());
  }

  _doSteps(n) {
    for (let i = 0; i < n; i++) {
      // 每步从 ε 调度读取当前 ε
      this.agent.epsilon = this._currentEpsilon();

      const result = this.agent.step(this.env);
      // 轨迹拖尾：记录 agent 新位置
      this.trail.push({ ...result.nextPos });
      if (this.trail.length > TRAIL_LENGTH) this.trail.shift();

      // 正向 Q 值更新特效
      if (result.tdError > 1.0) {
        const [r, c] = result.state.split(',').map(Number);
        this.renderer.addFlash(r, c);
      }

      if (result.done) {
        this.state.lastEpisodeReward = result.episodeReward;
        if (result.episodeReward > this._stats.bestReward) {
          this._stats.bestReward = result.episodeReward;
        }
        this.trail.length = 0;

        if (result.episodeCount % 10 === 0) {
          const icon = result.tileType === TILES.TREASURE ? '🏆' : '⚡';
          const kind = result.tileType === TILES.TREASURE ? 'reward' : 'penalty';
          const sign = result.episodeReward >= 0 ? '+' : '';
          this.log.push(
            `${icon} 第 ${result.episodeCount} 回合  ${sign}${result.episodeReward.toFixed(1)}  步数 ${result.episodeSteps}  探索 ${this.agent.exploredStates} 格`,
            kind,
          );
        }
      }
    }
  }

  _currentEpsilon() {
    // 缓存 schedule 对象：仅当配置字段变化时才重建，
    // 避免训练热路径每步都 new 一个调度器。
    const s = this.state.schedule;
    const key = `${s.kind}|${s.start}|${s.min}|${s.decay}`;
    if (!this._scheduleCache || this._scheduleCache.key !== key) {
      this._scheduleCache = { key, impl: createSchedule(s) };
    }
    return this._scheduleCache.impl.getEpsilon(this.agent.episodeCount);
  }

  // ============================================================
  //  算法切换（保留地图，重新创建 agent）
  // ============================================================
  _switchAlgorithm(id) {
    this._pause();
    this.state.algorithmId = id;
    const { alpha, gamma, epsilon } = this.agent;
    this.agent = createAgent(id, { alpha, gamma, epsilon });
    if (id === 'dyna-q') this.agent.setPlanningSteps(parseInt(this.$.planningSteps.value, 10) || 10);
    this.trail.length = 0;
    this._updateAlgorithmInfo();
    this._refreshAll();
    const meta = ALGORITHMS.find(a => a.id === id);
    this.log.push(`🔀 切换到 ${meta.label}：Q 表已重建`, 'event');
  }

  // ============================================================
  //  预设应用
  // ============================================================
  _applyPreset(id) {
    // 切换前暂停训练，避免旧循环与新地图打架
    if (this.state.running) this._pause();

    const p = getPreset(id);

    // 一次性装载：env 内部直接深拷贝 + 设置起点 + 滑动概率，
    // 比原先 resize + setGrid + setStart 三步少了一次全网格 copy
    // 和一次 _clampStart 的无用功。
    this.env.loadPreset(p);

    this.agent.resetAll();
    this.trail.length = 0;
    this.state.lastEpisodeReward = null;
    this._stats.bestReward = -Infinity;
    this._scheduleCache = null;

    // UI 同步
    this.$.gridSize.value = String(p.gridSize);
    this.$.gridSizeVal.textContent = String(p.gridSize);
    // slipProb 无条件同步（预设没定义时按 0 处理），避免继承上个预设的值
    const slip = p.slipProb ?? 0;
    this.$.slipProb.value = String(slip);
    this.$.slipProbVal.textContent = slip.toFixed(2);
    this.$.presetSelect.value = id;

    this.log.push(`🗺 加载预设：${p.label}。${p.note}`, 'event');

    // 合批刷新：画布 + 仪表盘 + 自动保存，一次完成
    this._render();
    this._refreshAll();
    this._autosave();
  }

  // ============================================================
  //  渲染
  // ============================================================
  _render() {
    this.renderer.draw({
      env: this.env,
      agent: this.agent,
      overlay: this.state.overlay,
      showTrail: this.state.showTrail,
      trail: this.trail,
    });
  }

  _refreshAll() {
    this._refreshStatusBar();
    this._refreshDashboard();
    this._drawCharts();
  }

  _refreshStatusBar() {
    this.$.epochDisplay.textContent = this.agent.episodeCount;
    this.$.stepDisplay.textContent  = this.agent.episodeSteps;
    const r = this.agent.episodeReward;
    this.$.rewardDisplay.textContent = (r >= 0 ? '+' : '') + r.toFixed(2);
    this.$.rewardDisplay.dataset.sign = r >= 0 ? 'pos' : 'neg';

    if (this.state.lastEpisodeReward !== null) {
      const v = this.state.lastEpisodeReward;
      this.$.lastEpReward.textContent = (v >= 0 ? '+' : '') + v.toFixed(1);
      this.$.lastEpReward.dataset.sign = v >= 0 ? 'pos' : 'neg';
    } else {
      this.$.lastEpReward.textContent = '—';
      delete this.$.lastEpReward.dataset.sign;
    }
  }

  _refreshDashboard() {
    this.$.dashEpisode.textContent = this.agent.episodeCount;

    const r = this.agent.episodeReward;
    const epEl = this.$.dashEpReward;
    epEl.textContent = (r >= 0 ? '+' : '') + r.toFixed(1);
    epEl.dataset.sign = r >= 0 ? 'pos' : 'neg';

    const rewards = this.agent.history.rewards;
    const last100 = rewards.slice(-100);
    const avg = last100.length ? last100.reduce((a, b) => a + b, 0) / last100.length : 0;
    this.$.dashAvg100.textContent = (avg >= 0 ? '+' : '') + avg.toFixed(1);
    this.$.dashAvg100.dataset.sign = avg >= 0 ? 'pos' : 'neg';

    const best = this._stats.bestReward;
    const bestOk = Number.isFinite(best);
    this.$.dashBest.textContent = bestOk ? ((best >= 0 ? '+' : '') + best.toFixed(1)) : '—';
    this.$.dashBest.dataset.sign = bestOk ? (best >= 0 ? 'pos' : 'neg') : '';

    const totalCells = this.env.gridSize * this.env.gridSize;
    const pct = Math.round((this.agent.exploredStates / totalCells) * 100);
    this.$.dashCoverage.textContent = pct + '%';

    // TD 平均（最近 10 回合）
    const tdArr = this.agent.history.tdErrors.slice(-10);
    const tdAvg = tdArr.length ? tdArr.reduce((a, b) => a + b, 0) / tdArr.length : 0;
    this.$.dashTdError.textContent = tdAvg.toFixed(3);

    this.$.dashEpsilon.textContent = this.agent.epsilon.toFixed(3);
  }

  _drawCharts() {
    this.charts.reward.draw(this.agent.history.rewards);
    this.charts.steps.draw(this.agent.history.steps);
    this.charts.td.draw(this.agent.history.tdErrors);
  }

  // ============================================================
  //  主题
  // ============================================================
  _toggleTheme() {
    const t = this.state.theme === 'light' ? 'dark' : 'light';
    this.state.theme = t;
    document.documentElement.dataset.theme = t;
    this.renderer.setTheme(t);
    for (const c of Object.values(this.charts)) c.setTheme(t);
    this._render();
    this._drawCharts();
  }

  // ============================================================
  //  全量重置 / 存档 / 载入
  // ============================================================
  _fullReset() {
    this._pause();
    this.env = new MazeEnvironment({ gridSize: parseInt(this.$.gridSize.value, 10) });
    this.agent.resetAll();
    this.trail.length = 0;
    this.state.lastEpisodeReward = null;
    this._stats.bestReward = -Infinity;
    this.env.setSlipProb(parseFloat(this.$.slipProb.value));
    this.log.push('═══ 世界重置：地图清空，Q 表清空 ═══', 'event');
    this._refreshAll();
    this._render();
    this._autosave();
  }

  _exportJSON() {
    const snap = this._snapshot();
    downloadJSON(snap, `reward-architect-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`);
    this.log.push('💾 已导出训练快照 JSON', 'event');
  }

  async _importJSON() {
    try {
      const snap = await uploadJSON();
      if (!snap) return;
      this._pause();
      this._restoreSnapshot(snap);
      this._refreshAll();
      this.log.push('📥 已载入训练快照', 'event');
    } catch (e) {
      this.log.push('⚠ 载入失败：' + e.message, 'penalty');
    }
  }

  _snapshot() {
    return {
      version: 2,
      state: { ...this.state, running: false },
      env: {
        gridSize: this.env.gridSize,
        gridData: this.env.gridData,
        startPos: this.env.startPos,
        slipProb: this.env.slipProb,
      },
      agent: this.agent.exportSnapshot(),
      stats: { ...this._stats },
    };
  }

  _restoreSnapshot(snap) {
    if (!snap) return;
    if (snap.state) {
      this.state = { ...this.state, ...snap.state, running: false };
      // 兼容旧字段：logCollapsed → logExpanded 反转
      if (snap.state.logCollapsed !== undefined && snap.state.logExpanded === undefined) {
        this.state.logExpanded = !snap.state.logCollapsed;
      }
      delete this.state.logCollapsed;
      document.documentElement.dataset.theme = this.state.theme;
      this.renderer.setTheme(this.state.theme);
      for (const c of Object.values(this.charts)) c.setTheme(this.state.theme);
    }
    if (snap.env) {
      this.env = new MazeEnvironment({ gridSize: snap.env.gridSize, slipProb: snap.env.slipProb });
      this.env.setGrid(snap.env.gridData.map(r => [...r]));
      this.env.setStart(snap.env.startPos.row, snap.env.startPos.col);
    }
    if (snap.agent) {
      this.agent = createAgent(snap.agent.algorithm ?? this.state.algorithmId, snap.agent.params ?? {});
      this.agent.importSnapshot(snap.agent);
    }
    if (snap.stats) {
      this._stats = { ...this._stats, ...snap.stats };
      // JSON 不能保留 -Infinity，会反序列化成 null；这里归一化回 -Infinity
      if (!Number.isFinite(this._stats.bestReward)) this._stats.bestReward = -Infinity;
    }
    this._scheduleCache = null;

    // 同步 UI 控件
    this.$.algorithmSelect.value = this.state.algorithmId;
    this.$.overlaySelect.value   = this.state.overlay;
    this.$.scheduleSelect.value  = this.state.schedule.kind;
    this.$.alphaSlider.value     = String(this.agent.alpha);
    this.$.gammaSlider.value     = String(this.agent.gamma);
    this.$.epsilonSlider.value   = String(this.state.schedule.start);
    this.$.alphaVal.textContent  = this.agent.alpha.toFixed(2);
    this.$.gammaVal.textContent  = this.agent.gamma.toFixed(2);
    this.$.epsilonVal.textContent = this.state.schedule.start.toFixed(2);
    this.$.gridSize.value = String(this.env.gridSize);
    this.$.gridSizeVal.textContent = String(this.env.gridSize);
    this.$.slipProb.value = String(this.env.slipProb);
    this.$.slipProbVal.textContent = this.env.slipProb.toFixed(2);
    this.$.showTrail.checked = !!this.state.showTrail;
    this.$.speedSlider.value = String(this.state.speed);
    this.$.speedVal.textContent = String(this.state.speed);

    this._updateAlgorithmInfo();
    this._render();
  }

  _autosave() {
    saveState(this._snapshot());
  }
}

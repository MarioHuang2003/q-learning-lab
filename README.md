# AI 奖励建筑师 · 强化学习实验室

> 一个前端即可跑的**表格型强化学习教学/实验平台**。
> 自己设计迷宫，选择算法，观察勇者如何在你设定的奖励世界里学会最优策略——
> 实时看到 **Q 值热力图、策略箭头、每向 Q 值四象限、状态价值、TD 误差、学习曲线**。

🌐 **在线体验**：<https://TODO-REPLACE-WITH-YOUR-VERCEL-URL.vercel.app>  _(部署后请替换)_

![tech](https://img.shields.io/badge/HTML-5-orange) ![tech](https://img.shields.io/badge/ES_Modules-✓-f7df1e) ![tech](https://img.shields.io/badge/Canvas_2D-✓-2d8cff) ![deps](https://img.shields.io/badge/dependencies-0-brightgreen) ![build](https://img.shields.io/badge/build-none-lightgrey)

---

## 亮点一览

| 模块 | 能力 |
| --- | --- |
| **算法** | Q-Learning / SARSA / Expected SARSA / Double Q-Learning / Dyna-Q（基于模型的规划） |
| **ε 衰减** | 恒定 · 线性 · 指数三种调度 |
| **环境** | 5–20 自由网格 · **随机滑动概率** · **可拖动起点** · 自定义奖励 |
| **可视化** | 4 种叠加层（热力图 / 策略箭头 / 四向 Q 值 / 状态价值）· **运动轨迹拖尾** · TD 更新光效 |
| **播放** | ▶ / ⏸ / **单步** / **速度 1–100 步/帧** / 回合重置 |
| **预设** | 空旷世界 · **悬崖漫步** · **四房间** · **风之网格** · **冰湖** |
| **看板** | 回合 · 本轮/近 100 回合均值 · 历史最佳 · 探索覆盖 · TD 误差 · 当前 ε |
| **图表** | 3 条 sparkline · **悬停十字准星 + 数值气泡** · **自适应滑动平均** · **最近 50 / 100 / 全部窗口缩放** · 高 DPI 清晰渲染 |
| **日志** | 固定折叠默认显示最近几条 · 一键向下展开滚动查看完整历史（不挤压看板） |
| **学习向导** | 9 章图解教程（价值函数 / Bellman / TD / ε-greedy / 算法对比 …），首次访问自动弹出，`?` 键随时复看 |
| **主题** | 深/浅双主题，Canvas 同步变色 |
| **持久化** | 自动保存到 localStorage · JSON 导入/导出完整训练快照 |
| **交互** | 鼠标绘制 · 右键设起点 · 键盘快捷键（Space/S/R/T/1–5/?） |
| **实现** | 零依赖 · 零构建 · 纯原生 ES Modules · 一文件=一职责 |

## 快速开始

由于使用原生 ES Modules，必须通过 HTTP 打开（直接双击 `file://` 会被浏览器拦截）。

```bash
# 方法一：项目根目录执行
python3 -m http.server 8765
# 或
npm start      # 等价于上面那条命令

# 方法二：Node 生态
npx serve -p 8765 .
```

浏览器打开 <http://localhost:8765/>。

**浏览器要求**：支持 ES2020、原生 `import`、Canvas 2D 的现代浏览器（Chrome 90+/Edge 90+/Firefox 88+/Safari 14+）。

## 操作指南

> 首次打开会自动弹出**学习向导**，9 章图解帮助新手建立强化学习的直觉。
> 关闭后任何时候按 `?`（或点顶栏「指南」）重新打开；在向导内可用 `↑/↓` 翻章、`Esc` 关闭。

### 1. 画世界
- 左侧画布上**左键点击或拖拽**绘制当前画笔的地形
- **右键点击**任意格子 → 把起点移到那里
- 起点格子受保护，不会被画笔覆盖

### 2. 选算法
- 右侧顶部下拉选择 5 种算法之一，下方会显示简介和核心公式
- 切换 Dyna-Q 时会出现"规划步数 N"滑块，控制每步后额外做多少次模型仿真

### 3. 调参
- α 学习率 · γ 折扣因子 · ε 探索率
- ε 下方可选衰减策略：恒定 / 线性（到第 500 回合降到 ε_min）/ 指数（每回合 ×0.995）

### 4. 训练
- 按「▶ 开始」或空格键开始循环训练
- 「⇥ 单步」一次只执行一步，便于教学演示
- 速度滑块控制每帧执行步数（1–100）——低速看清每步，高速快速收敛

### 5. 观察
- Canvas 右上角数字是每格的 **max Q(s,·)**
- 切换"叠加层"可以在热力图 / 策略箭头 / 四向 Q 值 / 状态价值 / 关闭 之间切换
- 小绿人身后的绿色拖尾是最近 18 步的移动轨迹
- Bellman 更新若 TD 误差 > 1.0，会在当前格弹出绿色 "+" 特效
- 右侧看板 7 个指标实时刷新

### 6. 读曲线
- 三张 sparkline：**每回合收益 / 步数 / 平均 TD 误差**
- **鼠标悬停**任意曲线 → 十字准星 + 数值气泡（`#回合号  数值`）
- 数据超过一定密度会自动叠加一条**滑动平均曲线**，噪声中看趋势
- 顶部药丸按钮 `[最近 50 | 最近 100 | 全部]` 联动三图，随时聚焦近期训练
- 日志右上 `▾/▴` 按钮：折叠/展开日志抽屉（只影响自身高度，不挤压看板）

### 7. 存档与对比
- 顶栏「导出」按钮把地图 + Q 表 + 历史曲线打包成 JSON
- 「导入」可以加载之前保存的实验状态
- 系统每次暂停时**自动保存到 localStorage**，刷新页面自动恢复

### 键盘快捷键

| 键 | 功能 |
| --- | --- |
| `Space` | 开始 / 暂停 |
| `S`     | 单步执行 |
| `R`     | 重置当前回合 |
| `T`     | 切换深浅主题 |
| `1`–`5` | 快速切换算法 |
| `?`     | 打开 / 关闭学习向导 |
| `↑` `↓` | 向导内翻章（向导打开时） |
| `Esc`   | 关闭向导 |

## 项目架构

严格的分层 + 单一职责，全部通过原生 ES Modules 加载。

```
价值函数与Q学习游戏/
├── index.html              入口（仅 DOM 骨架 + <script type="module">）
├── package.json            可选，仅声明 type:module 并提供 npm start
├── README.md
│
├── styles/                 CSS 分层
│   ├── theme.css           CSS 变量 + 深浅主题
│   ├── base.css            重置、排版、滚动条
│   ├── layout.css          三栏网格、响应式、面板/日志折叠
│   ├── components.css      按钮、滑块、卡片、Chip、看板、图表、工具条
│   └── guide.css           学习向导遮罩层样式
│
├── src/
│   ├── main.js             入口：实例化 App
│   ├── app.js              【核心】App 控制器：UI 事件 + 训练循环 + 看板 + 持久化
│   │
│   ├── core/               算法与环境（纯逻辑，零 DOM）
│   │   ├── constants.js    动作、地形、奖励、算法注册表、叠加层、ε 调度
│   │   ├── environment.js  MazeEnvironment：状态转移、随机滑动、起点管理
│   │   ├── presets.js      5 个经典场景：空旷 / 悬崖 / 四房间 / 风之 / 冰湖
│   │   └── agents/
│   │       ├── base.js             BaseAgent：Q 表、ε-greedy、统计量、历史
│   │       ├── q-learning.js       经典 off-policy TD
│   │       ├── sarsa.js            on-policy TD，下一动作预采样
│   │       ├── expected-sarsa.js   用 ε-greedy 策略下的期望代替采样
│   │       ├── double-q.js         双 Q 表抗最大化偏差
│   │       ├── dyna-q.js           Q + 模型仿真 N 步规划
│   │       └── index.js            工厂 createAgent(id, params)
│   │
│   ├── render/             Canvas 绘制（依赖 core 的查询接口，不依赖 DOM 事件）
│   │   ├── palette.js      深浅两套调色板
│   │   ├── maze.js         MazeRenderer：棋盘/地形/勇者/叠加层/轨迹/特效
│   │   └── charts.js       Sparkline：DPR 清晰渲染 + 悬停气泡 + 滑动平均 + 窗口缩放
│   │
│   ├── ui/
│   │   ├── log.js          日志视图：限长 + 自动滚动
│   │   ├── guide.js        学习向导控制器：遮罩、翻章、持久化进度
│   │   └── guide-content.js  9 章教学内容（Markdown → HTML 结构化）
│   │
│   └── util/
│       ├── schedule.js     ε 衰减策略（constant/linear/exponential）
│       ├── storage.js      localStorage 存档 + JSON 导入导出
│       └── events.js       简易事件总线（保留接口，当前未强制使用）
```

**数据流**：

```
用户交互 ──▶ App (src/app.js)
              │
              ├── agent.step(env)   ──▶ core/agents/*
              │        │
              │        ├── env.step(action)  ──▶ core/environment.js
              │        ├── _update(transition) → 更新 Q / model
              │        └── 返回 { reward, tdError, done, ... }
              │
              └── renderer.draw({ env, agent, overlay, trail })
                       │
                       ├── 棋盘 + 地形
                       ├── 叠加层（heatmap/policy/quadrants/value）
                       ├── 勇者 + 轨迹拖尾
                       └── "+" 特效
```

## 算法速查

| 算法 | 更新目标 | 特点 |
| --- | --- | --- |
| Q-Learning | `r + γ·max Q(s′,·)` | off-policy，激进，易高估 |
| SARSA | `r + γ·Q(s′, a′)`，`a′` 按 ε-greedy 采样 | on-policy，保守（悬崖问题下绕远路） |
| Expected SARSA | `r + γ·Σπ(a′\|s′) Q(s′, a′)` | 低方差 SARSA，收敛平稳 |
| Double Q-Learning | 用 `QA` 选 argmax，`QB` 估值（交替） | 消除最大化偏差，对噪声鲁棒 |
| Dyna-Q | Q-Learning + 从 model 中随机回放 N 次 | 样本效率最高，回合收敛快数倍 |

## 默认奖励与可调项

| 地形 | 奖励 | 终止回合 |
| --- | --- | --- |
| 空地 · | −0.1 | 否 |
| 墙壁 🧱 | −1.0 | 否（留原位） |
| 面包 🍞 | +1.0 | 否（可重复） |
| 宝箱 💰 | +100 | **是** |
| 陷阱 ⚡ | −100 | **是** |

其他可在 UI 里实时调整：
- 网格大小 `5×5 – 20×20`
- 滑动概率 `0 – 0.8`
- 学习率 α / 折扣 γ / 探索 ε
- Dyna-Q 规划步数 `0 – 50`
- ε 衰减策略、速度、可视化叠加层、轨迹显示

## 常见玩法与现象

1. **悬崖漫步**（Preset）：Q-Learning 会学会贴悬崖最短路；SARSA 会学会绕远路避险——经典对比。
2. **Dyna-Q 快收敛**：同样 5000 步，Dyna-Q 通常能完成 >200 回合，而普通 Q-Learning 只有 40 回合左右。
3. **Double Q 抗噪声**：把滑动概率调到 0.3+，比较 Q-Learning（会乐观高估）和 Double Q 的策略差异。
4. **Expected SARSA 平稳曲线**：观察"每回合收益"图，其曲线通常比 SARSA 更平滑。
5. **四向 Q 值**：切到该叠加层，能在同一格上看到"上/下/左/右"四个方向分别的 Q 值深浅差异，直观感受策略是如何形成的。
6. **ε 指数衰减**：训练初期快速探索，后期贪心收敛——曲线从波动到稳定。

## 扩展方向

代码已留好扩展点：

- **新算法**：继承 `BaseAgent`，实现 `_update()`，在 `core/agents/index.js` 注册，并加到 `ALGORITHMS` 常量。
- **新地形**：在 `TILES`、`DEFAULT_REWARDS` 里加一项，`render/maze.js` 加对应绘制函数。
- **新叠加层**：在 `OVERLAYS` 加一项，`MazeRenderer.draw` 里 switch 加分支。
- **奖励自定义**：`env.setRewards({ treasure: { reward: 50, done: true } })` 可以动态改奖励。
- **新教学章节**：在 `ui/guide-content.js` 数组里追加 `{ id, title, html }`，向导自动识别。
- **保存快照的对比**：`storage.js` 已提供 `downloadJSON`，可以把不同算法的 `history.rewards` 导出后在另一个页面画对比图。

## 许可

个人学习 / 教学用途，自由使用与修改。

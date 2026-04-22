// 教学向导的章节内容（仅纯数据 + HTML 字符串）
// 每章形如 { id, icon, title, lead, body }：
//   lead —— 章节导语（一句话），显示在侧边栏 hover 提示里
//   body —— 章节主体 HTML（字符串），由 guide.js 注入

export const CHAPTERS = [

  // ════════════════════════════════════════════════════════════════
  // 第 1 章：什么是强化学习
  // ════════════════════════════════════════════════════════════════
  {
    id: 'intro',
    title: '什么是强化学习？',
    lead: '用"试错 + 奖励"让 AI 学会一件事',
    body: /* html */ `
      <p class="lede">
        <strong>强化学习（Reinforcement Learning, RL）</strong>是机器学习的第三大类，
        不同于告诉模型"正确答案"的监督学习，它只给 AI 一件事：
        <em>让它自己去试，做对了发糖，做错了挨批</em>。
      </p>

      <div class="analogy-card">
        <div class="analogy-body">
          <div class="analogy-title">一个生活类比</div>
          <p>教小狗坐下：你不会给它写说明书。它做对一次你就给零食，做错了就不理它，
            几十次之后它就学会了。RL 里的 AI 就是这只小狗——它一开始什么都不懂，
            靠<strong>试错</strong>和<strong>奖励信号</strong>一点点总结出"怎么做才划算"。</p>
        </div>
      </div>

      <h3>AI ⇄ 环境：永恒的循环</h3>
      <p>强化学习的世界里有两个角色：<strong>智能体（Agent）</strong>和<strong>环境（Environment）</strong>。
        它们像打乒乓球一样一来一回：</p>

      <div class="loop-diagram">
        <div class="loop-node agent">
          <div class="loop-emoji">🤖</div>
          <div class="loop-label">Agent<br/><small>做决定的 AI</small></div>
        </div>
        <div class="loop-arrow right">
          <span>动作 a</span>
          <svg width="100%" height="32" viewBox="0 0 100 32"><path d="M0 16 L90 16" stroke="currentColor" stroke-width="2" fill="none"/><path d="M90 16 l-10 -6 v12 z" fill="currentColor"/></svg>
        </div>
        <div class="loop-node env">
          <div class="loop-emoji">🌍</div>
          <div class="loop-label">Environment<br/><small>迷宫 / 游戏世界</small></div>
        </div>
        <div class="loop-arrow left">
          <span>新状态 s′ · 奖励 r</span>
          <svg width="100%" height="32" viewBox="0 0 100 32"><path d="M100 16 L10 16" stroke="currentColor" stroke-width="2" fill="none"/><path d="M10 16 l10 -6 v12 z" fill="currentColor"/></svg>
        </div>
      </div>

      <p>每一个"节拍"里，Agent 观察当前状态 → 选一个动作 → 环境告诉它"你到哪了、拿到多少分"。
        经过成千上万次这样的循环，Agent 就能学会<strong>在什么情况下做什么最划算</strong>——这就是 RL 的全部目标。</p>

      <div class="tip tip-info">
        <strong>在本游戏中：</strong>勇者 🤖 就是 Agent；10×10 的迷宫就是 Environment；
        他的状态是"在哪个格子"；动作是"上下左右走一格"；奖励是踩到面包/宝箱/陷阱后得到的分数。
      </div>
    `,
  },

  // ════════════════════════════════════════════════════════════════
  // 第 2 章：关键术语
  // ════════════════════════════════════════════════════════════════
  {
    id: 'glossary',
    title: '核心术语 · 一次讲清',
    lead: '状态、动作、奖励、策略、价值函数',
    body: /* html */ `
      <p class="lede">下面这几个词是强化学习的"元音字母"。理解了它们，后面的算法公式就水到渠成。</p>

      <dl class="glossary">
        <dt><span class="glossary-tag">s</span> 状态 <span class="en">State</span></dt>
        <dd>Agent 当前的处境。<em>本游戏中</em>就是勇者站在哪一格，写作 <code>"row,col"</code>。</dd>

        <dt><span class="glossary-tag">a</span> 动作 <span class="en">Action</span></dt>
        <dd>在某个状态下能做的选择。<em>本游戏中</em>只有 4 个：<code>上 下 左 右</code>。</dd>

        <dt><span class="glossary-tag">r</span> 即时奖励 <span class="en">Reward</span></dt>
        <dd>做完这个动作环境马上给你的分数。<em>本游戏中</em>：空地 −0.1、面包 +1、宝箱 +100、陷阱 −100。</dd>

        <dt><span class="glossary-tag">G</span> 累积回报 <span class="en">Return</span></dt>
        <dd>从现在起到回合结束，所有奖励的<strong>折扣求和</strong>：
          <code>G = r₁ + γ·r₂ + γ²·r₃ + …</code>。这才是 Agent 真正想最大化的东西。</dd>

        <dt><span class="glossary-tag">γ</span> 折扣因子 <span class="en">Discount</span></dt>
        <dd>γ ∈ [0, 1)。未来的奖励会按 γ 指数级衰减——γ 越小越"短视"，γ 越大越"有远见"。</dd>

        <dt><span class="glossary-tag">π</span> 策略 <span class="en">Policy</span></dt>
        <dd>看到状态 s 时应该做什么动作的"决策函数"，写作 <code>π(s) = a</code>。
          学习的终极目标就是找到<strong>最优策略 π*</strong>。</dd>

        <dt><span class="glossary-tag">V(s)</span> 状态价值函数 <span class="en">State Value</span></dt>
        <dd>"从状态 s 出发、按策略 π 行动、最终期望能拿多少总分？" 数字越大越值得去。</dd>

        <dt><span class="glossary-tag">Q(s,a)</span> 动作价值函数 <span class="en">Action Value</span></dt>
        <dd><strong>本项目的主角</strong>。比 V(s) 更细：它告诉你"在 s 状态下，<em>做动作 a 然后继续按策略走</em>，能期望拿多少总分"。
          有了 Q(s,·) 我们就能直接选 <code>argmax Q</code> 得到最优动作。</dd>

        <dt><span class="glossary-tag">α</span> 学习率 <span class="en">Learning Rate</span></dt>
        <dd>α ∈ (0, 1]。每次更新 Q 时"新经验"盖过"旧估计"多少。α 大学得快但会抖，α 小稳但慢。</dd>

        <dt><span class="glossary-tag">ε</span> 探索率 <span class="en">Exploration</span></dt>
        <dd>ε ∈ [0, 1]。每一步有 ε 的概率"乱走"（探索未知），1−ε 的概率"选最好"（利用已知）。
          <strong>没有探索 = 永远看不到更优路径</strong>。</dd>
      </dl>

      <div class="tip tip-warn">
        <strong>最容易搞混的两个</strong>：V(s) 是"从 s 开始一路走下去能得多少"；
        Q(s,a) 是"从 s 开始<em>先做 a</em>再走下去能得多少"。Q 比 V 多了一层"动作"的粒度，
        更适合指导决策。
      </div>
    `,
  },

  // ════════════════════════════════════════════════════════════════
  // 第 3 章：Bellman 方程
  // ════════════════════════════════════════════════════════════════
  {
    id: 'bellman',
    title: 'Bellman 方程与 TD 学习',
    lead: '强化学习的灵魂公式',
    body: /* html */ `
      <p class="lede">整个强化学习理论的基石只有一个递归关系：
        <strong>今天的价值 = 今天的奖励 + γ × 明天的价值</strong>。</p>

      <h3>一句话版</h3>
      <div class="formula-box">
        <div class="formula-line formula-hero">
          Q(s, a) &nbsp;=&nbsp; <em class="f-r">r</em>
          &nbsp;+&nbsp; <em class="f-g">γ</em> · max<sub>a′</sub> Q(s′, a′)
        </div>
        <div class="formula-caption">
          <span><em class="f-r">r</em> 立即到手的奖励</span>
          <span><em class="f-g">γ · max Q(s′,·)</em> 未来能拿到的最好总分（打折）</span>
        </div>
      </div>

      <p>Agent 每真正走一步，我们就知道了现实的 <code>(s, a, r, s′)</code>。
        用现实对比它原先的估计 Q(s,a)，差值就是——</p>

      <h3>TD 误差（Temporal Difference Error）</h3>
      <div class="formula-box">
        <div class="formula-line">
          δ &nbsp;=&nbsp;
          <span class="pill pill-r">r + γ·max Q(s′,·)</span>
          <span class="muted">&nbsp;−&nbsp;</span>
          <span class="pill pill-b">Q(s, a)</span>
        </div>
        <div class="formula-caption">
          <span class="pill pill-r">现实目标</span>
          <span class="muted">减去</span>
          <span class="pill pill-b">当前估计</span>
          <span class="muted">= 这一步"出乎意料的惊喜"</span>
        </div>
      </div>

      <h3>更新规则</h3>
      <p>有了 TD 误差，我们按学习率 α 把 Q 表往现实方向"挪"一点：</p>
      <div class="formula-box">
        <div class="formula-line formula-hero">
          Q(s, a) &nbsp;←&nbsp; Q(s, a) &nbsp;+&nbsp; <em class="f-a">α</em> · δ
        </div>
      </div>

      <p>这就是<strong>时序差分学习（TD Learning）</strong>的核心。本项目的 5 种算法
        本质上都是对"目标项 <code>r + γ·max Q(s′,·)</code>"的不同写法——</p>

      <ul class="mini-list">
        <li><strong>Q-Learning</strong>：用 <code>max</code>（下一步"最好"的 Q）</li>
        <li><strong>SARSA</strong>：用真实采样的 <code>Q(s′, a′)</code></li>
        <li><strong>Expected SARSA</strong>：用策略下的期望 <code>Σπ·Q(s′,·)</code></li>
        <li><strong>Double Q</strong>：用另一张表估值避免过高估计</li>
        <li><strong>Dyna-Q</strong>：真实更新 + 从模型里"脑补"回放多次</li>
      </ul>

      <div class="tip tip-info">
        <strong>看可视化：</strong>当画布上弹出绿色 "+" 特效时，意味着当前格子的 TD 误差 > 1.0——
        Agent 在这格<em>学到了新东西</em>。训练初期 + 满天飞，收敛后越来越安静。
      </div>
    `,
  },

  // ════════════════════════════════════════════════════════════════
  // 第 4 章：5 种算法对比
  // ════════════════════════════════════════════════════════════════
  {
    id: 'algorithms',
    title: '5 种算法 · 一张卡片看懂',
    lead: 'Q-Learning / SARSA / Expected SARSA / Double Q / Dyna-Q',
    body: /* html */ `
      <p class="lede">本实验室实现了 5 种经典表格型算法，点击右上角切换后立即生效。
        下面用一张卡片介绍它们的"性格"：</p>

      <div class="algo-grid">
        <article class="algo-card">
          <header class="algo-head"><span class="algo-num">1</span><h4>Q-Learning</h4></header>
          <p class="algo-slogan">"反正未来我会选最好的"</p>
          <code class="algo-formula">Q ← Q + α[r + γ·maxₐ′ Q(s′,a′) − Q]</code>
          <ul>
            <li><strong>类型</strong>：Off-policy（行为策略 ≠ 学习策略）</li>
            <li><strong>优点</strong>：收敛到最优策略 π*，激进、直接</li>
            <li><strong>陷阱</strong>：在噪声/随机环境中容易<em>高估</em>；在悬崖附近会走得很险</li>
          </ul>
        </article>

        <article class="algo-card">
          <header class="algo-head"><span class="algo-num">2</span><h4>SARSA</h4></header>
          <p class="algo-slogan">"按我实际的策略估，踏实点"</p>
          <code class="algo-formula">Q ← Q + α[r + γ·Q(s′,a′) − Q]</code>
          <ul>
            <li><strong>类型</strong>：On-policy（行为=学习同一策略）</li>
            <li><strong>优点</strong>：保守、安全，考虑到了 ε 带来的意外</li>
            <li><strong>陷阱</strong>：绕远路；ε 大时策略偏保守</li>
          </ul>
        </article>

        <article class="algo-card">
          <header class="algo-head"><span class="algo-num">3</span><h4>Expected SARSA</h4></header>
          <p class="algo-slogan">"不赌一次采样，算所有可能的均值"</p>
          <code class="algo-formula">Q ← Q + α[r + γ·Σπ(a′|s′)·Q(s′,a′) − Q]</code>
          <ul>
            <li><strong>类型</strong>：On/Off-policy 两可</li>
            <li><strong>优点</strong>：方差最低，学习曲线最平滑</li>
            <li><strong>陷阱</strong>：每步多算 4 个 Q 值，计算量略大</li>
          </ul>
        </article>

        <article class="algo-card">
          <header class="algo-head"><span class="algo-num">4</span><h4>Double Q-Learning</h4></header>
          <p class="algo-slogan">"两张表互相监督：一个选、一个评"</p>
          <code class="algo-formula">Qₐ ← Qₐ + α[r + γ·Q_B(s′, argmax Qₐ(s′,·)) − Qₐ]</code>
          <ul>
            <li><strong>类型</strong>：Off-policy，消除最大化偏差</li>
            <li><strong>优点</strong>：随机环境下比 Q-Learning 更稳</li>
            <li><strong>陷阱</strong>：要维护两张 Q 表，收敛稍慢</li>
          </ul>
        </article>

        <article class="algo-card">
          <header class="algo-head"><span class="algo-num">5</span><h4>Dyna-Q</h4></header>
          <p class="algo-slogan">"真实走一步，脑子里复盘 N 次"</p>
          <code class="algo-formula">① Q-learning 更新 &nbsp;② 从经验库随机抽 N 次重放</code>
          <ul>
            <li><strong>类型</strong>：Model-based（会记住 "(s,a)→(r,s′)" 转移）</li>
            <li><strong>优点</strong>：<strong>样本效率王者</strong>，几倍速收敛</li>
            <li><strong>陷阱</strong>：环境若动态变化，旧模型会失真</li>
          </ul>
        </article>

        <article class="algo-card algo-compare">
          <header class="algo-head"><span class="algo-num">⚔</span><h4>怎么选？</h4></header>
          <ul class="compare-list">
            <li><strong>刚入门</strong>：Q-Learning 开始</li>
            <li><strong>环境随机（冰湖/滑动）</strong>：Double Q / Expected SARSA</li>
            <li><strong>要避险（悬崖）</strong>：SARSA 会学到绕远路的稳健策略</li>
            <li><strong>在乎样本效率</strong>：Dyna-Q 直接起飞</li>
            <li><strong>要看光滑曲线</strong>：Expected SARSA</li>
          </ul>
        </article>
      </div>
    `,
  },

  // ════════════════════════════════════════════════════════════════
  // 第 5 章：探索 vs 利用
  // ════════════════════════════════════════════════════════════════
  {
    id: 'exploration',
    title: '探索 vs 利用 · ε 是一切的开关',
    lead: '要赌未知？还是用已知？',
    body: /* html */ `
      <p class="lede">如果 Agent 永远选"目前看起来最好"的动作，它可能永远发现不了更好的路径——
        这就是 <strong>Exploration / Exploitation Dilemma（探索 / 利用两难）</strong>。</p>

      <h3>ε-greedy 策略</h3>
      <div class="formula-box">
        <div class="formula-line">
          π(a | s) =
          <span class="pill pill-r">ε 的概率：随机乱走</span>
          &nbsp;+&nbsp;
          <span class="pill pill-g">1−ε 的概率：选当前最好的 argmax Q(s,·)</span>
        </div>
      </div>

      <h3>为什么要衰减？</h3>
      <p>训练初期 Agent 一无所知——此时 <strong>ε 要大（探索为主）</strong>，让它到处乱试。
         中后期 Q 表已经有眉目了——此时 <strong>ε 要小（利用为主）</strong>，巩固成果。
         本实验室提供 3 种衰减策略：</p>

      <table class="kv-table">
        <thead><tr><th>策略</th><th>公式</th><th>特点</th></tr></thead>
        <tbody>
          <tr><td><strong>恒定</strong></td><td>ε = 常数</td><td>最简单，但后期策略永远抖动</td></tr>
          <tr><td><strong>线性</strong></td><td>到第 500 回合线性降到 ε_min</td><td>过渡平滑，适合大多数场景</td></tr>
          <tr><td><strong>指数</strong></td><td>ε ← ε × decay（每回合 ×0.995）</td><td>前期探索充分，后期迅速贪心</td></tr>
        </tbody>
      </table>

      <div class="tip tip-info">
        <strong>实用建议</strong>：平原训练用 <em>指数衰减</em>；悬崖/冰湖等带风险的场景用 <em>线性衰减</em>
        避免过早贪心导致策略崩坏。
      </div>
    `,
  },

  // ════════════════════════════════════════════════════════════════
  // 第 6 章：游戏规则
  // ════════════════════════════════════════════════════════════════
  {
    id: 'rules',
    title: '游戏规则 · 地形与奖励',
    lead: '5 种地形、回合机制、滑动概率',
    body: /* html */ `
      <p class="lede">这是一个你设计地图、AI 学走路的<strong>奖励迷宫</strong>。
        勇者从起点出发，想尽办法得到高分——你怎么设计奖励，它就怎么学。</p>

      <h3>地形一览</h3>
      <table class="rules-table">
        <thead><tr><th>地形</th><th>符号</th><th>奖励</th><th>终止回合</th><th>说明</th></tr></thead>
        <tbody>
          <tr><td>空地</td><td>·</td><td>−0.1</td><td>否</td><td>"体力消耗"，让 Agent 倾向最短路径</td></tr>
          <tr><td>墙壁</td><td>🧱</td><td>−1.0</td><td>否</td><td>撞上去原地不动</td></tr>
          <tr><td>面包</td><td>🍞</td><td>+1.0</td><td>否</td><td>小奖励，可重复拾取（奖励塑形）</td></tr>
          <tr><td>宝箱</td><td>💰</td><td>+100</td><td><strong>是</strong></td><td>胜利终点</td></tr>
          <tr><td>陷阱</td><td>⚡</td><td>−100</td><td><strong>是</strong></td><td>立刻送回起点</td></tr>
        </tbody>
      </table>

      <h3>回合机制</h3>
      <ul class="mini-list">
        <li>勇者从起点（默认左上角 <code>(0, 0)</code>，可右键改）出发</li>
        <li>每踩到一个<em>终止地形</em>（宝箱/陷阱）就算一回合结束，自动回到起点</li>
        <li>回合计数 +1，<em>本回合累计奖励</em>被推入历史曲线</li>
        <li>Q 表不会被清空——下一回合继续在旧经验上学习</li>
      </ul>

      <h3>滑动概率（随机环境）</h3>
      <p>把"滑动概率"滑块拉到 > 0，这个世界就变成<strong>随机环境</strong>——
        你打算向上走，但有概率向左或向右<em>滑</em>一格。这模拟的是冰面、风、机械打滑等真实世界不确定性。</p>

      <div class="tip tip-warn">
        <strong>高滑动下会发生什么？</strong> Q-Learning 容易高估最优动作的价值（因为 max 是乐观估计）；
        Double Q-Learning 和 Expected SARSA 通常更稳。加载<em>冰湖</em>预设可以直接体验。
      </div>

      <h3>5 个经典预设</h3>
      <ul class="preset-list">
        <li><strong>空旷世界</strong> — 最简单的场景，适合第一次体验</li>
        <li><strong>悬崖漫步</strong> — 下沿一整条陷阱，观察 Q-Learning vs SARSA 的经典分歧</li>
        <li><strong>四房间</strong> — 四房间+十字墙+4 个门，看 Q 值如何通过门洞传播</li>
        <li><strong>风之网格</strong> — 带面包奖励和 30% 滑动</li>
        <li><strong>冰湖</strong> — 稀疏陷阱 + 50% 滑动，考验算法稳健性</li>
      </ul>
    `,
  },

  // ════════════════════════════════════════════════════════════════
  // 第 7 章：操作指南
  // ════════════════════════════════════════════════════════════════
  {
    id: 'howto',
    title: '操作指南 · 3 分钟上手',
    lead: '画地图、调参、开训练、看结果',
    body: /* html */ `
      <p class="lede">下面按"画图 → 调参 → 训练 → 观察"四步走，3 分钟带你跑通第一次实验。</p>

      <h3>① 画你的世界</h3>
      <ol class="steps">
        <li>在右下"画笔"区选好一种地形（墙/面包/宝箱/陷阱）</li>
        <li>在左边网格上<strong>左键点击或拖拽</strong>绘制</li>
        <li><strong>右键点击</strong>任意格子 → 起点移到那里（不能移到墙上）</li>
        <li>再次点同一格同一类型 → 清空为空地</li>
      </ol>

      <h3>② 选算法 + 调参</h3>
      <ul class="mini-list">
        <li>右侧"<strong>算法</strong>"下拉切换 5 种算法之一（或按数字键 1–5）</li>
        <li><strong>α</strong>（学习率）：0.1–0.3 通常最佳；过大振荡、过小学得慢</li>
        <li><strong>γ</strong>（折扣）：网格大、目标远就调高（0.95+）；短路径用 0.8–0.9</li>
        <li><strong>ε</strong>（探索）：起始 0.2–0.4，然后开启<em>衰减</em></li>
        <li>Dyna-Q 专属：<strong>规划步数 N</strong>，N 越大越快（但超过 20 就边际递减）</li>
      </ul>

      <h3>③ 开始训练</h3>
      <p>按「▶ 开始」或 <kbd>Space</kbd>。速度滑块可以把每帧步数从 1 拉到 100——
        低速看清每一步，高速快速收敛。想一步一步研究？点「<strong>⇥ 单步</strong>」或按 <kbd>S</kbd>。</p>

      <h3>④ 看懂画面上的每一样东西</h3>
      <dl class="glossary">
        <dt>▪️ <strong>Canvas 热力图</strong></dt>
        <dd><strong>绿色越深</strong> = 这格的 max Q 值越高（越值得去）；红色越深 = 越值得避开。</dd>

        <dt>▪️ <strong>策略箭头叠加层</strong></dt>
        <dd>切换到"策略箭头"后，每格画一个箭头指向 argmax 动作。学到的策略一目了然。</dd>

        <dt>▪️ <strong>四向 Q 值（quadrants）</strong></dt>
        <dd>每格分成 4 个三角，分别显示上/下/左/右的 Q 值。能直观看出"这格往哪方向最划算"。</dd>

        <dt>▪️ <strong>绿色 "+" 特效</strong></dt>
        <dd>当某步 TD 误差 > 1.0 时触发，标记"此处刚学到新东西"。</dd>

        <dt>▪️ <strong>绿色轨迹拖尾</strong></dt>
        <dd>勇者最近 18 步的移动轨迹，越靠近当前位置越浓。</dd>

        <dt>▪️ <strong>看板与 3 条曲线</strong></dt>
        <dd>右侧显示回合/均值/最佳/探索覆盖/TD 误差/ε；下方 3 条曲线分别是<em>每回合收益</em>、
          <em>每回合步数</em>、<em>平均 TD 误差</em>。训练良好时：收益上升、步数下降、TD 趋零。</dd>
      </dl>

      <h3>⑤ 键盘快捷键</h3>
      <div class="shortcuts">
        <div><kbd>Space</kbd> 开始 / 暂停</div>
        <div><kbd>S</kbd> 单步</div>
        <div><kbd>R</kbd> 重置当前回合</div>
        <div><kbd>T</kbd> 切换深浅主题</div>
        <div><kbd>1</kbd>–<kbd>5</kbd> 切换算法</div>
        <div><kbd>?</kbd> / 顶栏问号 重开本教程</div>
      </div>
    `,
  },

  // ════════════════════════════════════════════════════════════════
  // 第 8 章：进阶玩法
  // ════════════════════════════════════════════════════════════════
  {
    id: 'advanced',
    title: '进阶玩法 · 5 个实验',
    lead: '设计对比实验，理解算法差异',
    body: /* html */ `
      <p class="lede">你可以把这个实验室当作"Sutton & Barto 教科书"的互动版。下面 5 个实验
        每一个都能把某个 RL 重要概念"玩明白"。</p>

      <div class="exp-card">
        <header><strong>实验 A · SARSA vs Q-Learning 的悬崖分歧</strong></header>
        <ol>
          <li>顶栏"预设"选 <em>悬崖漫步</em></li>
          <li>选 Q-Learning，ε = 0.2 恒定，训练 200 回合</li>
          <li>切到"策略箭头"叠加层，观察路径——它会<strong>贴着悬崖走最短路</strong></li>
          <li>切到 SARSA，重置并再跑 200 回合，策略会<strong>绕远路避险</strong></li>
        </ol>
        <p class="exp-takeaway">为什么？SARSA 考虑到 ε 会让它真的掉坑，所以远离；Q-Learning 假设"以后我肯定选最好"，不在意 ε。</p>
      </div>

      <div class="exp-card">
        <header><strong>实验 B · Dyna-Q 的样本效率</strong></header>
        <ol>
          <li>加载"空旷世界"或自己画一张中型迷宫</li>
          <li>Q-Learning 训练 3 分钟，记下回合数和近 100 回合均值</li>
          <li>切到 Dyna-Q，规划步数 N=20，训练同样 3 分钟</li>
          <li>对比两者的<strong>回合数</strong>——Dyna-Q 通常高出 3–5 倍</li>
        </ol>
        <p class="exp-takeaway">规划 = 让 Agent 在脑子里多"彩排"几次，不用真的走那么多步。</p>
      </div>

      <div class="exp-card">
        <header><strong>实验 C · 随机环境下的 Double Q</strong></header>
        <ol>
          <li>加载"冰湖"预设（滑动 0.5）</li>
          <li>分别用 Q-Learning 与 Double Q-Learning 训练 1000 回合</li>
          <li>观察"每回合收益"曲线——Q-Learning 会<strong>波动剧烈且偏乐观</strong>，Double Q 更稳</li>
        </ol>
        <p class="exp-takeaway">max 算子在噪声下会系统性高估——Double Q 用两张表抵消了这个偏差。</p>
      </div>

      <div class="exp-card">
        <header><strong>实验 D · ε 衰减的魔法</strong></header>
        <ol>
          <li>任选一个场景，ε 初始 0.5，衰减选"恒定"，训练 500 回合</li>
          <li>重置，ε 初始 0.5，衰减选"指数"（自动每回合 ×0.995），再跑 500 回合</li>
          <li>对比"每回合收益"曲线——衰减版<strong>后期更平稳且均值更高</strong></li>
        </ol>
      </div>

      <div class="exp-card">
        <header><strong>实验 E · 奖励塑形（Reward Shaping）</strong></header>
        <ol>
          <li>画一张 12×12 迷宫，宝箱放右下角</li>
          <li>只用 Q-Learning 训练，观察它多久学会</li>
          <li>重置，在合理路径上撒几颗面包（+1），再训练一次</li>
          <li>对比收敛速度——<strong>密集奖励让学习快得多</strong></li>
        </ol>
        <p class="exp-takeaway">但要小心：塑形不当可能诱导 Agent"钻奖励空子"而不去真正解决问题。</p>
      </div>
    `,
  },

  // ════════════════════════════════════════════════════════════════
  // 第 9 章：FAQ / 疑难
  // ════════════════════════════════════════════════════════════════
  {
    id: 'faq',
    title: '常见疑问',
    lead: '学不动？不收敛？先看这里',
    body: /* html */ `
      <details class="faq-item" open>
        <summary>▪️ 训练很久了 Q 值都是 0 / 几乎没动</summary>
        <ul>
          <li>看看地图里是否有<strong>宝箱</strong>——没有终点，勇者永远拿不到大奖励，Q 值自然长不起来</li>
          <li>检查 ε 是否太小：前期没探索，很难找到宝箱</li>
          <li>网格太大 + 地图太复杂时，可以把 γ 调高（0.95+）让远处奖励"传得更远"</li>
        </ul>
      </details>

      <details class="faq-item">
        <summary>▪️ 为什么收益曲线一直是负的？</summary>
        <p>正常现象。空地每步 −0.1 的"体力消耗"在累积——一个 50 步的回合光走路就 −5 分。
          除非回合里吃到宝箱（+100）或者吃很多面包，否则总分常是负的。关键看<strong>曲线趋势</strong>
          是否向上（说明策略在改进），而不是绝对值。</p>
      </details>

      <details class="faq-item">
        <summary>▪️ 训练后策略箭头在空地上乱转怎么办？</summary>
        <ul>
          <li>那块区域勇者从来没去过——Q 值全是 0，箭头指向随机</li>
          <li>看"探索覆盖"百分比：低于 80% 就继续训练或临时加大 ε</li>
          <li>墙壁过多可能导致部分区域无法到达——检查连通性</li>
        </ul>
      </details>

      <details class="faq-item">
        <summary>▪️ SARSA 一直学不好，是不是算法实现有问题？</summary>
        <p>先检查 ε：SARSA 是 on-policy，如果 ε 大且不衰减，它会一直把"乱走"的代价纳入估计，
          学到的就是"带 ε 噪声的次优策略"。请把 ε 衰减打开（线性或指数），一般会立刻改善。</p>
      </details>

      <details class="faq-item">
        <summary>▪️ Dyna-Q 的 N 设多大合适？</summary>
        <p>常见是 5–20。更大的 N 在初期样本少时更快，但<strong>边际收益递减</strong>——
          N=50 比 N=20 快不了多少但每步变慢。若环境会<em>动态变化</em>（比如你训练中途改了地图），
          N 越大就越容易被旧模型误导，此时建议 N ≤ 10 或重置 Q 表重来。</p>
      </details>

      <details class="faq-item">
        <summary>▪️ 我改了地图，Q 表怎么处理？</summary>
        <p>地图变化后旧 Q 表可能部分失效：</p>
        <ul>
          <li>轻微改动（挪一颗面包）：不用重置，继续训练，几十个回合就会自适应</li>
          <li>大改（移动宝箱/加了墙）：建议重置 Q 表。顶栏"↺ 重置"会清空地图+Q 表</li>
          <li>只想清当前回合而保留学习：按 <kbd>R</kbd> 或"⇥ 重置回合"</li>
        </ul>
      </details>

      <details class="faq-item">
        <summary>▪️ 多个宝箱可以吗？</summary>
        <p>可以。任何一个被踩到都会结束当前回合——Agent 会学会选<em>最近的那个</em>。
          你也可以画多个陷阱——它们彼此平等，Agent 会学着全部避开。</p>
      </details>

      <details class="faq-item">
        <summary>▪️ 想保留训练成果明天继续</summary>
        <p>两种方式：</p>
        <ul>
          <li><strong>自动</strong>：每次暂停会自动写入浏览器 localStorage，刷新后自动恢复</li>
          <li><strong>手动</strong>：顶栏"💾 导出"把完整训练存成 JSON，以后用"📥 导入"还原</li>
        </ul>
      </details>

      <details class="faq-item">
        <summary>▪️ 这个和 DQN / AlphaGo 有啥关系？</summary>
        <p>本项目是<strong>表格型</strong>算法，Q 表是个 Map&lt;state, qValues[4]&gt;——
          状态数不多时工作良好。当状态空间爆炸（围棋 10¹⁷⁰+ 盘面），就必须用<strong>神经网络逼近 Q 函数</strong>
          → 这就是 Deep Q Network (DQN)。再加上蒙特卡洛树搜索 + 自我对弈 → AlphaGo/AlphaZero。
          但内核还是 Bellman 方程——本实验室学到的每个概念在那里都在用。</p>
      </details>

      <div class="cta">
        <p>准备好了吗？点击右下角的按钮进入实验室，开始你的强化学习之旅！</p>
      </div>
    `,
  },

];

// 版本号：内容大改后 bump，可用于让用户再次自动看到
export const GUIDE_VERSION = 2;

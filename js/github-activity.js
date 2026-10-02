/*!
 * 贡献热力图交互 · GitHub Activity Calendar
 * ---------------------------------------------------------------------------
 * 移植自 Elements 注册表组件 @elements/github-activity-calendar
 *   上游文档：https://tryelements.dev/docs/github/github-activity-calendar
 *   源码仓库：https://github.com/crafter-station/elements
 *            registry/default/blocks/github/github-activity-calendar/components/elements/github-activity-calendar.tsx
 *
 * MIT License
 * Copyright (c) 2025 Crafter Station
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * ---------------------------------------------------------------------------
 * 原生移植说明（React / Tailwind → 原生 HTML/CSS/JS）：
 *   useState/useEffect/useMemo  → 闭包内的局部状态 + render() 纯函数
 *   generateCalendarData()      → 删除：原组件用 Math.random() 造假数据，这里改成真实 HTTP 取数
 *   useMemo(getWeeksWithMonths) → buildWeeks()：仍按「周日为一周起点」分列（与原组件一致）
 *   title={...} 原生提示         → 自绘 .gha-tip（原生 title 不跟随主题色、无法立即显示）
 *   animate-pulse               → CSS @keyframes gha-shimmer（见 github-activity.css）
 *   无 React / Motion / Tailwind 运行时依赖；仅用 fetch + DOM + CSS。
 *
 * 数据契约：{ date: 'YYYY-MM-DD', count: number, level: 0..4 }
 * 数据源（可被 data-gha-api 覆盖）：https://github-contributions-api.jogruber.de/v4/
 *   多数据源回退：按 "|" 分隔依次尝试，前一个失败或返回空则试下一个。
 */

(function () {
  'use strict';

  var DEFAULT_API =
    'https://github-contributions-api.jogruber.de/v4/|https://github-contributions-api.deno.dev/';
  var REQUEST_TIMEOUT = 12000;
  var WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  /* ------------------------------------------------------------------ *
   * 工具函数
   * ------------------------------------------------------------------ */

  /** 局部日期键，避免 toISOString() 的 UTC 偏移把日期挪一天 */
  function dateKey(d) {
    return (
      d.getFullYear() +
      '-' +
      pad2(d.getMonth() + 1) +
      '-' +
      pad2(d.getDate())
    );
  }
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  /** 'YYYY-MM-DD' → 本地Date（不用 new Date(str)：会被当成 UTC 解析） */
  function parseKey(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  /** level 归一化：上游偶尔给 0..5，原组件只认 0..4 */
  function normalizeLevel(v) {
    var n = Number(v);
    if (!isFinite(n) || n < 0) return 0;
    n = Math.round(n);
    return n > 4 ? 4 : n;
  }

  /** 把任意来源的 JSON 归一化成 { date, count, level }[]（乱序会排好） */
  function normalizeData(raw) {
    var arr =
      raw && Array.isArray(raw.contributions)
        ? raw.contributions
        : Array.isArray(raw)
          ? raw
          : null;
    if (!arr) return null;

    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (!it || typeof it.date !== 'string') continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date)) continue;
      out.push({
        date: it.date,
        count: Number(it.count) || 0,
        level: normalizeLevel(it.level),
      });
    }
    if (!out.length) return null;
    out.sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    return out;
  }

  /** 只保留某个年份，并把缺失的日子补成 0（原组件假设一年 365 天连续） */
  function sliceYear(data, year) {
    var map = Object.create(null);
    for (var i = 0; i < data.length; i++) {
      if (data[i].date.slice(0, 4) === String(year)) map[data[i].date] = data[i];
    }
    var out = [];
    var cur = new Date(year, 0, 1);
    var end = new Date(year, 11, 31);
    while (cur <= end) {
      var k = dateKey(cur);
      out.push(map[k] || { date: k, count: 0, level: 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  /**
   * 分列 + 月份标签。
   * 等价于原组件 getWeeksWithMonths()，区别只有一处：
   * 月份标签绑在「该月首次出现的那一列」（GitHub 的做法），原组件只在该月第一天正好是周日时才记，
   * 于是 1 月经常整月没有标签 —— 这里修掉。
   */
  function buildWeeks(data) {
    var weeks = [];
    var week = [];
    var seenMonth = Object.create(null);
    var i;
    var first = data.length ? parseKey(data[0].date) : new Date();

    // 首周补空白，使每周的第 0 格都是「周日」
    for (i = 0; i < first.getDay(); i++) {
      week.push({ date: '', count: 0, level: 0 });
    }

    for (i = 0; i < data.length; i++) {
      var day = data[i];
      var d = parseKey(day.date);
      if (!d) continue;
      if (d.getDay() === 0 && week.length) {
        weeks.push(week);
        week = [];
      }
      week.push(day);
      var mk = d.getMonth();
      if (seenMonth[mk] === undefined) seenMonth[mk] = weeks.length;
    }
    if (week.length) {
      while (week.length < 7) week.push({ date: '', count: 0, level: 0 });
      weeks.push(week);
    }

    var monthLabels = [];
    var keys = Object.keys(seenMonth).sort(function (a, b) {
      return a - b;
    });
    for (i = 0; i < keys.length; i++) {
      monthLabels.push({ month: MONTHS[+keys[i]], col: seenMonth[keys[i]] });
    }
    return { weeks: weeks, monthLabels: monthLabels };
  }

  var MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /** 真实日期（有格子）才做提示；补位格子返回 null */
  function tipText(day) {
    var d = parseKey(day.date);
    if (!d) return null;
    var when =
      d.getMonth() + 1 + '月' + d.getDate() + '日 · ' + WEEKDAYS_ZH[d.getDay()];
    return (
      (day.count === 0 ? '无贡献' : day.count + ' 次贡献') + ' · ' + when
    );
  }

  /** 连续贡献天数（最长） */
  function longestStreak(data) {
    var best = 0;
    var run = 0;
    for (var i = 0; i < data.length; i++) {
      if (data[i].count > 0) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    return best;
  }

  /* ------------------------------------------------------------------ *
   * 取数：多数据源依次回退
   * ------------------------------------------------------------------ */

  function sourcesFor(section) {
    var raw = section.getAttribute('data-gha-api') || DEFAULT_API;
    return raw
      .split('|')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  function buildUrl(base, username, year) {
    if (base.indexOf('/v4/') !== -1 || /jogruber\.de/.test(base)) {
      return base.replace(/\/?$/, '/') + encodeURIComponent(username) + '?y=' + year;
    }
    if (/deno\.dev/.test(base)) {
      return base.replace(/\/?$/, '/') + encodeURIComponent(username) + '.json?y=' + year;
    }
    // 自定义端点：支持 {user} / {year} 占位符，否则按 <base><user>?y=<year> 拼
    if (/\{user\}/.test(base) || /\{year\}/.test(base)) {
      return base
        .replace(/\{user\}/g, encodeURIComponent(username))
        .replace(/\{year\}/g, String(year));
    }
    return base.replace(/\/?$/, '/') + encodeURIComponent(username) + '?y=' + year;
  }

  function fetchJson(url) {
    return new Promise(function (resolve, reject) {
      var ctl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (ctl) ctl.abort();
      }, REQUEST_TIMEOUT);

      fetch(url, {
        headers: { Accept: 'application/json' },
        signal: ctl ? ctl.signal : undefined,
        credentials: 'omit',
        cache: 'default',
      })
        .then(function (res) {
          var ct = res.headers.get('content-type') || '';
          if (!res.ok) throw new Error('HTTP ' + res.status);
          // 静态服务器把 404 页面以 200 + text/html 返回时要判掉，否则 JSON 解析会炸
          if (ct.indexOf('json') === -1) throw new Error('非 JSON 响应');
          return res.json();
        })
        .then(function (json) {
          clearTimeout(timer);
          resolve(json);
        })
        .catch(function (err) {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * 拉取某年的数据。year 取不到时（例如 API 只有 lastYear）回退到全量结果里过滤年份。
   */
  function loadData(section, username, year) {
    var sources = sourcesFor(section);
    var idx = 0;

    function attempt() {
      if (idx >= sources.length) {
        return Promise.reject(new Error('全部数据源均失败'));
      }
      var url = buildUrl(sources[idx++], username, year);
      return fetchJson(url)
        .then(function (json) {
          var data = normalizeData(json);
          if (!data) throw new Error('响应结构未知');
          var scoped = sliceYear(data, year);
          var total = 0;
          for (var i = 0; i < scoped.length; i++) total += scoped[i].count;
          // 该年份无任何数据 → 试下一个数据源
          if (total === 0 && idx < sources.length) throw new Error('该年份无数据');
          return scoped;
        })
        .catch(function () {
          return attempt();
        });
    }
    return attempt();
  }

  /* ------------------------------------------------------------------ *
   * 渲染
   * ------------------------------------------------------------------ */

  function render(section) {
    var state = section.__gha;
    if (!state || !state.data) return;

    var refs = state.refs;
    var data = state.data;
    var year = state.year;
    var built = buildWeeks(data);

    /* 汇总行：原组件 <span class="font-medium">{total.toLocaleString()}</span> contributions in {year} */
    var total = 0;
    var activeDays = 0;
    for (var i = 0; i < data.length; i++) {
      total += data[i].count;
      if (data[i].count > 0) activeDays++;
    }
    var pct = Math.round((activeDays / data.length) * 100);
    refs.summary.textContent = '';
    var num = document.createElement('b');
    num.textContent = total.toLocaleString('en-US'); // 与原组件一致：千分位
    refs.summary.appendChild(num);
    refs.summary.appendChild(
      document.createTextNode(' 次贡献 · ' + year + ' 年')
    );

    /* 月份标签：只设 grid-column，位置交给 CSS 轨道（不要写 margin，
       那会破坏 max-content 内在宽度，把整行撑宽挤掉后面的月份） */
    refs.months.textContent = '';
    for (i = 0; i < built.monthLabels.length; i++) {
      var lab = built.monthLabels[i];
      var span = document.createElement('span');
      span.style.gridColumn = String(lab.col + 1);
      span.textContent = lab.month;
      refs.months.appendChild(span);
    }

    /* 日格：DOM 顺序 = 一周 7 天 × N 列，配合 CSS grid-auto-flow: column 自动分列 */
    var frag = document.createDocumentFragment();
    for (var w = 0; w < built.weeks.length; w++) {
      for (var d = 0; d < built.weeks[w].length; d++) {
        var day = built.weeks[w][d];
        var cell = document.createElement('i');
        if (!day.date) {
          cell.className = 'gha-cell gha-cell--empty';
          frag.appendChild(cell);
          continue;
        }
        cell.className = 'gha-cell gha-cell--day';
        cell.setAttribute('data-gha-level', String(day.level));
        cell.setAttribute('data-gha-date', day.date);
        cell.setAttribute('data-gha-count', String(day.count));
        cell.setAttribute('title', day.count + ' contributions on ' + day.date);
        frag.appendChild(cell);
      }
    }
    refs.grid.textContent = '';
    refs.grid.appendChild(frag);

    /* 无障碍：整体作为一个 img 角色描述，避免 365 个格子各报一遍 */
    refs.grid.setAttribute(
      'aria-label',
      year + ' 年 ' + usernameOf(section) + ' 的 GitHub 贡献热力图：共 ' + total + ' 次贡献，' +
        activeDays + ' 天有活动，最长连续 ' + longestStreak(data) + ' 天。'
    );

    /* 一句总结（原组件没有，属移植增强） */
    refs.verdict.textContent =
      '活跃 ' + activeDays + ' 天（占全年 ' + pct + '%），最长连续 ' + longestStreak(data) + ' 天。';

    section.setAttribute('data-gha-state', total === 0 ? 'empty' : 'ready');
    section.setAttribute('aria-busy', 'false');
    refs.live.textContent = year + ' 年贡献数据已加载，共 ' + total + ' 次贡献。';
  }

  function usernameOf(section) {
    return section.getAttribute('data-gha-username') || '';
  }

  /* ------------------------------------------------------------------ *
   * 悬停提示（自绘，替代原生 title）
   * ------------------------------------------------------------------ */

  function ensureTip(section) {
    if (section.__gha.tip && section.__gha.tip.isConnected) return section.__gha.tip;
    var tip = document.createElement('div');
    tip.className = 'gha-tip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');
    section.appendChild(tip);
    section.__gha.tip = tip;
    return tip;
  }

  function showTip(section, cell) {
    var count = Number(cell.getAttribute('data-gha-count'));
    var date = cell.getAttribute('data-gha-date');
    if (!date) return;
    var tip = ensureTip(section);
    tip.textContent = count === 0 ? '无贡献' : count + ' 次贡献';
    var d = parseKey(date);
    if (d) {
      var when = document.createElement('span');
      when.textContent = ' · ' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
      tip.appendChild(when);
    }
    tip.classList.add('is-visible');

    var r = cell.getBoundingClientRect();
    var tr = tip.getBoundingClientRect();
    var half = tr.width / 2;
    var pad = 8;
    // 水平：夹在视口内，避免左右被裁掉
    var x = r.left + r.width / 2;
    if (x - half < pad) x = pad + half;
    if (x + half > window.innerWidth - pad) x = window.innerWidth - pad - half;
    tip.style.left = Math.round(x) + 'px';

    // 垂直：默认浮在格子上方；但若会顶到月份标签行 / 超出滚动容器上沿（上面几行），
    // 就改放到格子下方（.is-below 由 CSS 翻转位移），避免提示压住月份或自己那一格。
    var scroll = section.__gha.refs.scroll;
    var months = section.__gha.refs.months;
    var ceiling = Math.max(
      scroll ? scroll.getBoundingClientRect().top : 0,
      months ? months.getBoundingClientRect().top : 0
    );
    var above = r.top - tr.height - 8;
    var below = above < ceiling - 2;
    tip.classList.toggle('is-below', below);
    tip.style.top = Math.round(below ? r.bottom + 8 : r.top) + 'px';
  }

  function hideTip(section) {
    if (section.__gha && section.__gha.tip) {
      section.__gha.tip.classList.remove('is-visible');
    }
  }

  function bindTooltip(section) {
    var grid = section.__gha.refs.grid;
    var current = null;

    grid.addEventListener('pointerover', function (e) {
      var cell = e.target.closest ? e.target.closest('.gha-cell--day') : null;
      if (!cell || cell === current) return;
      current = cell;
      hideTip(section);
      showTip(section, cell);
    });
    grid.addEventListener('pointerout', function (e) {
      var cell = e.target.closest ? e.target.closest('.gha-cell--day') : null;
      if (!cell) return;
      var to = e.relatedTarget;
      if (to && cell.contains(to)) return;
      current = null;
      hideTip(section);
    });
    grid.addEventListener('focusin', function (e) {
      var cell = e.target.closest ? e.target.closest('.gha-cell--day') : null;
      if (cell) showTip(section, cell);
    });
    grid.addEventListener('focusout', function () {
      hideTip(section);
    });

    // 滚动/缩放时提示会错位，直接收起
    var scroller = section.__gha.refs.scroll;
    if (scroller) {
      scroller.addEventListener('scroll', function () {
        hideTip(section);
      }, { passive: true });
    }
    window.addEventListener('resize', function () {
      hideTip(section);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * 主题切换：重绘（暗色档配色）
   * ------------------------------------------------------------------ */

  function watchColorScheme(section, rerender) {
    if (!window.MutationObserver) return;
    var last = -1;
    var mo = new MutationObserver(function () {
      var sig = darkSignature();
      if (sig === last) return;
      last = sig;
      rerender();
    });
    last = darkSignature();
    mo.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-color-scheme'],
    });
    // auto 模式下跟随系统
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onMq = function () {
        var sig = darkSignature();
        if (sig === last) return;
        last = sig;
        rerender();
      };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
  }

  function darkSignature() {
    var attr = document.body.getAttribute('data-color-scheme');
    var sysDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return attr === 'dark' || (attr === 'auto' && sysDark) ? 1 : 0;
  }

  /* ------------------------------------------------------------------ *
   * 初始化
   * ------------------------------------------------------------------ */

  function setError(section, message) {
    section.setAttribute('data-gha-state', 'error');
    section.setAttribute('aria-busy', 'false');
    var t = section.querySelector('[data-gha-error-text]');
    if (t) t.textContent = message;
  }

  function init(section) {
    if (section.__gha) return section.__gha.ready;

    var refs = {
      skeleton: section.querySelector('[data-gha-skeleton]'),
      placeholder: section.querySelector('[data-gha-placeholder]'),
      body: section.querySelector('[data-gha-body]'),
      summary: section.querySelector('[data-gha-summary]'),
      scroll: section.querySelector('[data-gha-scroll]'),
      months: section.querySelector('[data-gha-months]'),
      grid: section.querySelector('[data-gha-grid]'),
      verdict: section.querySelector('[data-gha-verdict]'),
      live: section.querySelector('[data-gha-live]'),
      error: section.querySelector('[data-gha-error]'),
      retry: section.querySelector('[data-gha-retry]'),
    };

    var username = usernameOf(section);
    var year = Number(section.getAttribute('data-gha-year')) || new Date().getFullYear();

    section.__gha = {
      refs: refs,
      username: username,
      year: year,
      data: null,
      tip: null,
      ready: null,
    };

    if (!username) {
      setError(section, '未配置 GitHub 用户名（data-gha-username 为空）。');
      return Promise.resolve();
    }

    bindTooltip(section);

    var state = section.__gha;
    var load = function () {
      section.setAttribute('data-gha-state', 'loading');
      section.setAttribute('aria-busy', 'true');
      return loadData(section, username, year)
        .then(function (data) {
          state.data = data;
          render(section);
          if (!state.watched) {
            state.watched = true;
            watchColorScheme(section, function () {
              render(section);
            });
          }
        })
        .catch(function () {
          setError(
            section,
            '贡献数据加载失败（数据源不可用或网络被拦截）。可稍后重试，或让站长改用构建期内联数据。'
          );
        });
    };

    if (refs.retry) {
      refs.retry.addEventListener('click', function () {
        load();
      });
    }

    state.ready = load();
    return state.ready;
  }

  function initAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-gha]');
    for (var i = 0; i < nodes.length; i++) init(nodes[i]);
  }

  /* 对外暴露（便于调试 / 动态插入内容后手动初始化） */
  window.GithubActivity = {
    init: initAll,
    version: '1.0.0',
    upstream: 'Elements @elements/github-activity-calendar (MIT © 2025 Crafter Station)',
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }
})();

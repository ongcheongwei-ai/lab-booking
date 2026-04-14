// ==========================================
// 实验室预约管理系统 — 主入口 & 路由 & 仪表板
// ==========================================

const App = {
  _currentPage: null,

  // 初始化
  async init() {
    Auth.init();
    this.updateNav();
    window.addEventListener('hashchange', () => this._onHashChange());
    this._onHashChange();
  },

  // 路由处理
  _onHashChange() {
    const hash = location.hash.slice(1) || 'dashboard';
    this.navigate(hash, false);
  },

  // 页面导航
  navigate(page, updateHash = true) {
    if (updateHash && location.hash.slice(1) !== page) {
      location.hash = page;
      return; // hashchange 会触发导航
    }

    // 隐藏所有页面
    document.querySelectorAll('.page-section').forEach(el => {
      el.style.display = 'none';
    });

    // 显示目标页面
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
      pageEl.style.display = 'block';
    }

    // 更新导航高亮
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    this._currentPage = page;

    // 渲染页面内容
    switch (page) {
      case 'dashboard': this.renderDashboard(); break;
      case 'login': Auth.renderLoginPage(); break;
      case 'timetable': Timetable.render(); break;
      case 'booking': Booking.render(); break;
      case 'my-bookings': Booking.renderMyBookings(); break;
      case 'admin-approval': Admin.renderApproval(); break;
      case 'admin-bookings': Admin.renderBookings(); break;
      case 'admin-blocked': Admin.renderBlocked(); break;
      case 'admin-stats': Admin.renderStats(); break;
    }
  },

  // 更新导航栏
  updateNav() {
    const nav = document.getElementById('mainNav');
    const user = Auth.getUser();

    let navLinks = `
      <a class="nav-link" data-page="dashboard" href="#dashboard">首页</a>
      <a class="nav-link" data-page="timetable" href="#timetable">时间表</a>
    `;

    if (Auth.isTeacher()) {
      navLinks += `
        <a class="nav-link" data-page="booking" href="#booking">预约申请</a>
        <a class="nav-link" data-page="my-bookings" href="#my-bookings">我的申请</a>
      `;
    }

    if (Auth.isAdmin()) {
      navLinks += `
        <a class="nav-link" data-page="admin-approval" href="#admin-approval">审批管理</a>
        <a class="nav-link" data-page="admin-bookings" href="#admin-bookings">预约管理</a>
        <a class="nav-link" data-page="admin-blocked" href="#admin-blocked">特殊占用</a>
        <a class="nav-link" data-page="admin-stats" href="#admin-stats">统计</a>
      `;
    }

    nav.innerHTML = navLinks;

    // 更新用户信息区
    const userInfo = document.getElementById('userInfo');
    if (user) {
      userInfo.innerHTML = `
        <span class="user-name">${user.name}</span>
        <button class="btn btn-sm btn-outline" onclick="App.logout()">登出</button>
      `;
    } else {
      userInfo.innerHTML = `
        <a href="#login" class="btn btn-sm btn-primary">老师登入</a>
      `;
    }
  },

  // 登出
  logout() {
    Auth.logout();
    this.updateNav();
    this.navigate('dashboard');
    App.showToast('已登出', 'info');
  },

  // ===== 仪表板 =====
  async renderDashboard() {
    const container = document.getElementById('page-dashboard');
    container.innerHTML = `
      <div class="dashboard-header">
        <h2>${CONFIG.SCHOOL_NAME} — 实验室预约系统</h2>
        <p class="dashboard-subtitle">实验室使用状态一览</p>
        <button class="btn btn-sm btn-outline" onclick="App.renderDashboard()" title="刷新数据">刷新</button>
      </div>

      <div class="section-title">
        <h3>今日实验室状态</h3>
        <span id="dashCurrentTime" class="current-time"></span>
      </div>
      <div id="dashTodayStatus" class="lab-status-grid">
        <div class="loading">加载中...</div>
      </div>

      <div class="section-title" style="margin-top:24px">
        <h3>今日完整时间表</h3>
      </div>
      <div id="dashTodayTable" class="timetable-table-wrapper">
        <div class="loading">加载中...</div>
      </div>

      <div class="section-title" style="margin-top:24px">
        <h3>本周预约概览</h3>
        <div class="week-nav-sm">
          <button class="btn btn-sm" id="dashPrevWeek">&larr;</button>
          <span id="dashWeekLabel"></span>
          <button class="btn btn-sm" id="dashNextWeek">&rarr;</button>
        </div>
      </div>
      <div class="dashboard-filter">
        <select id="dashLabFilter">
          <option value="all">全部实验室</option>
          ${Object.entries(CONFIG.LABS).map(([id, lab]) =>
            `<option value="${id}">${lab.name}</option>`
          ).join('')}
        </select>
      </div>
      <div id="dashWeekView" class="timetable-grid-wrapper"></div>

      <div class="section-title" style="margin-top:24px">
        <h3>本月快速统计</h3>
      </div>
      <div id="dashStats" class="stats-grid"></div>

      ${!Auth.isLoggedIn() ? `
        <div class="dashboard-login-prompt">
          <a href="#login" class="btn btn-primary btn-lg">老师登入 — 提交预约申请</a>
        </div>
      ` : ''}
    `;

    this._dashWeekOffset = 0;
    document.getElementById('dashPrevWeek')?.addEventListener('click', () => {
      this._dashWeekOffset--;
      this._renderDashWeek();
    });
    document.getElementById('dashNextWeek')?.addEventListener('click', () => {
      this._dashWeekOffset++;
      this._renderDashWeek();
    });
    document.getElementById('dashLabFilter')?.addEventListener('change', () => {
      this._renderDashWeek();
    });

    await this._loadDashboardData();
  },

  async _loadDashboardData() {
    try {
      const [bookingsRes, blockedRes] = await Promise.all([
        API.getBookings({ status: 'approved' }),
        API.getBlocked()
      ]);
      this._dashBookings = bookingsRes.data || [];
      this._dashBlocked = blockedRes.data || [];

      this._renderTodayStatus();
      this._renderTodayTable();
      this._renderDashWeek();
      this._renderDashStats();
    } catch (err) {
      console.error('仪表板数据加载失败:', err);
    }
  },

  _renderTodayStatus() {
    const now = getMalaysiaTime();
    const today = formatDate(now);
    const currentPeriod = getCurrentPeriod();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    document.getElementById('dashCurrentTime').textContent =
      `${formatDateCN(today)} ${timeStr} ${currentPeriod ? `(当前第${currentPeriod}节)` : '(非上课时间)'}`;

    const statusEl = document.getElementById('dashTodayStatus');
    statusEl.innerHTML = Object.entries(CONFIG.LABS).map(([labId, lab]) => {
      let statusClass = 'status-free';
      let statusText = '空闲';
      let statusDetail = '';

      if (currentPeriod) {
        // 检查特殊占用
        const blocked = this._dashBlocked.find(bl =>
          (bl.lab === labId || bl.lab === 'all') &&
          bl.date === today &&
          (bl.period === 'all' || String(bl.period) === String(currentPeriod))
        );
        if (blocked) {
          statusClass = 'status-blocked';
          statusText = '特殊占用';
          statusDetail = getBlockedTypeName(blocked.type) + (blocked.note ? ` - ${blocked.note}` : '');
        } else {
          // 检查预约
          const booking = this._dashBookings.find(b =>
            b.lab === labId && b.date === today && String(b.period) === String(currentPeriod)
          );
          if (booking) {
            statusClass = 'status-inuse';
            statusText = '使用中';
            statusDetail = `${booking.class} / ${booking.teacherName}`;
          }
        }
      } else {
        statusText = '非上课时间';
        statusClass = 'status-idle';
      }

      return `
        <div class="lab-status-card ${statusClass}" style="border-top: 4px solid ${lab.color}">
          <div class="lab-status-name">${lab.name}</div>
          <div class="lab-status-text">${statusText}</div>
          ${statusDetail ? `<div class="lab-status-detail">${statusDetail}</div>` : ''}
        </div>
      `;
    }).join('');
  },

  _renderTodayTable() {
    const today = formatDate(getMalaysiaTime());
    const currentPeriod = getCurrentPeriod();
    const tableEl = document.getElementById('dashTodayTable');

    tableEl.innerHTML = `
      <table class="timetable-table timetable-today">
        <thead>
          <tr>
            <th class="th-period">节次</th>
            ${Object.entries(CONFIG.LABS).map(([id, lab]) =>
              `<th style="color:${lab.color}">${lab.name}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>
          ${CONFIG.PERIODS.map(p => `
            <tr class="${p.period === currentPeriod ? 'current-period' : ''}">
              <td class="td-period">
                <strong>第${p.period}节</strong><br>
                <small>${p.start}-${p.end}</small>
              </td>
              ${Object.keys(CONFIG.LABS).map(labId => {
                const blocked = this._dashBlocked.find(bl =>
                  (bl.lab === labId || bl.lab === 'all') &&
                  bl.date === today &&
                  (bl.period === 'all' || String(bl.period) === String(p.period))
                );
                if (blocked) {
                  return `<td class="slot-blocked"><span class="slot-label">${getBlockedTypeName(blocked.type)}</span></td>`;
                }
                const booking = this._dashBookings.find(b =>
                  b.lab === labId && b.date === today && String(b.period) === String(p.period)
                );
                if (booking) {
                  return `<td class="slot-booked"><span class="slot-label">${booking.class}</span><small>${booking.teacherName}</small></td>`;
                }
                return `<td class="slot-free"><span class="slot-label">空闲</span></td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  _dashWeekOffset: 0,

  _renderDashWeek() {
    const baseDate = getMalaysiaTime();
    baseDate.setDate(baseDate.getDate() + this._dashWeekOffset * 7);
    const weekDates = getWeekDates(baseDate);
    const labFilter = document.getElementById('dashLabFilter')?.value || 'all';

    document.getElementById('dashWeekLabel').textContent =
      `${formatDateCN(weekDates[0])} — ${formatDateCN(weekDates[5])}`;

    const labs = labFilter === 'all' ? Object.keys(CONFIG.LABS) : [labFilter];
    const container = document.getElementById('dashWeekView');

    let html = '';
    labs.forEach(labId => {
      const lab = CONFIG.LABS[labId];
      html += `
        <div class="timetable-section">
          <h4 class="lab-title" style="border-left:4px solid ${lab.color};padding-left:8px">${lab.name}</h4>
          <div class="timetable-table-wrapper">
            <table class="timetable-table">
              <thead>
                <tr>
                  <th class="th-period">节次</th>
                  ${weekDates.map((d, i) => {
                    const dateObj = new Date(d + 'T00:00:00');
                    const isToday = d === formatDate(getMalaysiaTime());
                    return `<th class="${isToday ? 'th-today' : ''}">
                      ${CONFIG.WEEKDAY_SHORT[i]}<br><small>${dateObj.getMonth()+1}/${dateObj.getDate()}</small>
                    </th>`;
                  }).join('')}
                </tr>
              </thead>
              <tbody>
                ${CONFIG.PERIODS.map(p => `
                  <tr>
                    <td class="td-period"><strong>${p.period}</strong><br><small>${p.start}</small></td>
                    ${weekDates.map(date => {
                      const blocked = this._dashBlocked.find(bl =>
                        (bl.lab === labId || bl.lab === 'all') && bl.date === date &&
                        (bl.period === 'all' || String(bl.period) === String(p.period))
                      );
                      if (blocked) return `<td class="slot-blocked"><small>${getBlockedTypeName(blocked.type)}</small></td>`;

                      const booking = this._dashBookings.find(b =>
                        b.lab === labId && b.date === date && String(b.period) === String(p.period)
                      );
                      if (booking) return `<td class="slot-booked"><small>${booking.class}</small></td>`;
                      return `<td class="slot-free"></td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  _renderDashStats() {
    const now = getMalaysiaTime();
    const month = formatDate(now).substring(0, 7);
    const year = now.getFullYear();
    const mon = now.getMonth() + 1;
    const lastDay = new Date(year, mon, 0).getDate();

    let workdays = 0;
    for (let d = 1; d <= lastDay; d++) {
      const day = new Date(year, mon - 1, d).getDay();
      if (day >= 1 && day <= 6) workdays++;
    }

    const monthBookings = this._dashBookings.filter(b =>
      b.date.startsWith(month)
    );

    const labUsage = {};
    Object.keys(CONFIG.LABS).forEach(id => labUsage[id] = 0);
    monthBookings.forEach(b => { if (labUsage[b.lab] !== undefined) labUsage[b.lab]++; });

    const totalSlots = 4 * 7 * workdays;
    const totalUsed = Object.values(labUsage).reduce((a, b) => a + b, 0);
    const rate = totalSlots > 0 ? ((totalUsed / totalSlots) * 100).toFixed(1) : 0;

    const statsEl = document.getElementById('dashStats');
    statsEl.innerHTML = `
      ${Object.entries(labUsage).map(([id, count]) => `
        <div class="stat-card" style="border-top:3px solid ${CONFIG.LABS[id].color}">
          <div class="stat-number">${count}</div>
          <div class="stat-label">${getLabName(id)}</div>
        </div>
      `).join('')}
      <div class="stat-card">
        <div class="stat-number">${rate}%</div>
        <div class="stat-label">本月使用率</div>
      </div>
    `;
  },

  // Toast 提示
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// 启动
document.addEventListener('DOMContentLoaded', () => App.init());

// ==========================================
// 实验室预约管理系统 — 管理员功能模块
// ==========================================

const Admin = {
  // ===== 审批管理 =====
  async renderApproval() {
    if (!Auth.isAdmin()) { App.navigate('login'); return; }

    const container = document.getElementById('page-admin-approval');
    container.innerHTML = `
      <div class="page-header">
        <h2>审批管理</h2>
      </div>
      <div id="approvalList" class="booking-list">
        <div class="loading">加载中...</div>
      </div>
    `;

    try {
      const result = await API.getBookings({ status: 'pending' });
      const bookings = (result.data || []).sort((a, b) =>
        new Date(a.submittedAt) - new Date(b.submittedAt)
      );

      const listEl = document.getElementById('approvalList');

      if (bookings.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>暂无待审批的申请</p></div>';
        return;
      }

      listEl.innerHTML = bookings.map(b => `
        <div class="booking-card" id="approval-${b.id}">
          <div class="booking-card-header">
            <span class="status-badge status-pending">待审批</span>
            <span class="booking-date">${formatDateCN(b.date)}</span>
          </div>
          <div class="booking-card-body">
            <div class="booking-info">
              <span class="lab-badge" style="background:${CONFIG.LABS[b.lab]?.colorLight};color:${CONFIG.LABS[b.lab]?.color}">
                ${getLabName(b.lab)}
              </span>
              <span>${getPeriodText(parseInt(b.period))}</span>
            </div>
            <div class="booking-detail">
              <span>老师：${b.teacherName}</span>
              <span>班级：${b.class}</span>
              <span>科目：${getSubjectName(b.subject)}</span>
            </div>
            ${b.note ? `<div class="booking-note">备注：${b.note}</div>` : ''}
            <div class="booking-meta">提交时间：${new Date(b.submittedAt).toLocaleString('zh-CN')}</div>
          </div>
          <div class="booking-card-footer approval-actions">
            <button class="btn btn-success btn-sm" onclick="Admin.approve('${b.id}')">批准</button>
            <button class="btn btn-danger btn-sm" onclick="Admin.showRejectForm('${b.id}')">拒绝</button>
          </div>
          <div class="reject-form" id="rejectForm-${b.id}" style="display:none">
            <div class="form-group">
              <label>拒绝原因：</label>
              <textarea id="rejectReason-${b.id}" rows="2" placeholder="请填写拒绝原因"></textarea>
            </div>
            <div class="form-actions">
              <button class="btn btn-danger btn-sm" onclick="Admin.reject('${b.id}')">确认拒绝</button>
              <button class="btn btn-outline btn-sm" onclick="Admin.hideRejectForm('${b.id}')">取消</button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      document.getElementById('approvalList').innerHTML =
        `<div class="error-state">加载失败：${err.message}</div>`;
    }
  },

  async approve(bookingId) {
    try {
      const result = await API.approveBooking(bookingId);
      if (result.error) { App.showToast(result.error, 'error'); return; }
      App.showToast('已批准', 'success');
      document.getElementById(`approval-${bookingId}`)?.remove();
      // 检查是否还有待审批
      const list = document.getElementById('approvalList');
      if (list && list.children.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>暂无待审批的申请</p></div>';
      }
    } catch (err) {
      App.showToast('操作失败：' + err.message, 'error');
    }
  },

  showRejectForm(bookingId) {
    document.getElementById(`rejectForm-${bookingId}`).style.display = 'block';
  },

  hideRejectForm(bookingId) {
    document.getElementById(`rejectForm-${bookingId}`).style.display = 'none';
  },

  async reject(bookingId) {
    const reason = document.getElementById(`rejectReason-${bookingId}`).value.trim();
    if (!reason) { App.showToast('请填写拒绝原因', 'error'); return; }

    try {
      const result = await API.rejectBooking(bookingId, reason);
      if (result.error) { App.showToast(result.error, 'error'); return; }
      App.showToast('已拒绝', 'success');
      document.getElementById(`approval-${bookingId}`)?.remove();
      const list = document.getElementById('approvalList');
      if (list && list.children.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>暂无待审批的申请</p></div>';
      }
    } catch (err) {
      App.showToast('操作失败：' + err.message, 'error');
    }
  },

  // ===== 预约管理 =====
  async renderBookings() {
    if (!Auth.isAdmin()) { App.navigate('login'); return; }

    const container = document.getElementById('page-admin-bookings');
    container.innerHTML = `
      <div class="page-header">
        <h2>预约管理</h2>
      </div>
      <div class="filter-bar">
        <select id="abLabFilter">
          <option value="">所有实验室</option>
          ${Object.entries(CONFIG.LABS).map(([id, lab]) =>
            `<option value="${id}">${lab.name}</option>`
          ).join('')}
        </select>
        <select id="abSubjectFilter">
          <option value="">所有科目</option>
          ${Object.entries(CONFIG.SUBJECTS).map(([id, sub]) =>
            `<option value="${id}">${sub.name}</option>`
          ).join('')}
        </select>
        <input type="text" id="abSearch" placeholder="搜索老师/班级..." class="search-input">
      </div>
      <div id="adminBookingsList" class="booking-list">
        <div class="loading">加载中...</div>
      </div>
    `;

    this._adminBookings = [];
    await this._loadAdminBookings();

    document.getElementById('abLabFilter').addEventListener('change', () => this._filterAdminBookings());
    document.getElementById('abSubjectFilter').addEventListener('change', () => this._filterAdminBookings());
    document.getElementById('abSearch').addEventListener('input', () => this._filterAdminBookings());
  },

  async _loadAdminBookings() {
    try {
      const result = await API.getBookings({ status: 'approved' });
      this._adminBookings = (result.data || []).sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      );
      this._filterAdminBookings();
    } catch (err) {
      document.getElementById('adminBookingsList').innerHTML =
        `<div class="error-state">加载失败：${err.message}</div>`;
    }
  },

  _filterAdminBookings() {
    const lab = document.getElementById('abLabFilter').value;
    const subject = document.getElementById('abSubjectFilter').value;
    const search = document.getElementById('abSearch').value.toLowerCase();

    let filtered = this._adminBookings;
    if (lab) filtered = filtered.filter(b => b.lab === lab);
    if (subject) filtered = filtered.filter(b => b.subject === subject);
    if (search) filtered = filtered.filter(b =>
      b.teacherName.toLowerCase().includes(search) ||
      b.class.toLowerCase().includes(search)
    );

    const listEl = document.getElementById('adminBookingsList');
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><p>没有匹配的预约记录</p></div>';
      return;
    }

    listEl.innerHTML = filtered.map(b => `
      <div class="booking-card">
        <div class="booking-card-header">
          <span class="lab-badge" style="background:${CONFIG.LABS[b.lab]?.colorLight};color:${CONFIG.LABS[b.lab]?.color}">
            ${getLabName(b.lab)}
          </span>
          <span class="booking-date">${formatDateCN(b.date)}</span>
        </div>
        <div class="booking-card-body">
          <div class="booking-info">
            <span>${getPeriodText(parseInt(b.period))}</span>
          </div>
          <div class="booking-detail">
            <span>老师：${b.teacherName}</span>
            <span>班级：${b.class}</span>
            <span>科目：${getSubjectName(b.subject)}</span>
          </div>
          ${b.note ? `<div class="booking-note">备注：${b.note}</div>` : ''}
        </div>
        <div class="booking-card-footer">
          <button class="btn btn-sm btn-danger" onclick="Admin.deleteBooking('${b.id}')">删除</button>
        </div>
      </div>
    `).join('');
  },

  async deleteBooking(bookingId) {
    if (!confirm('确定要删除这个预约吗？此操作不可恢复。')) return;
    try {
      const result = await API.deleteBooking(bookingId);
      if (result.error) { App.showToast(result.error, 'error'); return; }
      App.showToast('已删除', 'success');
      this._adminBookings = this._adminBookings.filter(b => b.id !== bookingId);
      this._filterAdminBookings();
    } catch (err) {
      App.showToast('删除失败：' + err.message, 'error');
    }
  },

  // ===== 特殊占用管理 =====
  async renderBlocked() {
    if (!Auth.isAdmin()) { App.navigate('login'); return; }

    const container = document.getElementById('page-admin-blocked');
    container.innerHTML = `
      <div class="page-header">
        <h2>特殊占用管理</h2>
      </div>
      <div class="card">
        <h3>新增特殊占用</h3>
        <form id="blockedForm">
          <div class="form-row">
            <div class="form-group">
              <label for="blLab">实验室</label>
              <select id="blLab" required>
                <option value="all">所有实验室</option>
                ${Object.entries(CONFIG.LABS).map(([id, lab]) =>
                  `<option value="${id}">${lab.name}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="blType">类型</label>
              <select id="blType" required>
                ${Object.entries(CONFIG.BLOCKED_TYPES).map(([id, type]) =>
                  `<option value="${id}">${type.name}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="blDate">日期</label>
              <input type="date" id="blDate" required>
            </div>
            <div class="form-group">
              <label for="blPeriod">节次</label>
              <select id="blPeriod" required>
                <option value="all">全天（所有节次）</option>
                ${CONFIG.PERIODS.map(p =>
                  `<option value="${p.period}">${getPeriodText(p.period)}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="blNote">备注</label>
            <input type="text" id="blNote" placeholder="例如：期中考第一天">
          </div>
          <button type="submit" class="btn btn-primary">新增</button>
        </form>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>现有特殊占用</h3>
        <div id="blockedList">
          <div class="loading">加载中...</div>
        </div>
      </div>
    `;

    document.getElementById('blDate').value = formatDate(getMalaysiaTime());

    document.getElementById('blockedForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._addBlocked();
    });

    await this._loadBlocked();
  },

  async _loadBlocked() {
    try {
      const result = await API.getBlocked();
      const blocked = (result.data || []).sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      );

      const listEl = document.getElementById('blockedList');
      if (blocked.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>暂无特殊占用记录</p></div>';
        return;
      }

      listEl.innerHTML = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>实验室</th>
                <th>节次</th>
                <th>类型</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${blocked.map(bl => `
                <tr>
                  <td>${formatDateCN(bl.date)}</td>
                  <td>${bl.lab === 'all' ? '所有实验室' : getLabName(bl.lab)}</td>
                  <td>${bl.period === 'all' ? '全天' : getPeriodText(parseInt(bl.period))}</td>
                  <td>${getBlockedTypeName(bl.type)}</td>
                  <td>${bl.note || '-'}</td>
                  <td><button class="btn btn-sm btn-danger" onclick="Admin.deleteBlocked('${bl.id}')">删除</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      document.getElementById('blockedList').innerHTML =
        `<div class="error-state">加载失败：${err.message}</div>`;
    }
  },

  async _addBlocked() {
    try {
      const blocked = {
        lab: document.getElementById('blLab').value,
        date: document.getElementById('blDate').value,
        period: document.getElementById('blPeriod').value,
        type: document.getElementById('blType').value,
        note: document.getElementById('blNote').value
      };
      const result = await API.addBlocked(blocked);
      if (result.error) { App.showToast(result.error, 'error'); return; }
      App.showToast('特殊占用已新增', 'success');
      document.getElementById('blNote').value = '';
      await this._loadBlocked();
    } catch (err) {
      App.showToast('新增失败：' + err.message, 'error');
    }
  },

  async deleteBlocked(blockedId) {
    if (!confirm('确定要删除这条特殊占用记录吗？')) return;
    try {
      const result = await API.deleteBlocked(blockedId);
      if (result.error) { App.showToast(result.error, 'error'); return; }
      App.showToast('已删除', 'success');
      await this._loadBlocked();
    } catch (err) {
      App.showToast('删除失败：' + err.message, 'error');
    }
  },

  // ===== 统计页 =====
  async renderStats() {
    if (!Auth.isAdmin()) { App.navigate('login'); return; }

    const container = document.getElementById('page-admin-stats');
    container.innerHTML = `
      <div class="page-header">
        <h2>使用统计</h2>
      </div>
      <div class="filter-bar">
        <label>月份：</label>
        <input type="month" id="statsMonth" value="${formatDate(getMalaysiaTime()).substring(0, 7)}">
      </div>
      <div id="statsContent">
        <div class="loading">加载中...</div>
      </div>
    `;

    document.getElementById('statsMonth').addEventListener('change', () => this._renderStats());
    await this._renderStats();
  },

  async _renderStats() {
    const month = document.getElementById('statsMonth').value;
    const [year, mon] = month.split('-');
    const dateFrom = `${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const dateTo = `${month}-${lastDay}`;

    try {
      const result = await API.getBookings({ status: 'approved', dateFrom, dateTo });
      const bookings = result.data || [];

      // 各实验室使用节数
      const labStats = {};
      Object.keys(CONFIG.LABS).forEach(id => labStats[id] = 0);
      bookings.forEach(b => { if (labStats[b.lab] !== undefined) labStats[b.lab]++; });

      // 总可用节数（每间实验室 x 每天节数 x 工作日数）
      let workdays = 0;
      for (let d = 1; d <= lastDay; d++) {
        const day = new Date(parseInt(year), parseInt(mon) - 1, d).getDay();
        if (day >= 1 && day <= 6) workdays++;
      }
      const totalSlots = 4 * CONFIG.PERIODS.length * workdays;
      const totalUsed = Object.values(labStats).reduce((a, b) => a + b, 0);
      const usageRate = totalSlots > 0 ? ((totalUsed / totalSlots) * 100).toFixed(1) : 0;

      // 各科目预约次数
      const subjectStats = {};
      Object.keys(CONFIG.SUBJECTS).forEach(id => subjectStats[id] = 0);
      bookings.forEach(b => { if (subjectStats[b.subject] !== undefined) subjectStats[b.subject]++; });

      // 各老师预约次数
      const teacherStats = {};
      bookings.forEach(b => {
        teacherStats[b.teacherName] = (teacherStats[b.teacherName] || 0) + 1;
      });
      const teacherRank = Object.entries(teacherStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const contentEl = document.getElementById('statsContent');
      contentEl.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${totalUsed}</div>
            <div class="stat-label">总使用节数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${usageRate}%</div>
            <div class="stat-label">整体使用率</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${bookings.length}</div>
            <div class="stat-label">已批准预约数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${workdays}</div>
            <div class="stat-label">工作日天数</div>
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <h3>各实验室使用节数</h3>
          <div class="bar-chart">
            ${Object.entries(labStats).map(([id, count]) => {
              const max = Math.max(...Object.values(labStats), 1);
              const pct = (count / max * 100).toFixed(0);
              return `
                <div class="bar-item">
                  <span class="bar-label">${getLabName(id)}</span>
                  <div class="bar-track">
                    <div class="bar-fill" style="width:${pct}%;background:${CONFIG.LABS[id].color}"></div>
                  </div>
                  <span class="bar-value">${count} 节</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <h3>各科目预约次数</h3>
          <div class="bar-chart">
            ${Object.entries(subjectStats).map(([id, count]) => {
              const max = Math.max(...Object.values(subjectStats), 1);
              const pct = (count / max * 100).toFixed(0);
              const color = CONFIG.LABS[id]?.color || '#666';
              return `
                <div class="bar-item">
                  <span class="bar-label">${getSubjectName(id)}</span>
                  <div class="bar-track">
                    <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
                  </div>
                  <span class="bar-value">${count} 次</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <h3>老师预约次数排行（前10）</h3>
          ${teacherRank.length === 0
            ? '<p class="empty-text">本月暂无数据</p>'
            : `<div class="table-wrapper">
                <table class="data-table">
                  <thead><tr><th>排名</th><th>老师</th><th>预约次数</th></tr></thead>
                  <tbody>
                    ${teacherRank.map(([name, count], i) =>
                      `<tr><td>${i+1}</td><td>${name}</td><td>${count}</td></tr>`
                    ).join('')}
                  </tbody>
                </table>
              </div>`
          }
        </div>
      `;
    } catch (err) {
      document.getElementById('statsContent').innerHTML =
        `<div class="error-state">加载失败：${err.message}</div>`;
    }
  }
};

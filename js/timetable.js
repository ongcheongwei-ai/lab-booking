// ==========================================
// 实验室预约管理系统 — 时间表模块
// ==========================================

const Timetable = {
  _currentWeekOffset: 0,
  _selectedLab: 'all',
  _bookings: [],
  _blocked: [],

  async render() {
    const container = document.getElementById('page-timetable');
    container.innerHTML = `
      <div class="page-header">
        <h2>预约时间表</h2>
      </div>
      <div class="timetable-controls">
        <div class="week-nav">
          <button class="btn btn-sm" id="ttPrevWeek">&larr; 上一周</button>
          <span id="ttWeekLabel" class="week-label"></span>
          <button class="btn btn-sm" id="ttNextWeek">下一周 &rarr;</button>
          <button class="btn btn-sm btn-outline" id="ttThisWeek">本周</button>
        </div>
        <div class="lab-filter">
          <label>实验室：</label>
          <select id="ttLabFilter">
            <option value="all">全部实验室</option>
            ${Object.entries(CONFIG.LABS).map(([id, lab]) =>
              `<option value="${id}">${lab.name}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div id="ttGrid" class="timetable-grid-wrapper"></div>
    `;

    document.getElementById('ttPrevWeek').addEventListener('click', () => {
      this._currentWeekOffset--;
      this._renderGrid();
    });
    document.getElementById('ttNextWeek').addEventListener('click', () => {
      this._currentWeekOffset++;
      this._renderGrid();
    });
    document.getElementById('ttThisWeek').addEventListener('click', () => {
      this._currentWeekOffset = 0;
      this._renderGrid();
    });
    document.getElementById('ttLabFilter').addEventListener('change', (e) => {
      this._selectedLab = e.target.value;
      this._renderGrid();
    });

    await this._loadData();
    this._renderGrid();
  },

  async _loadData() {
    try {
      const [bookingsRes, blockedRes] = await Promise.all([
        API.getBookings({ status: 'approved' }),
        API.getBlocked()
      ]);
      this._bookings = bookingsRes.data || [];
      this._blocked = blockedRes.data || [];
    } catch (err) {
      console.error('加载时间表数据失败:', err);
    }
  },

  _renderGrid() {
    const baseDate = getMalaysiaTime();
    baseDate.setDate(baseDate.getDate() + this._currentWeekOffset * 7);
    const weekDates = getWeekDates(baseDate);

    // 更新周标签
    const startDate = weekDates[0];
    const endDate = weekDates[weekDates.length - 1];
    document.getElementById('ttWeekLabel').textContent =
      `${formatDateCN(startDate)} — ${formatDateCN(endDate)}`;

    const labs = this._selectedLab === 'all'
      ? Object.keys(CONFIG.LABS)
      : [this._selectedLab];

    const gridEl = document.getElementById('ttGrid');

    let html = '';
    labs.forEach(labId => {
      const lab = CONFIG.LABS[labId];
      html += `<div class="timetable-section">
        <h3 class="lab-title" style="border-left: 4px solid ${lab.color}; padding-left: 8px;">
          ${lab.name}
        </h3>
        <div class="timetable-table-wrapper">
          <table class="timetable-table">
            <thead>
              <tr>
                <th class="th-period">节次</th>
                ${weekDates.map((d, i) => {
                  const dateObj = new Date(d + 'T00:00:00');
                  const isToday = d === formatDate(getMalaysiaTime());
                  return `<th class="${isToday ? 'th-today' : ''}">
                    ${CONFIG.WEEKDAY_SHORT[i]}<br>
                    <small>${dateObj.getMonth()+1}/${dateObj.getDate()}</small>
                  </th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${CONFIG.PERIODS.map(p => `
                <tr>
                  <td class="td-period">
                    <strong>第${p.period}节</strong><br>
                    <small>${p.start}-${p.end}</small>
                  </td>
                  ${weekDates.map(date => {
                    const cell = this._getCellContent(labId, date, p.period);
                    return `<td class="td-slot ${cell.class}" ${cell.onClick}>${cell.html}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    });

    gridEl.innerHTML = html;
  },

  _getCellContent(labId, date, period) {
    // 检查特殊占用
    const blocked = this._blocked.find(bl =>
      (bl.lab === labId || bl.lab === 'all') &&
      bl.date === date &&
      (bl.period === 'all' || String(bl.period) === String(period))
    );
    if (blocked) {
      return {
        class: 'slot-blocked',
        html: `<span class="slot-label">${getBlockedTypeName(blocked.type)}</span>
               ${blocked.note ? `<small>${blocked.note}</small>` : ''}`,
        onClick: ''
      };
    }

    // 检查已批准预约
    const booking = this._bookings.find(b =>
      b.lab === labId && b.date === date && String(b.period) === String(period)
    );
    if (booking) {
      return {
        class: 'slot-booked',
        html: `<span class="slot-label">${booking.class}</span>
               <small>${booking.teacherName}</small>
               <small>${getSubjectName(booking.subject)}</small>`,
        onClick: ''
      };
    }

    // 空闲
    const canBook = Auth.isTeacher();
    return {
      class: 'slot-free' + (canBook ? ' slot-clickable' : ''),
      html: '<span class="slot-label">空闲</span>',
      onClick: canBook ? `onclick="Timetable.onSlotClick('${labId}','${date}',${period})"` : ''
    };
  },

  onSlotClick(labId, date, period) {
    if (!Auth.isTeacher()) return;
    // 跳转到预约页面并预填信息
    Booking._prefill = { lab: labId, date, period };
    App.navigate('booking');
  }
};

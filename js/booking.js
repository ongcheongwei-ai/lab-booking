// ==========================================
// 实验室预约管理系统 — 预约申请模块
// ==========================================

const Booking = {
  _prefill: null,
  _classes: [],
  _bookings: [],
  _blocked: [],

  // 渲染预约申请页面
  async render() {
    if (!Auth.isTeacher()) {
      App.navigate('login');
      return;
    }

    const container = document.getElementById('page-booking');
    container.innerHTML = `
      <div class="page-header">
        <h2>提交预约申请</h2>
      </div>
      <div class="card">
        <form id="bookingForm">
          <div class="form-group">
            <label for="bkClass">班级</label>
            <select id="bkClass" required>
              <option value="">-- 请选择班级 --</option>
            </select>
          </div>
          <div class="form-group">
            <label for="bkSubject">科目</label>
            <input type="text" id="bkSubject" readonly>
            <input type="hidden" id="bkSubjectId">
          </div>
          <div class="form-group">
            <label for="bkLab">实验室</label>
            <select id="bkLab" required>
              <option value="">-- 请选择实验室 --</option>
            </select>
          </div>
          <div class="form-group">
            <label for="bkDate">日期</label>
            <input type="date" id="bkDate" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="bkPeriod">起始节次</label>
              <select id="bkPeriod" required>
                <option value="">-- 请选择节次 --</option>
              </select>
            </div>
            <div class="form-group">
              <label for="bkDuration">连续节数</label>
              <select id="bkDuration" required>
                <option value="1">1 节</option>
                <option value="2">连续 2 节</option>
              </select>
            </div>
          </div>
          <div id="bkDurationWarning" class="info-msg" style="display:none"></div>
          <div class="form-group">
            <label for="bkNote">备注（选填）</label>
            <textarea id="bkNote" rows="2" placeholder="例如：需要显微镜 x30"></textarea>
          </div>
          <div id="bkConflictMsg" class="error-msg" style="display:none"></div>
          <div id="bkSummary" class="booking-summary" style="display:none"></div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" id="bkPreview">预览申请</button>
            <button type="submit" class="btn btn-primary" id="bkSubmit" disabled>提交申请</button>
          </div>
        </form>
      </div>
    `;

    await this._loadData();
    this._populateForm();
    this._bindEvents();
  },

  async _loadData() {
    try {
      const [classesRes, bookingsRes, blockedRes] = await Promise.all([
        API.getClasses(),
        API.getBookings(),
        API.getBlocked()
      ]);
      this._classes = classesRes.data || [];
      this._bookings = bookingsRes.data || [];
      this._blocked = blockedRes.data || [];
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  },

  _populateForm() {
    const user = Auth.getUser();
    const classSelect = document.getElementById('bkClass');
    const subjectInput = document.getElementById('bkSubject');
    const subjectIdInput = document.getElementById('bkSubjectId');

    // 填充班级选择（按年段分组）
    const groups = {};
    this._classes.forEach(c => {
      const key = `${c.level} - ${c.grade}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    for (const [groupName, classes] of Object.entries(groups)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = groupName;
      classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        opt.dataset.level = c.level;
        opt.dataset.name = c.name;
        optgroup.appendChild(opt);
      });
      classSelect.appendChild(optgroup);
    }

    // 自动设置科目
    const primarySubject = user.subjects[0];
    subjectInput.value = getSubjectName(primarySubject);
    subjectIdInput.value = primarySubject;

    // 设置日期默认值和限制
    const dateInput = document.getElementById('bkDate');
    const today = formatDate(getMalaysiaTime());
    dateInput.value = today;
    dateInput.min = today;

    // 应用预填信息
    if (this._prefill) {
      if (this._prefill.date) dateInput.value = this._prefill.date;
      if (this._prefill.lab) {
        setTimeout(() => {
          document.getElementById('bkLab').value = this._prefill.lab;
          this._updatePeriods();
        }, 100);
      }
      if (this._prefill.period) {
        setTimeout(() => {
          document.getElementById('bkPeriod').value = this._prefill.period;
        }, 200);
      }
      this._prefill = null;
    }

    this._updateLabs();
  },

  _bindEvents() {
    const classSelect = document.getElementById('bkClass');
    const labSelect = document.getElementById('bkLab');
    const dateInput = document.getElementById('bkDate');
    const periodSelect = document.getElementById('bkPeriod');

    classSelect.addEventListener('change', () => this._updateLabs());
    labSelect.addEventListener('change', () => this._updatePeriods());
    dateInput.addEventListener('change', () => this._updatePeriods());
    periodSelect.addEventListener('change', () => this._checkDuration());
    document.getElementById('bkDuration').addEventListener('change', () => this._checkDuration());

    document.getElementById('bkPreview').addEventListener('click', () => this._showSummary());
    document.getElementById('bookingForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this._submitBooking();
    });
  },

  _updateLabs() {
    const labSelect = document.getElementById('bkLab');
    const classSelect = document.getElementById('bkClass');
    const selectedOption = classSelect.selectedOptions[0];
    const user = Auth.getUser();

    labSelect.innerHTML = '<option value="">-- 请选择实验室 --</option>';

    if (!selectedOption || !selectedOption.value) return;

    const level = selectedOption.dataset.level;
    const subject = document.getElementById('bkSubjectId').value;

    if (level === '高中' && CONFIG.SENIOR_SUBJECT_LAB_MAP[subject]) {
      // 高中理科 — 只能选对应实验室
      const labId = CONFIG.SENIOR_SUBJECT_LAB_MAP[subject];
      const lab = CONFIG.LABS[labId];
      const opt = document.createElement('option');
      opt.value = labId;
      opt.textContent = lab.name;
      opt.selected = true;
      labSelect.appendChild(opt);
    } else {
      // 初中综合科学 — 可选所有实验室
      Object.entries(CONFIG.LABS).forEach(([id, lab]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = lab.name;
        labSelect.appendChild(opt);
      });
    }

    this._updatePeriods();
  },

  _updatePeriods() {
    const periodSelect = document.getElementById('bkPeriod');
    const labId = document.getElementById('bkLab').value;
    const date = document.getElementById('bkDate').value;

    periodSelect.innerHTML = '<option value="">-- 请选择节次 --</option>';
    if (!labId || !date) return;

    // 检查星期（只允许周一到周六）
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    if (dayOfWeek === 0) {
      periodSelect.innerHTML = '<option value="">星期日不可预约</option>';
      return;
    }

    CONFIG.PERIODS.forEach(p => {
      const isBlocked = this._blocked.some(bl =>
        (bl.lab === labId || bl.lab === 'all') &&
        bl.date === date &&
        (bl.period === 'all' || String(bl.period) === String(p.period))
      );
      const isBooked = this._bookings.some(b =>
        b.lab === labId && b.date === date &&
        String(b.period) === String(p.period) &&
        (b.status === 'approved' || b.status === 'pending')
      );

      const opt = document.createElement('option');
      opt.value = p.period;
      opt.textContent = getPeriodText(p.period);

      if (isBlocked) {
        opt.textContent += ' [特殊占用]';
        opt.disabled = true;
      } else if (isBooked) {
        opt.textContent += ' [已占用]';
        opt.disabled = true;
      }

      periodSelect.appendChild(opt);
    });

    // 检查是否所有时段都被占用
    const availableCount = [...periodSelect.options].filter(o => o.value && !o.disabled).length;
    if (availableCount === 0) {
      // 提示其他可用实验室
      const user = Auth.getUser();
      const subject = document.getElementById('bkSubjectId').value;
      if (subject === 'sci') {
        const otherLabs = Object.keys(CONFIG.LABS).filter(id => id !== labId);
        const suggestions = otherLabs.filter(otherId => {
          return CONFIG.PERIODS.some(p => {
            const blocked = this._blocked.some(bl =>
              (bl.lab === otherId || bl.lab === 'all') &&
              bl.date === date &&
              (bl.period === 'all' || String(bl.period) === String(p.period))
            );
            const booked = this._bookings.some(b =>
              b.lab === otherId && b.date === date &&
              String(b.period) === String(p.period) &&
              (b.status === 'approved' || b.status === 'pending')
            );
            return !blocked && !booked;
          });
        });
        if (suggestions.length > 0) {
          const msg = document.getElementById('bkConflictMsg');
          msg.textContent = `该实验室当日所有时段已满。以下实验室尚有空位：${suggestions.map(id => getLabName(id)).join('、')}`;
          msg.style.display = 'block';
          msg.className = 'info-msg';
        }
      }
    }
  },

  _checkDuration() {
    const msg = document.getElementById('bkConflictMsg');
    const warning = document.getElementById('bkDurationWarning');
    msg.style.display = 'none';
    msg.className = 'error-msg';
    warning.style.display = 'none';
    document.getElementById('bkSubmit').disabled = false;

    const duration = parseInt(document.getElementById('bkDuration').value);
    const periodNum = parseInt(document.getElementById('bkPeriod').value);
    if (!periodNum || duration < 2) return;

    // 检查下一节是否是连续的（不跨休息时间）
    const periodIndex = CONFIG.PERIODS.findIndex(p => p.period === periodNum);
    if (periodIndex === -1 || periodIndex + 1 >= CONFIG.PERIODS.length) {
      warning.textContent = '最后一节课无法选择连续2节';
      warning.style.display = 'block';
      document.getElementById('bkSubmit').disabled = true;
      return;
    }

    const nextPeriod = CONFIG.PERIODS[periodIndex + 1];
    const currentEnd = CONFIG.PERIODS[periodIndex].end;
    // 如果当前节次结束时间 !== 下一节开始时间，说明中间有休息
    if (currentEnd !== nextPeriod.start) {
      warning.textContent = `注意：第${periodNum}节和第${nextPeriod.period}节之间有休息时间（${currentEnd}–${nextPeriod.start}），但仍可连续预约。`;
      warning.style.display = 'block';
    }

    // 检查下一节是否被占用
    const labId = document.getElementById('bkLab').value;
    const date = document.getElementById('bkDate').value;
    const nextBlocked = this._blocked.some(bl =>
      (bl.lab === labId || bl.lab === 'all') &&
      bl.date === date &&
      (bl.period === 'all' || String(bl.period) === String(nextPeriod.period))
    );
    const nextBooked = this._bookings.some(b =>
      b.lab === labId && b.date === date &&
      String(b.period) === String(nextPeriod.period) &&
      (b.status === 'approved' || b.status === 'pending')
    );

    if (nextBlocked || nextBooked) {
      msg.textContent = `第${nextPeriod.period}节（${nextPeriod.start}–${nextPeriod.end}）已被占用，无法连续预约2节。请改为1节或选择其他时段。`;
      msg.style.display = 'block';
      document.getElementById('bkSubmit').disabled = true;
    }
  },

  _showSummary() {
    const form = document.getElementById('bookingForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const classSelect = document.getElementById('bkClass');
    const className = classSelect.selectedOptions[0].dataset.name;
    const subject = document.getElementById('bkSubject').value;
    const labName = getLabName(document.getElementById('bkLab').value);
    const date = formatDateCN(document.getElementById('bkDate').value);
    const periodNum = parseInt(document.getElementById('bkPeriod').value);
    const duration = parseInt(document.getElementById('bkDuration').value);
    const note = document.getElementById('bkNote').value;

    let periodDisplay = getPeriodText(periodNum);
    if (duration === 2) {
      const periodIndex = CONFIG.PERIODS.findIndex(p => p.period === periodNum);
      const nextPeriod = CONFIG.PERIODS[periodIndex + 1];
      periodDisplay = `第${periodNum}–${nextPeriod.period}节 (${CONFIG.PERIODS[periodIndex].start}–${nextPeriod.end})`;
    }

    const summary = document.getElementById('bkSummary');
    summary.innerHTML = `
      <h4>预约确认</h4>
      <div class="summary-item"><span>老师：</span><strong>${Auth.getUser().name}</strong></div>
      <div class="summary-item"><span>班级：</span><strong>${className}</strong></div>
      <div class="summary-item"><span>科目：</span><strong>${subject}</strong></div>
      <div class="summary-item"><span>实验室：</span><strong>${labName}</strong></div>
      <div class="summary-item"><span>日期：</span><strong>${date}</strong></div>
      <div class="summary-item"><span>节次：</span><strong>${periodDisplay}</strong></div>
      <div class="summary-item"><span>节数：</span><strong>${duration} 节</strong></div>
      ${note ? `<div class="summary-item"><span>备注：</span><strong>${note}</strong></div>` : ''}
    `;
    summary.style.display = 'block';
    document.getElementById('bkSubmit').disabled = false;
  },

  async _submitBooking() {
    const user = Auth.getUser();
    const classSelect = document.getElementById('bkClass');
    const submitBtn = document.getElementById('bkSubmit');

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';

    try {
      const periodNum = parseInt(document.getElementById('bkPeriod').value);
      const duration = parseInt(document.getElementById('bkDuration').value);
      const baseBooking = {
        teacherName: user.name,
        teacherId: user.id,
        subject: document.getElementById('bkSubjectId').value,
        lab: document.getElementById('bkLab').value,
        class: classSelect.selectedOptions[0].dataset.name,
        date: document.getElementById('bkDate').value,
        note: document.getElementById('bkNote').value
      };

      // 提交第一节
      const result1 = await API.submitBooking({ ...baseBooking, period: String(periodNum) });
      if (result1.error) {
        const msg = document.getElementById('bkConflictMsg');
        msg.textContent = result1.error;
        msg.style.display = 'block';
        return;
      }

      // 如果是连续2节，提交第二节
      if (duration === 2) {
        const periodIndex = CONFIG.PERIODS.findIndex(p => p.period === periodNum);
        const nextPeriod = CONFIG.PERIODS[periodIndex + 1];
        const result2 = await API.submitBooking({ ...baseBooking, period: String(nextPeriod.period) });
        if (result2.error) {
          const msg = document.getElementById('bkConflictMsg');
          msg.textContent = `第1节已提交，但第${nextPeriod.period}节失败：${result2.error}`;
          msg.style.display = 'block';
          return;
        }
      }

      const successMsg = duration === 2 ? '连续2节预约申请已提交！等待实验室助理审批。' : '预约申请已提交！等待实验室助理审批。';
      App.showToast(successMsg, 'success');
      App.navigate('my-bookings');
    } catch (err) {
      App.showToast('提交失败：' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '提交申请';
    }
  },

  // 渲染"我的申请"页面
  async renderMyBookings() {
    if (!Auth.isTeacher()) {
      App.navigate('login');
      return;
    }

    const container = document.getElementById('page-my-bookings');
    container.innerHTML = `
      <div class="page-header">
        <h2>我的申请</h2>
      </div>
      <div id="myBookingsList" class="booking-list">
        <div class="loading">加载中...</div>
      </div>
    `;

    try {
      const user = Auth.getUser();
      const result = await API.getBookings({ teacherId: user.id });
      const bookings = (result.data || []).sort((a, b) =>
        new Date(b.submittedAt) - new Date(a.submittedAt)
      );

      const listEl = document.getElementById('myBookingsList');

      if (bookings.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>暂无申请记录</p><button class="btn btn-primary" onclick="App.navigate(\'booking\')">立即预约</button></div>';
        return;
      }

      listEl.innerHTML = bookings.map(b => `
        <div class="booking-card">
          <div class="booking-card-header">
            <span class="status-badge status-${b.status}">${getStatusName(b.status)}</span>
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
              <span>班级：${b.class}</span>
              <span>科目：${getSubjectName(b.subject)}</span>
            </div>
            ${b.note ? `<div class="booking-note">备注：${b.note}</div>` : ''}
            ${b.status === 'rejected' && b.rejectedReason
              ? `<div class="reject-reason">拒绝原因：${b.rejectedReason}</div>`
              : ''}
          </div>
          ${b.status === 'pending' ? `
            <div class="booking-card-footer">
              <button class="btn btn-sm btn-danger" onclick="Booking.cancelBooking('${b.id}')">取消申请</button>
            </div>
          ` : ''}
        </div>
      `).join('');
    } catch (err) {
      document.getElementById('myBookingsList').innerHTML =
        `<div class="error-state">加载失败：${err.message}</div>`;
    }
  },

  async cancelBooking(bookingId) {
    if (!confirm('确定要取消这个申请吗？')) return;

    try {
      const result = await API.cancelBooking(bookingId);
      if (result.error) {
        App.showToast(result.error, 'error');
        return;
      }
      App.showToast('申请已取消', 'success');
      this.renderMyBookings();
    } catch (err) {
      App.showToast('取消失败：' + err.message, 'error');
    }
  }
};

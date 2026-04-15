// ==========================================
// 实验室预约管理系统 — API 通信层
// ==========================================

const API = {
  // 发送请求到 Google Apps Script
  async request(action, params = {}) {
    const url = CONFIG.API_URL;
    if (!url || url === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn('API URL 尚未配置，使用模拟数据');
      return this.mockRequest(action, params);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action, ...params })
      });
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data.error) throw new Error(data.error);
        // 清洗日期字段：将各种日期格式统一为 YYYY-MM-DD
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(item => {
            if (item.date) item.date = this._normalizeDate(item.date);
          });
        }
        return data;
      } catch (parseErr) {
        // 如果响应不是 JSON，可能是 Google 登入页面 HTML
        console.error('API 响应非 JSON:', text.substring(0, 200));
        throw new Error('API 返回非预期格式');
      }
    } catch (err) {
      console.error(`API 请求失败 [${action}]:`, err);
      // 如果 fetch 失败，回退到模拟数据
      console.warn('回退到模拟数据模式');
      return this.mockRequest(action, params);
    }
  },

  // 将各种日期格式统一为 YYYY-MM-DD
  _normalizeDate(dateStr) {
    if (!dateStr) return dateStr;
    const s = String(dateStr);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return s;
  },

  // --- 老师相关 ---
  async getTeachers() {
    return this.request('getTeachers');
  },

  // --- 班级相关 ---
  async getClasses() {
    return this.request('getClasses');
  },

  // --- 预约相关 ---
  async getBookings(filters = {}) {
    return this.request('getBookings', filters);
  },

  async submitBooking(booking) {
    return this.request('submitBooking', booking);
  },

  async cancelBooking(bookingId) {
    return this.request('cancelBooking', { id: bookingId });
  },

  async approveBooking(bookingId) {
    return this.request('approveBooking', { id: bookingId });
  },

  async rejectBooking(bookingId, reason) {
    return this.request('rejectBooking', { id: bookingId, reason });
  },

  async updateBooking(booking) {
    return this.request('updateBooking', booking);
  },

  async deleteBooking(bookingId) {
    return this.request('deleteBooking', { id: bookingId });
  },

  // --- 特殊占用相关 ---
  async getBlocked() {
    return this.request('getBlocked');
  },

  async addBlocked(blocked) {
    return this.request('addBlocked', blocked);
  },

  async deleteBlocked(blockedId) {
    return this.request('deleteBlocked', { id: blockedId });
  },

  // --- 认证相关 ---
  async login(teacherId, password) {
    return this.request('login', { teacherId, password });
  },

  async adminLogin(password) {
    return this.request('adminLogin', { password });
  },

  // --- 设置相关 ---
  async getSettings() {
    return this.request('getSettings');
  },

  // ==========================================
  // 模拟数据（开发测试用，未配置 API 时使用）
  // ==========================================
  _mockData: {
    teachers: [
      { id: 't1', name: '王明华', subjects: 'bio', password: '1234' },
      { id: 't2', name: '李秀英', subjects: 'bio', password: '1234' },
      { id: 't3', name: '张伟强', subjects: 'bio,sci', password: '1234' },
      { id: 't4', name: '陈美玲', subjects: 'bio', password: '1234' },
      { id: 't5', name: '林志豪', subjects: 'bio', password: '1234' },
      { id: 't6', name: '黄丽珍', subjects: 'chem', password: '1234' },
      { id: 't7', name: '刘建国', subjects: 'chem', password: '1234' },
      { id: 't8', name: '吴佩珊', subjects: 'chem', password: '1234' },
      { id: 't9', name: '郑文杰', subjects: 'chem', password: '1234' },
      { id: 't10', name: '周雅琳', subjects: 'phys', password: '1234' },
      { id: 't11', name: '蔡国栋', subjects: 'phys', password: '1234' },
      { id: 't12', name: '许慧敏', subjects: 'phys', password: '1234' },
      { id: 't13', name: '杨俊贤', subjects: 'phys', password: '1234' },
      { id: 't14', name: '赵淑芬', subjects: 'sci', password: '1234' },
      { id: 't15', name: '孙家明', subjects: 'sci', password: '1234' },
      { id: 't16', name: '朱丽华', subjects: 'sci', password: '1234' },
      { id: 't17', name: '何志远', subjects: 'sci', password: '1234' },
      { id: 't18', name: '胡美琴', subjects: 'sci', password: '1234' },
      { id: 't19', name: '高文斌', subjects: 'sci', password: '1234' },
      { id: 't20', name: '马晓燕', subjects: 'sci', password: '1234' },
      { id: 't21', name: '罗国辉', subjects: 'sci', password: '1234' },
      { id: 't22', name: '谢佩怡', subjects: 'sci', password: '1234' },
      { id: 't23', name: '邓志强', subjects: 'sci', password: '1234' },
      { id: 't24', name: '萧雅文', subjects: 'sci', password: '1234' },
      { id: 't25', name: '曹伟民', subjects: 'sci', password: '1234' },
      { id: 't26', name: '叶秋萍', subjects: 'sci', password: '1234' },
      { id: 't27', name: '韩建华', subjects: 'sci', password: '1234' },
      { id: 't28', name: '唐美云', subjects: 'sci', password: '1234' },
      { id: 't29', name: '冯国强', subjects: 'sci', password: '1234' }
    ],
    classes: [],
    bookings: [],
    blocked: [],
    adminPassword: 'admin123'
  },

  _initMockClasses() {
    if (this._mockData.classes.length > 0) return;
    const sections = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    let id = 1;
    // 初中（约50班）
    for (const grade of ['初一', '初二', '初三']) {
      const count = grade === '初一' ? 18 : grade === '初二' ? 17 : 15;
      for (let i = 0; i < count; i++) {
        this._mockData.classes.push({
          id: `c${id++}`,
          name: `${grade}${sections[i] || String.fromCharCode(65 + i)}`,
          level: '初中',
          grade: grade
        });
      }
    }
    // 高中理科（约15班）
    for (const grade of ['高一', '高二', '高三']) {
      for (let i = 0; i < 5; i++) {
        this._mockData.classes.push({
          id: `c${id++}`,
          name: `${grade}理${sections[i]}`,
          level: '高中',
          grade: grade
        });
      }
    }
  },

  _initMockBookings() {
    if (this._mockData.bookings.length > 0) return;
    const today = getMalaysiaTime();
    const dates = getWeekDates(today);

    const sampleBookings = [
      { teacherName: '王明华', teacherId: 't1', subject: 'bio', lab: 'bio', class: '高一理甲', date: dates[0], period: 2, status: 'approved' },
      { teacherName: '黄丽珍', teacherId: 't6', subject: 'chem', lab: 'chem', class: '高二理乙', date: dates[0], period: 3, status: 'approved' },
      { teacherName: '周雅琳', teacherId: 't10', subject: 'phys', lab: 'phys', class: '高一理丙', date: dates[1], period: 1, status: 'approved' },
      { teacherName: '赵淑芬', teacherId: 't14', subject: 'sci', lab: 'sci', class: '初二甲', date: dates[1], period: 4, status: 'approved' },
      { teacherName: '孙家明', teacherId: 't15', subject: 'sci', lab: 'bio', class: '初一乙', date: dates[2], period: 5, status: 'approved' },
      { teacherName: '李秀英', teacherId: 't2', subject: 'bio', lab: 'bio', class: '高三理甲', date: dates[2], period: 2, status: 'pending' },
      { teacherName: '刘建国', teacherId: 't7', subject: 'chem', lab: 'chem', class: '高一理丁', date: dates[3], period: 6, status: 'pending' },
      { teacherName: '何志远', teacherId: 't17', subject: 'sci', lab: 'phys', class: '初三丙', date: dates[3], period: 3, status: 'rejected', rejectedReason: '该时段实验室需要维护' },
    ];

    sampleBookings.forEach((b, i) => {
      this._mockData.bookings.push({
        id: `b${Date.now() + i}`,
        ...b,
        note: '',
        rejectedReason: b.rejectedReason || '',
        submittedAt: new Date().toISOString(),
        reviewedAt: b.status !== 'pending' ? new Date().toISOString() : ''
      });
    });
  },

  _initMockBlocked() {
    if (this._mockData.blocked.length > 0) return;
    const today = getMalaysiaTime();
    const dates = getWeekDates(today);

    this._mockData.blocked.push(
      { id: 'bl1', lab: 'all', date: dates[4], period: 'all', type: 'exam', note: '月考' },
      { id: 'bl2', lab: 'chem', date: dates[2], period: '7', type: 'cca', note: '化学社活动' }
    );
  },

  async mockRequest(action, params) {
    this._initMockClasses();
    this._initMockBookings();
    this._initMockBlocked();

    await new Promise(r => setTimeout(r, 200)); // 模拟网络延迟

    switch (action) {
      case 'getTeachers':
        return { data: this._mockData.teachers.map(t => ({ id: t.id, name: t.name, subjects: t.subjects })) };

      case 'getClasses':
        return { data: this._mockData.classes };

      case 'getBookings':
        let bookings = [...this._mockData.bookings];
        if (params.teacherId) bookings = bookings.filter(b => b.teacherId === params.teacherId);
        if (params.status) bookings = bookings.filter(b => b.status === params.status);
        if (params.lab) bookings = bookings.filter(b => b.lab === params.lab);
        if (params.dateFrom) bookings = bookings.filter(b => b.date >= params.dateFrom);
        if (params.dateTo) bookings = bookings.filter(b => b.date <= params.dateTo);
        return { data: bookings };

      case 'submitBooking': {
        const newBooking = {
          id: `b${Date.now()}`,
          ...params,
          status: 'pending',
          rejectedReason: '',
          submittedAt: new Date().toISOString(),
          reviewedAt: ''
        };
        // 冲突检测
        const conflict = this._mockData.bookings.find(b =>
          b.lab === params.lab && b.date === params.date &&
          String(b.period) === String(params.period) &&
          (b.status === 'approved' || b.status === 'pending')
        );
        if (conflict) return { error: '该时段已有预约，请选择其他时段' };

        const blockedConflict = this._mockData.blocked.find(bl =>
          (bl.lab === params.lab || bl.lab === 'all') &&
          bl.date === params.date &&
          (bl.period === 'all' || String(bl.period) === String(params.period))
        );
        if (blockedConflict) return { error: '该时段为特殊占用时段，无法预约' };

        this._mockData.bookings.push(newBooking);
        return { success: true, data: newBooking };
      }

      case 'cancelBooking': {
        const idx = this._mockData.bookings.findIndex(b => b.id === params.id);
        if (idx === -1) return { error: '预约不存在' };
        if (this._mockData.bookings[idx].status !== 'pending') return { error: '只能取消待审批的申请' };
        this._mockData.bookings.splice(idx, 1);
        return { success: true };
      }

      case 'approveBooking': {
        const booking = this._mockData.bookings.find(b => b.id === params.id);
        if (!booking) return { error: '预约不存在' };
        booking.status = 'approved';
        booking.reviewedAt = new Date().toISOString();
        return { success: true, data: booking };
      }

      case 'rejectBooking': {
        const booking = this._mockData.bookings.find(b => b.id === params.id);
        if (!booking) return { error: '预约不存在' };
        booking.status = 'rejected';
        booking.rejectedReason = params.reason || '';
        booking.reviewedAt = new Date().toISOString();
        return { success: true, data: booking };
      }

      case 'updateBooking': {
        const booking = this._mockData.bookings.find(b => b.id === params.id);
        if (!booking) return { error: '预约不存在' };
        Object.assign(booking, params);
        return { success: true, data: booking };
      }

      case 'deleteBooking': {
        const idx = this._mockData.bookings.findIndex(b => b.id === params.id);
        if (idx === -1) return { error: '预约不存在' };
        this._mockData.bookings.splice(idx, 1);
        return { success: true };
      }

      case 'getBlocked':
        return { data: this._mockData.blocked };

      case 'addBlocked': {
        const newBlocked = { id: `bl${Date.now()}`, ...params };
        this._mockData.blocked.push(newBlocked);
        return { success: true, data: newBlocked };
      }

      case 'deleteBlocked': {
        const idx = this._mockData.blocked.findIndex(b => b.id === params.id);
        if (idx === -1) return { error: '记录不存在' };
        this._mockData.blocked.splice(idx, 1);
        return { success: true };
      }

      case 'login': {
        const teacher = this._mockData.teachers.find(t => t.id === params.teacherId);
        if (!teacher) return { error: '老师不存在' };
        if (teacher.password !== params.password) return { error: '密码错误' };
        return { success: true, data: { id: teacher.id, name: teacher.name, subjects: teacher.subjects } };
      }

      case 'adminLogin':
        if (params.password !== this._mockData.adminPassword) return { error: '管理员密码错误' };
        return { success: true };

      case 'getSettings':
        return { data: { adminPassword: this._mockData.adminPassword, schoolName: '宽柔中学', academicYear: 2026 } };

      default:
        return { error: `未知操作: ${action}` };
    }
  }
};

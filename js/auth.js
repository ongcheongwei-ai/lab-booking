// ==========================================
// 实验室预约管理系统 — 认证模块
// ==========================================

const Auth = {
  // 当前会话
  _session: null,

  // 初始化：检查 sessionStorage
  init() {
    const saved = sessionStorage.getItem('labBookingSession');
    if (saved) {
      this._session = JSON.parse(saved);
    }
  },

  // 获取当前用户
  getUser() {
    return this._session;
  },

  // 是否已登入
  isLoggedIn() {
    return this._session !== null;
  },

  // 是否为管理员
  isAdmin() {
    return this._session?.role === 'admin';
  },

  // 是否为老师
  isTeacher() {
    return this._session?.role === 'teacher';
  },

  // 老师登入
  async loginAsTeacher(teacherId, password) {
    const result = await API.login(teacherId, password);
    if (result.error) throw new Error(result.error);

    this._session = {
      role: 'teacher',
      id: result.data.id,
      name: result.data.name,
      subjects: result.data.subjects.split(',')
    };
    sessionStorage.setItem('labBookingSession', JSON.stringify(this._session));
    return this._session;
  },

  // 管理员登入
  async loginAsAdmin(password) {
    const result = await API.adminLogin(password);
    if (result.error) throw new Error(result.error);

    this._session = {
      role: 'admin',
      name: '实验室助理'
    };
    sessionStorage.setItem('labBookingSession', JSON.stringify(this._session));
    return this._session;
  },

  // 登出
  logout() {
    this._session = null;
    sessionStorage.removeItem('labBookingSession');
  },

  // 渲染登入页面
  async renderLoginPage() {
    const container = document.getElementById('page-login');
    let teacherOptions = '<option value="">-- 请选择老师 --</option>';
    teacherOptions += '<option value="admin">管理员登入</option>';

    try {
      const result = await API.getTeachers();
      const teachers = result.data || [];
      // 按科目分组
      const grouped = {};
      teachers.forEach(t => {
        const subjects = t.subjects.split(',');
        subjects.forEach(s => {
          if (!grouped[s]) grouped[s] = [];
          grouped[s].push(t);
        });
      });

      for (const [subId, list] of Object.entries(grouped)) {
        teacherOptions += `<optgroup label="${getSubjectName(subId)}">`;
        list.forEach(t => {
          teacherOptions += `<option value="${t.id}">${t.name}</option>`;
        });
        teacherOptions += '</optgroup>';
      }
    } catch (err) {
      console.error('获取老师列表失败:', err);
    }

    container.innerHTML = `
      <div class="login-card">
        <div class="login-header">
          <h2>实验室预约系统</h2>
          <p>${CONFIG.SCHOOL_NAME}</p>
        </div>
        <form id="loginForm" class="login-form">
          <div class="form-group">
            <label for="loginTeacher">选择身份</label>
            <select id="loginTeacher" required>
              ${teacherOptions}
            </select>
          </div>
          <div class="form-group">
            <label for="loginPassword">密码</label>
            <input type="password" id="loginPassword" placeholder="请输入密码" required>
          </div>
          <div id="loginError" class="error-msg" style="display:none"></div>
          <button type="submit" class="btn btn-primary btn-block">登入</button>
        </form>
        <div class="login-footer">
          <a href="#dashboard" class="link">返回总览</a>
        </div>
      </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const teacherId = document.getElementById('loginTeacher').value;
      const password = document.getElementById('loginPassword').value;
      const errorEl = document.getElementById('loginError');
      errorEl.style.display = 'none';

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '登入中...';

      try {
        if (teacherId === 'admin') {
          await Auth.loginAsAdmin(password);
        } else {
          await Auth.loginAsTeacher(teacherId, password);
        }
        App.updateNav();
        App.navigate('dashboard');
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '登入';
      }
    });
  }
};

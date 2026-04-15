// ==========================================
// 实验室预约管理系统 — 配置文件
// ==========================================

const CONFIG = {
  // Google Apps Script Web App URL（部署后请替换）
  API_URL: 'https://script.google.com/macros/s/AKfycbwzbg0FFemrEOvSydfsRwHZ7PvLHskDccNnzNTISWhFuJJUEZPjw8VmpEKpDgEB2mSgQQ/exec',

  // 学校名称
  SCHOOL_NAME: '宽柔中学',

  // 学年
  ACADEMIC_YEAR: 2026,

  // 时区偏移（马来西亚 UTC+8）
  TIMEZONE_OFFSET: 8,

  // 实验室信息
  LABS: {
    bio:  { id: 'bio',  name: '生物实验室', color: '#2ecc71', colorLight: '#d5f5e3' },
    chem: { id: 'chem', name: '化学实验室', color: '#3498db', colorLight: '#d6eaf8' },
    phys: { id: 'phys', name: '物理实验室', color: '#9b59b6', colorLight: '#e8daef' },
    sci:  { id: 'sci',  name: '综合科学实验室', color: '#e67e22', colorLight: '#fdebd0' }
  },

  // 科目信息
  SUBJECTS: {
    bio:  { id: 'bio',  name: '生物' },
    chem: { id: 'chem', name: '化学' },
    phys: { id: 'phys', name: '物理' },
    sci:  { id: 'sci',  name: '综合科学' }
  },

  // 高中科目对应实验室映射
  SENIOR_SUBJECT_LAB_MAP: {
    bio:  'bio',
    chem: 'chem',
    phys: 'phys'
  },

  // 每日节次时间表（每节40分钟）
  PERIODS: [
    { period: 1,  start: '07:30', end: '08:10' },
    { period: 2,  start: '08:10', end: '08:50' },
    // 休息 08:50–09:10
    { period: 3,  start: '09:10', end: '09:50' },
    { period: 4,  start: '09:50', end: '10:30' },
    // 休息 10:30–10:40
    { period: 5,  start: '10:40', end: '11:20' },
    { period: 6,  start: '11:20', end: '12:00' },
    // 午休 12:00–12:50
    { period: 7,  start: '12:50', end: '13:30' },
    { period: 8,  start: '13:30', end: '14:10' },
    // 休息 14:10–14:20
    { period: 9,  start: '14:20', end: '15:00' },
    { period: 10, start: '15:00', end: '15:40' }
  ],

  // 星期名称（马来西亚华文独中：周一至周六）
  WEEKDAYS: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  WEEKDAY_SHORT: ['一', '二', '三', '四', '五', '六'],

  // 特殊占用类型
  BLOCKED_TYPES: {
    exam:          { name: '考试（考场）', icon: '📝' },
    practicalExam: { name: '实验考', icon: '🧪' },
    elective:      { name: '选修课', icon: '📚' },
    cca:           { name: '联课活动', icon: '🎯' }
  },

  // 预约状态
  STATUS: {
    pending:  { name: '待审批', color: '#f39c12', colorLight: '#fef9e7' },
    approved: { name: '已批准', color: '#27ae60', colorLight: '#eafaf1' },
    rejected: { name: '已拒绝', color: '#e74c3c', colorLight: '#fdedec' }
  },

  // 年级信息
  LEVELS: {
    junior: { name: '初中', grades: ['初一', '初二', '初三'] },
    senior: { name: '高中', grades: ['高一', '高二', '高三'] }
  }
};

// 工具函数：获取节次显示文本
function getPeriodText(periodNum) {
  const p = CONFIG.PERIODS.find(p => p.period === periodNum);
  return p ? `第${p.period}节 (${p.start}–${p.end})` : `第${periodNum}节`;
}

// 工具函数：获取实验室名称
function getLabName(labId) {
  return CONFIG.LABS[labId]?.name || labId;
}

// 工具函数：获取科目名称
function getSubjectName(subjectId) {
  return CONFIG.SUBJECTS[subjectId]?.name || subjectId;
}

// 工具函数：获取状态标签
function getStatusName(status) {
  return CONFIG.STATUS[status]?.name || status;
}

// 工具函数：获取特殊占用类型名称
function getBlockedTypeName(type) {
  return CONFIG.BLOCKED_TYPES[type]?.name || type;
}

// 工具函数：获取马来西亚当前时间 (UTC+8)
function getMalaysiaTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + CONFIG.TIMEZONE_OFFSET * 3600000);
}

// 工具函数：获取当前节次（根据马来西亚时间）
function getCurrentPeriod() {
  const now = getMalaysiaTime();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const p of CONFIG.PERIODS) {
    const [startH, startM] = p.start.split(':').map(Number);
    const [endH, endM] = p.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return p.period;
    }
  }
  return null; // 非上课时间
}

// 工具函数：格式化日期为 YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 工具函数：格式化日期为中文显示
function formatDateCN(dateStr) {
  if (!dateStr) return '日期未知';
  // 处理多种日期格式
  let d;
  const str = String(dateStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    // YYYY-MM-DD 格式
    const [y, m, day] = str.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(str);
  }
  if (isNaN(d.getTime())) return String(dateStr);
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 (星期${weekday})`;
}

// 工具函数：获取某一周的日期范围（周一到周六）
function getWeekDates(baseDate) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 调整到周一
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);

  const dates = [];
  for (let i = 0; i < 6; i++) { // 周一到周六
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

// ==========================================
// 实验室预约管理系统 — Google Apps Script 后端
// ==========================================

// *** 请将下方的 SPREADSHEET_ID 替换为你的 Google Sheets ID ***
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

// === HTTP 请求入口 ===
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const result = handleAction(body);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action || '';
  const params = e.parameter;
  try {
    const result = handleAction({ action, ...params });
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// === 路由处理 ===
function handleAction(body) {
  const action = body.action;

  switch (action) {
    case 'getTeachers':    return getTeachers();
    case 'getClasses':     return getClasses();
    case 'getBookings':    return getBookings(body);
    case 'submitBooking':  return submitBooking(body);
    case 'cancelBooking':  return cancelBooking(body);
    case 'approveBooking': return approveBooking(body);
    case 'rejectBooking':  return rejectBooking(body);
    case 'updateBooking':  return updateBooking(body);
    case 'deleteBooking':  return deleteBooking(body);
    case 'getBlocked':     return getBlocked();
    case 'addBlocked':     return addBlocked(body);
    case 'deleteBlocked':  return deleteBlocked(body);
    case 'login':          return login(body);
    case 'adminLogin':     return adminLogin(body);
    case 'getSettings':    return getSettings();
    default:
      return { error: '未知操作: ' + action };
  }
}

// === 老师相关 ===
function getTeachers() {
  const sheet = getSheet('teachers');
  const data = sheet.getDataRange().getValues();
  const teachers = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    teachers.push({
      id: String(data[i][0]),
      name: data[i][1],
      subjects: data[i][2]
    });
  }
  return { data: teachers };
}

// === 班级相关 ===
function getClasses() {
  const sheet = getSheet('classes');
  const data = sheet.getDataRange().getValues();
  const classes = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    classes.push({
      id: String(data[i][0]),
      name: data[i][1],
      level: data[i][2],
      grade: data[i][3]
    });
  }
  return { data: classes };
}

// === 预约相关 ===
function getBookings(params) {
  const sheet = getSheet('bookings');
  const data = sheet.getDataRange().getValues();
  let bookings = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    const booking = {
      id: String(data[i][0]),
      teacherName: data[i][1],
      teacherId: String(data[i][2]),
      subject: data[i][3],
      lab: data[i][4],
      class: data[i][5],
      date: formatDateValue(data[i][6]),
      period: String(data[i][7]),
      note: data[i][8] || '',
      status: data[i][9],
      rejectedReason: data[i][10] || '',
      submittedAt: data[i][11] || '',
      reviewedAt: data[i][12] || ''
    };
    bookings.push(booking);
  }

  // 过滤
  if (params.teacherId) bookings = bookings.filter(b => b.teacherId === params.teacherId);
  if (params.status) bookings = bookings.filter(b => b.status === params.status);
  if (params.lab) bookings = bookings.filter(b => b.lab === params.lab);
  if (params.dateFrom) bookings = bookings.filter(b => b.date >= params.dateFrom);
  if (params.dateTo) bookings = bookings.filter(b => b.date <= params.dateTo);

  return { data: bookings };
}

function submitBooking(params) {
  const sheet = getSheet('bookings');

  // 冲突检测
  const existing = getBookings({ status: 'approved' }).data;
  const pending = getBookings({ status: 'pending' }).data;
  const allActive = [...existing, ...pending];

  const conflict = allActive.find(b =>
    b.lab === params.lab &&
    b.date === params.date &&
    String(b.period) === String(params.period)
  );
  if (conflict) return { error: '该时段已有预约，请选择其他时段' };

  // 检查特殊占用
  const blocked = getBlocked().data;
  const blockedConflict = blocked.find(bl =>
    (bl.lab === params.lab || bl.lab === 'all') &&
    bl.date === params.date &&
    (bl.period === 'all' || String(bl.period) === String(params.period))
  );
  if (blockedConflict) return { error: '该时段为特殊占用时段，无法预约' };

  const id = String(new Date().getTime());
  const now = new Date().toISOString();
  sheet.appendRow([
    id,
    params.teacherName,
    params.teacherId,
    params.subject,
    params.lab,
    params.class,
    params.date,
    params.period,
    params.note || '',
    'pending',
    '',
    now,
    ''
  ]);

  return { success: true, data: { id: id } };
}

function cancelBooking(params) {
  const sheet = getSheet('bookings');
  const row = findRowById(sheet, params.id);
  if (!row) return { error: '预约不存在' };
  if (sheet.getRange(row, 10).getValue() !== 'pending') return { error: '只能取消待审批的申请' };
  sheet.deleteRow(row);
  return { success: true };
}

function approveBooking(params) {
  const sheet = getSheet('bookings');
  const row = findRowById(sheet, params.id);
  if (!row) return { error: '预约不存在' };
  sheet.getRange(row, 10).setValue('approved');
  sheet.getRange(row, 13).setValue(new Date().toISOString());
  return { success: true };
}

function rejectBooking(params) {
  const sheet = getSheet('bookings');
  const row = findRowById(sheet, params.id);
  if (!row) return { error: '预约不存在' };
  sheet.getRange(row, 10).setValue('rejected');
  sheet.getRange(row, 11).setValue(params.reason || '');
  sheet.getRange(row, 13).setValue(new Date().toISOString());
  return { success: true };
}

function updateBooking(params) {
  const sheet = getSheet('bookings');
  const row = findRowById(sheet, params.id);
  if (!row) return { error: '预约不存在' };

  if (params.teacherName) sheet.getRange(row, 2).setValue(params.teacherName);
  if (params.subject) sheet.getRange(row, 4).setValue(params.subject);
  if (params.lab) sheet.getRange(row, 5).setValue(params.lab);
  if (params.class) sheet.getRange(row, 6).setValue(params.class);
  if (params.date) sheet.getRange(row, 7).setValue(params.date);
  if (params.period) sheet.getRange(row, 8).setValue(params.period);
  if (params.note !== undefined) sheet.getRange(row, 9).setValue(params.note);

  return { success: true };
}

function deleteBooking(params) {
  const sheet = getSheet('bookings');
  const row = findRowById(sheet, params.id);
  if (!row) return { error: '预约不存在' };
  sheet.deleteRow(row);
  return { success: true };
}

// === 特殊占用相关 ===
function getBlocked() {
  const sheet = getSheet('blocked');
  const data = sheet.getDataRange().getValues();
  const blocked = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    blocked.push({
      id: String(data[i][0]),
      lab: data[i][1],
      date: formatDateValue(data[i][2]),
      period: String(data[i][3]),
      type: data[i][4],
      note: data[i][5] || ''
    });
  }
  return { data: blocked };
}

function addBlocked(params) {
  const sheet = getSheet('blocked');
  const id = String(new Date().getTime());
  sheet.appendRow([
    id,
    params.lab,
    params.date,
    params.period,
    params.type,
    params.note || ''
  ]);
  return { success: true, data: { id: id } };
}

function deleteBlocked(params) {
  const sheet = getSheet('blocked');
  const row = findRowById(sheet, params.id);
  if (!row) return { error: '记录不存在' };
  sheet.deleteRow(row);
  return { success: true };
}

// === 认证相关 ===
function login(params) {
  const sheet = getSheet('teachers');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === params.teacherId) {
      if (String(data[i][3]) === params.password) {
        return {
          success: true,
          data: {
            id: String(data[i][0]),
            name: data[i][1],
            subjects: data[i][2]
          }
        };
      } else {
        return { error: '密码错误' };
      }
    }
  }
  return { error: '老师不存在' };
}

function adminLogin(params) {
  const settings = getSettings().data;
  if (params.password === settings.adminPassword) {
    return { success: true };
  }
  return { error: '管理员密码错误' };
}

// === 设置相关 ===
function getSettings() {
  const sheet = getSheet('settings');
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) settings[data[i][0]] = data[i][1];
  }
  return { data: settings };
}

// === 工具函数 ===
function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1;
  }
  return null;
}

function formatDateValue(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value);
}

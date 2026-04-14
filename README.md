# 宽柔中学实验室预约管理系统

网页版实验室预约管理系统，部署在 GitHub Pages 上，老师和学生用手机或电脑浏览器即可使用。

## 功能

- **公开仪表板**：无需登入即可查看 4 间实验室的实时使用状态
- **老师预约**：登入后提交实验室预约申请
- **管理员审批**：实验室助理审批申请、管理预约和特殊占用时段
- **使用统计**：按月查看各实验室使用率

## 部署步骤

### 第一步：创建 Google Sheets

1. 打开 [Google Sheets](https://sheets.google.com)，新建一个空白试算表
2. 创建以下工作表（点击底部的 `+` 号新增工作表）：

#### `teachers` 工作表
| id | name | subjects | password |
|----|------|----------|----------|
| t1 | 王明华 | bio | 1234 |
| t2 | 李秀英 | bio | 1234 |
| ... | ... | ... | ... |

- `subjects` 字段：`bio`（生物）、`chem`（化学）、`phys`（物理）、`sci`（综合科学）
- 多个科目用逗号分隔，如 `bio,sci`

#### `classes` 工作表
| id | name | level | grade |
|----|------|-------|-------|
| c1 | 初一甲 | 初中 | 初一 |
| c2 | 初一乙 | 初中 | 初一 |
| c51 | 高一理甲 | 高中 | 高一 |
| ... | ... | ... | ... |

#### `bookings` 工作表
| id | teacherName | teacherId | subject | lab | class | date | period | note | status | rejectedReason | submittedAt | reviewedAt |
|----|-------------|-----------|---------|-----|-------|------|--------|------|--------|----------------|-------------|------------|

（只需创建标题行，数据由系统自动生成）

#### `blocked` 工作表
| id | lab | date | period | type | note |
|----|-----|------|--------|------|------|

（只需创建标题行）

#### `settings` 工作表
| key | value |
|-----|-------|
| adminPassword | admin123 |
| schoolName | 宽柔中学 |
| academicYear | 2026 |

### 第二步：部署 Google Apps Script

1. 在 Google Sheets 中，点击 **扩展功能** → **Apps Script**
2. 删除编辑器中的默认代码
3. 将 `Code.gs` 文件的内容复制贴上
4. 将第一行的 `YOUR_GOOGLE_SHEET_ID_HERE` 替换为你的 Google Sheets ID
   - Sheets ID 在网址中：`https://docs.google.com/spreadsheets/d/`**这里就是ID**`/edit`
5. 点击 **部署** → **新增部署**
6. 类型选择 **Web 应用程式**
   - 说明：实验室预约系统 API
   - 执行身份：**我**
   - 存取权限：**所有人**
7. 点击 **部署**，复制生成的 Web App 网址

### 第三步：配置前端

1. 打开 `js/config.js`
2. 将 `API_URL` 的值替换为上一步复制的 Web App 网址：
   ```javascript
   API_URL: 'https://script.google.com/macros/s/xxxxx/exec',
   ```

### 第四步：部署到 GitHub Pages

1. 在 GitHub 上创建一个新的仓库
2. 将所有文件推送到仓库
3. 进入仓库的 **Settings** → **Pages**
4. Source 选择 **Deploy from a branch**
5. Branch 选择 **main**，目录选择 **/ (root)**
6. 点击 **Save**
7. 等待几分钟，GitHub Pages 网址即可使用

### 自定义域名（可选）

如果想要更简短的网址：
1. 在 **Settings** → **Pages** → **Custom domain** 中输入你的域名
2. 在域名 DNS 设置中添加 CNAME 记录指向 `你的用户名.github.io`

## 默认账号

- **老师**：从下拉菜单选择老师名字，密码默认为 `1234`
- **管理员**：选择"管理员登入"，密码默认为 `admin123`

（密码可以在 Google Sheets 中直接修改）

## 技术架构

| 项目 | 技术 |
|------|------|
| 前端 | HTML + CSS + JavaScript（SPA） |
| 后端 | Google Apps Script |
| 数据库 | Google Sheets |
| 部署 | GitHub Pages |

## 文件说明

```
├── index.html      # 主页面
├── css/style.css   # 样式表
├── js/
│   ├── config.js   # 配置（API URL、常量）
│   ├── api.js      # API 通信层
│   ├── auth.js     # 登入/登出
│   ├── timetable.js# 时间表
│   ├── booking.js  # 预约申请
│   ├── admin.js    # 管理员功能
│   └── app.js      # 主入口 & 路由
├── Code.gs         # Apps Script 后端（复制到 Apps Script 编辑器）
└── README.md       # 本文件
```

## 注意事项

- 未配置 API URL 时，系统会使用模拟数据运行，方便测试
- 日期均使用马来西亚时间 (UTC+8)
- 上课日为周一至周六
- 公共假期需要手动在 `blocked` 工作表中标注

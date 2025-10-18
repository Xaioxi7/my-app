# Pages（页面结构）
(Last updated: 2025-10-17)

## Core Pages（核心页面）

### `/chat` — Chat Page（聊天页面）
功能概述：  
用于自然语言交流、AI 回复、任务创建指令识别与技能同步更新。  
结构：
- 对话区（Message Stream）
- 输入框与发送按钮（Input Field with Send Button）
- 快捷操作（Add Task / View Tasks / View Skills）
- 顶部导航栏（Navigation Header）
- AI 建议区（AI Suggestion Panel）— 插入文章、视频、新闻推荐等内容。

---

### `/tasks` — Tasks Page（任务页面）
功能概述：  
展示用户的主要目标（Big Goal）与每日任务清单（Checklist）。  
特点：
- 无截止日期（No deadlines）  
- 任务的新增、删除、修改仅能通过 AI 对话触发  
- 用户只能勾选完成状态，AI 可自动更新任务状态或添加新项  

结构：
- 顶部目标区（Goal Section）
  - 图片（Goal Image）
  - 进度条（Progress Bar, non-editable）
  - 当前 / 目标值（Current vs. Target）
- 任务区（Task List）
  - 文本任务项（Task Text）
  - 勾选框（Checkable Item）

---

### `/skills` — Skills Page（技能页面）
功能概述：  
展示用户的技能成长情况，AI 自动评估任务结果并更新技能进度。  
结构：
- 技能图标（Skill Icon）
- 进度条（Progress Bar）
- 技能名称与等级（Skill Name / Level）
- 积分（Points）

---

### `/moments` — Moments Page（动态分享）
功能概述：  
展示 AI 自动推送的内容卡片（新闻、视频、资源等）。  
结构：
- 卡片式内容流（Card Feed）
- 标题、来源、理由字段（Title / Source / Reason）
- 自动生成时间（Created_at）

---

### `/profile` — Personal Page（个人页面）
功能概述：  
展示用户头像、昵称、简介与成就摘要。  
结构：
- Avatar / Banner
- Display Name / Bio
- 按钮：Edit Profile、Back to Chat

---

### `/settings` — Settings Page（系统设置）
功能概述：  
配置通知、时区、语言等系统偏好。

---

### `/login` / `/signup` / `/logout` — Auth Pages（认证页面）
- **Login**：输入邮箱与密码以登录账户  
- **Signup**：注册新账户  
- **Logout**：退出系统并清除本地缓存（保留云端数据）

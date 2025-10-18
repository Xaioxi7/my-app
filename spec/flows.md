# Flows（用户流程图）
(Last updated: 2025-10-17)

## Primary Flows（主要流程）

### 1. 登录 / 注册 → 聊天界面
Login / Signup → Chat  
用户进入网站后完成登录或注册，系统自动跳转到 Chat 页面（AI 助手界面）。  
After logging in or signing up, the user is redirected to the Chat page (AI assistant interface).

---

### 2. 聊天界面 / Chat Flow
Chat → Sharing / Tasks / Double / Personal Page  
从 Chat 可以进入以下功能页面：
- **Sharing**：分享页面，用于查看或发布动态卡片（Moments）
- **Tasks**：任务页面，查看与更新每日清单
- **Double**：聊天 + 任务并行视图（双栏模式）
- **Personal Page**：查看个人资料（头像、昵称、简介）

---

### 3. 分享界面 / Sharing Flow
Sharing → Chat / Tasks  
用户可以从分享卡片跳转到相关任务或返回 Chat。  
From Sharing, users can open a related Task or return to Chat.

---

### 4. 双栏模式 / Double Flow
Double → Sharing / Tasks / Skills / Chat / Personal Page  
在双栏模式中，用户可同时浏览 Chat 与 Tasks，也能快速切换到技能成长、个人资料或分享页。  
In Double mode, users can view Chat and Tasks side-by-side, or switch to Skills, Profile, or Sharing.

---

### 5. 个人页面 / Personal Page Flow
Personal Page → Chat  
用户可以从个人页返回 Chat，与 AI 继续互动。  
From the Personal Page, users can return to Chat for further interaction.

---

## Supporting Flows（辅助流程）
1. Chat → Add Task → Tasks refresh  
2. Chat → Complete Task → Progress update  
3. AI → Update Skills → Reflect on Skills Page  
4. System (random time) → Generate Moments → Push to user feed  

---

## Actors（参与者）
- **User**：与 Chat、Tasks、Skills 交互的用户。  
- **AI Worker**：负责总结对话、提出任务、更新进度与技能。  
- **System Scheduler**：定期生成 Moments 内容并推送。

---

## Rules & Constraints（规则与约束）
- 无任何截止日期（No deadlines）。  
- 所有数据按 user_id 独立存储，互不干扰。  
- 任务和进度由 AI 自动管理与评估。  
- 强调激励机制而非惩罚机制。

# Forms（数据结构）
(Last updated: 2025-10-17)

## 1. Goal（主要目标 / Big Goal）
描述：  
Goal 表示用户的长期、可量化目标（如“获得月薪 8000 美元的工作”）。  
该目标驱动任务清单与技能成长模块。AI 将根据用户行为与完成情况自动更新进度。

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | uuid | 唯一标识符 |
| cover_image_url | string | 目标展示图片 |
| title | string | 目标标题（如 “Reach $8000 salary job”） |
| target_label | string | 右侧标签（如 “Expected salary”） |
| target_value | number / string | 目标值或描述 |
| current_label | string | 左侧标签（如 “Current progress”） |
| current_value | number / string | 当前值或描述 |
| progress | number (0–100) | 由 AI 自动更新的进度百分比 |
| notes | string (optional) | 简短说明或激励语 |
| visible | boolean | 是否显示该目标 |

---

## 2. Task（任务项）
描述：  
任务由 AI 自动生成、更新与删除，用户可在界面勾选完成状态。

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | uuid | 唯一标识符 |
| text | string | 任务内容 |
| checked | boolean | 是否已完成 |
| last_checked_at | datetime | 最近一次完成时间 |
| cadence | enum("daily" | "anytime") | 任务频率 |

---

## 3. Skill（技能项）
| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | uuid | 唯一标识符 |
| name | string | 技能名 |
| icon | string | 自动匹配图标 |
| progress | number | 技能进度（AI 自动更新） |
| points | number | 技能积分 |
| level | number | 技能等级 |

---

## 4. Moments（动态卡片）
| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | uuid | 唯一标识符 |
| title | string | 卡片标题 |
| summary | string | 内容摘要 |
| source | string | 来源（如 URL 域名） |
| reason | string | 推荐理由 |
| created_at | datetime | 生成时间 |

---

## 5. Profile（用户资料）
| 字段名 | 类型 | 描述 |
|--------|------|------|
| avatar_url | string | 用户头像 |
| display_name | string | 显示名 |
| bio | string | 简介 |
| banner_url | string | 个人主页封面图 |

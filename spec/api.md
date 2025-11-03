# API Specification

## 1. POST /api/command
**Purpose:**  
让聊天 AI 通过统一的命令格式执行任务（添加、完成、更新技能等）

**Request:**
```json
{
  "command": "add_task",
  "args": {
    "title": "Write journal",
    "due_date": "2025-10-20"
  },
  "user_id": "uuid-from-auth"
}

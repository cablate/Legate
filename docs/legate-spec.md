# `.legate/` 目錄規範

> 委託者在 repo 中放置此目錄，讓 AI 理解你的專案並正確執行任務。

---

## 目錄結構

```
.legate/
├── config.yaml          # 必要 — 基本設定
├── CLAUDE.md            # 必要 — AI 行為指引
└── skills/              # 可選 — 領域知識與技能
    ├── my-skill.md
    └── ...
```

---

## config.yaml

最小設定：

```yaml
# .legate/config.yaml
version: 1
base_branch: main
label: legate
```

完整設定：

```yaml
# .legate/config.yaml
version: 1

# Git 設定
base_branch: main              # PR 的 base branch
label: legate                  # 觸發 Legate 的 Issue label

# 任務設定
max_task_duration: 10m         # 單一任務最長執行時間（預設 10 分鐘）
allowed_tools:                 # 允許 AI 使用的工具（預設全部）
  - Read
  - Edit
  - Bash
  - Glob
  - Grep

# 語言設定
language: zh-TW                # AI 回覆語言（PR body、commit message）
                               # 可選：en, zh-TW, ja, ko, ...
```

### 欄位說明

| 欄位 | 必要 | 預設值 | 說明 |
|------|------|--------|------|
| `version` | 是 | — | 規範版本，目前固定為 `1` |
| `base_branch` | 是 | `main` | PR 目標 branch |
| `label` | 否 | `legate` | 觸發任務的 Issue label |
| `max_task_duration` | 否 | `10m` | 超時後強制終止 |
| `allowed_tools` | 否 | 全部 | 限制 AI 可用的工具 |
| `language` | 否 | `en` | PR body 和 commit message 的語言 |

---

## CLAUDE.md

這是 AI 的行為指引——相當於你對一個新加入的工程師說的「我們專案的規矩」。

### 為什麼重要？

AI 第一次看你的 codebase，它什麼都不知道。CLAUDE.md 讓它在動手前就理解：
- 你的專案架構
- 你的 coding style
- 你的慣例和禁忌
- 你在意的品質標準

**CLAUDE.md 寫得越好，PR 品質越高。**

### 撰寫指南

#### 1. 專案概述（必要）

```markdown
# 專案名稱

一句話描述這個專案做什麼。

## 技術棧
- Runtime: Node.js 20
- Framework: Express 5
- Language: TypeScript (strict mode)
- Database: PostgreSQL + Prisma
- Testing: Vitest
```

#### 2. 架構說明（建議）

```markdown
## 架構

src/
├── routes/       # API 路由（每個資源一個檔案）
├── services/     # 業務邏輯
├── models/       # Prisma schema 和 types
├── middleware/    # Express middleware
└── utils/        # 工具函式
```

#### 3. Coding Style（建議）

```markdown
## Coding Style

- 使用 ESM import（不用 CommonJS require）
- 函式命名：camelCase
- 檔案命名：kebab-case
- 每個函式加 JSDoc
- 不使用 any
- Error handling 用自訂 AppError class
```

#### 4. 禁忌（重要）

```markdown
## 不要做的事

- 不要修改 prisma/schema.prisma（migration 由人工處理）
- 不要在 service 層直接 import route 的東西
- 不要用 console.log，用 logger
- 不要安裝新的 npm 套件（除非 Issue 明確要求）
```

#### 5. 測試要求（可選）

```markdown
## 測試

- 新功能必須附帶測試
- 測試放在 __tests__/ 目錄
- 執行：npm test
- PR 前必須通過所有測試
```

#### 6. 其他脈絡（可選）

```markdown
## 注意事項

- 這個專案有 CI/CD（GitHub Actions），PR 會自動跑 lint + test
- 如果修改了 API endpoint，要同步更新 docs/api.md
- 主要使用者是日本市場，字串要支援 i18n
```

### 範例：最小 CLAUDE.md

```markdown
# my-web-app

Express + TypeScript 的 REST API。

## 技術棧
- Node.js 20, TypeScript, Express 5, PostgreSQL + Prisma, Vitest

## 架構
src/routes/ → src/services/ → src/models/

## Style
- ESM import, camelCase functions, kebab-case files
- No `any`, no `console.log` (use logger)

## 測試
- npm test（Vitest）
- 新功能需要附帶測試
```

### 範例：完整 CLAUDE.md

```markdown
# Lemon — 檸檬記帳 App 後端

個人記帳 App 的 REST API，支援多幣別、預算追蹤、報表匯出。

## 技術棧
- Runtime: Node.js 20
- Framework: Hono
- Language: TypeScript (strict)
- Database: SQLite + Drizzle ORM
- Testing: Vitest
- Deploy: Cloudflare Workers

## 架構

src/
├── routes/           # Hono 路由，每個 domain 一個檔案
│   ├── transactions.ts
│   ├── budgets.ts
│   └── reports.ts
├── services/         # 業務邏輯（pure functions）
├── db/
│   ├── schema.ts     # Drizzle schema
│   └── migrations/   # 不要手動改
├── middleware/
│   ├── auth.ts       # JWT 驗證
│   └── validate.ts   # Zod schema validation
└── types/            # 共用 types

## Coding Style
- Hono handler：先 validate → service → response
- Service 函式不依賴 Hono context（pure function, 方便測試）
- Error 用 HTTPException（Hono 內建）
- 所有 DB query 走 Drizzle，不寫 raw SQL
- Zod schema 放在 route 檔案裡，跟 handler 靠近

## 禁忌
- 不要動 db/migrations/（migration 用 drizzle-kit generate）
- 不要安裝新套件
- 不要在 service 層 import Hono 的東西
- 不要用 Date，用 dayjs（已安裝）

## 測試
- npm test
- 測試放 src/__tests__/
- Mock DB 用 in-memory SQLite
- 新增 API endpoint 必須附測試

## 部署注意
- Workers 不支援 Node.js API（fs, path 等）
- 檔案大小限制 1MB
- 環境變數用 wrangler.toml 管理
```

---

## skills/ 目錄（可選）

如果你的專案有特定的領域知識，可以放在 `skills/` 目錄讓 AI 參考。

```
.legate/skills/
├── payment-integration.md    # 金流串接的注意事項
├── data-pipeline.md          # 資料流程的架構說明
└── error-handling.md         # 錯誤處理的慣例
```

每個 skill 檔案是一份 markdown，內容格式不限，但建議包含：

- **概述**：這個 skill 涵蓋什麼
- **重要概念**：關鍵名詞、流程、邏輯
- **常見陷阱**：做這件事容易出錯的地方
- **參考**：相關檔案路徑、外部文件連結

AI 會在處理任務前掃描 `skills/` 目錄，找到跟任務相關的 skill 載入。

---

## 驗證

在提交任務前，檢查你的 `.legate/` 設定：

- [ ] `config.yaml` 有 `version: 1` 和 `base_branch`
- [ ] `CLAUDE.md` 至少包含專案概述和技術棧
- [ ] 如果有 CI/CD，CLAUDE.md 有提到（避免 AI 不知道 PR 會被 lint）
- [ ] 如果有特殊禁忌（不要裝套件、不要改 schema），CLAUDE.md 有明確列出

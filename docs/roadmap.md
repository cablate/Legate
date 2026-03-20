# Legate — 額度代勞服務 執行計畫

> **一句話**：有額度的人透過 GitHub / Telegram 介面接受委託，AI 自動 Fork → 處理 → PR 交付
> **模式**：不收費的額度共享 / 社群互助
> **第一階段成本**：一台 VPS + 現有 Claude 額度
> **產品代號**：Legate

---

## 核心理念

訂閱制服務的額度用不完是普遍現象。不能分享 API Key，但「委託有額度的人幫你做事」本質上是勞務——就像請有 Photoshop 的設計師幫你做圖。

**Legate 的運作模式：**

1. 委託者透過 GitHub Issue 或 Telegram 發送任務
2. 代勞者的 Claude Code 透過 Channel plugin 接收任務
3. AI 在 Docker 隔離環境中處理
4. 推 PR 回委託者的 repo 交付
5. 溝通在 GitHub PR 或 Telegram 中進行

**不收費** — 這不是商業產品，是社群互助工具。

---

## 架構轉型：基於 Claude Code Channels

> **2026-03-20 更新**：Claude Code v2.1.80 推出 Channels（research preview），讓 MCP server 能將外部訊息推入 Claude Code session。這改變了 Legate 的架構基礎。

### 原本設計

```
GitHub Issue → 自建 Node.js Orchestrator → Docker → PR
```

### 新設計（基於 Channels）

```
Telegram / GitHub Webhook → Legate Channel Plugin (MCP) → Claude Code → Docker → PR / Telegram 回覆
```

**關鍵優勢：**

| | 舊架構 | 新架構（Channels） |
|---|---|---|
| Orchestrator | 自建 Node.js 服務 | Channel plugin（MCP server） |
| 代勞者設定 | clone repo → npm install → .env → docker build | `claude --channels plugin:legate` |
| 任務入口 | 僅 GitHub Issue | GitHub + Telegram + Discord |
| 通訊協議 | 自建 polling + Octokit | MCP 標準協議 |
| 安全模型 | 自建 allowlist | Channel sender allowlist + pairing |

**限制：**
- Channels 目前需要 claude.ai 登入（不支援 API key）
- Research preview 階段，自建 plugin 需用 `--dangerously-load-development-channels`
- 單人單 session，不是多租戶服務

---

## 整體藍圖

```
Phase 1（現在）       Phase 2              Phase 3
技術驗證 +            Channel Plugin +     社群推廣 +
核心流程              自動化巡邏           多人使用
────────────────── ────────────────── ──────────────────
1-2 週                2-3 週               持續
Docker 跑通           Plugin 打包          朋友/社群試用
```

---

## Phase 1：技術驗證 + 核心流程（1-2 週）

> **目標**：用自己的 repo 驗證完整的 Fork → Docker → Claude Code → PR 流程
> **成本**：現有設備 + Claude 額度
> **驗收**：從 GitHub Issue 描述任務 → Docker 內 AI 處理 → PR 出現在 repo

### 1.1 Docker 基礎映像

**預估**：3-4 小時

```
建立 Legate 專用 Docker image：

Dockerfile.legate
├── Base: ubuntu:22.04
├── Runtime: Node.js 20 (nvm), Git, gh CLI
├── Claude Code CLI (npm install -g @anthropic-ai/claude-code)
├── 認證：ANTHROPIC_API_KEY 環境變數（不寫死在 image）
├── User: UID 1000 (非 root)
└── Entrypoint: 接收 repo URL + task prompt 參數

安全設定：
├── --cap-drop=ALL
├── --security-opt=no-new-privileges
├── --memory=4g --cpus=2
├── --pids-limit=512
├── Network: egress-only (GitHub + npm/pypi)
└── Max runtime: 10min timeout
```

**驗收**：`docker run legate-worker "say hello"` → Claude Code 正常回應

---

### 1.2 手動流程跑通

**預估**：4-5 小時

不做自動化，先手動驗證每個步驟：

```
步驟：
□ 準備測試 repo（簡單 Node.js 專案 + CLAUDE.md）
□ 手動 fork repo
□ 手動啟動 Docker container：
    docker run \
      -e ANTHROPIC_API_KEY=$KEY \
      -v /tmp/legate-workspace:/workspace \
      --network=legate-net \
      --memory=4g --cpus=2 \
      legate-worker
□ 在 container 內：
    - git clone fork-url /workspace/repo
    - cd /workspace/repo
    - git checkout -b legate/task-001
    - claude -p "根據 Issue #1 的需求修改程式碼" \
        --allowedTools Read,Edit,Bash,Glob,Grep
    - git add + commit + push
□ 手動用 gh CLI 開 PR 回原 repo
□ 確認 PR 內容正確
□ 清理 workspace
```

**驗收**：完整跑通一次 fork → code → PR

---

### 1.3 Orchestrator 原型

**預估**：8-10 小時

用 Node.js + dockerode 串接自動化流程：

```typescript
// src/legate/LegateOrchestrator.ts

核心流程：
1. receiveTask(repoUrl, issueNumber, taskPrompt)
2. forkRepo(repoUrl) → fork URL
3. createContainer(forkUrl, taskPrompt)
   - Clone repo into workspace
   - Run Claude Code with task prompt
   - Commit changes to new branch
4. submitPR(forkUrl, originalRepoUrl, branch)
   - PR body 包含：任務描述、修改摘要、檔案清單
   - PR 由 orchestrator 提交（非 container 內的 agent）
5. cleanup(containerId, workspaceVolume)

依賴：
  npm install dockerode @octokit/rest
```

**關鍵設計：**

- Container 只負責 clone + code + commit + push
- PR 建立由 orchestrator 在 container 外執行（安全考量）
- 每個任務一個 disposable volume，完成後銷毀
- Container 的 ANTHROPIC_API_KEY 透過 env 注入，不存在 image 裡

**驗收**：一行指令觸發完整流程 → PR 出現

---

### 1.4 基礎錯誤處理

**預估**：3-4 小時

```
需要處理的場景：

□ Clone 失敗（repo 不存在、權限不足）
  → 標記任務失敗 + log

□ Claude Code 執行失敗（API error、超時）
  → Kill container + log + 清理 workspace

□ Push 失敗（branch 衝突）
  → 重試一次，仍失敗則標記失敗

□ Container 超時（>10 分鐘）
  → SIGKILL + 清理

□ 磁碟空間
  → 每個任務完成/失敗後清理 workspace
```

**驗收**：各種失敗場景都有合理的 log 輸出

---

### Phase 1 完成標準

| 指標 | 標準 |
|------|------|
| 端到端流程 | 一行指令 → PR 出現 |
| Docker 隔離 | Container 無法存取 host 檔案系統 |
| 錯誤處理 | 所有失敗場景有 log |
| 清理機制 | 任務完成後 workspace 歸零 |

---

## Phase 2：Channel Plugin + 自動化（2-3 週）

> **目標**：將 Legate 包裝為 Claude Code Channel plugin，支援 Telegram + GitHub 雙入口
> **驗收**：代勞者 `claude --channels plugin:legate` 啟動 → 委託者 Telegram 發任務 → PR 出現

### 2.1 Legate Channel Plugin

**預估**：8-10 小時

基於 Claude Code Channels 架構，建立 Legate 的 MCP server：

```typescript
// legate-channel/index.ts (Bun)

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const mcp = new Server(
  { name: 'legate', version: '0.1.0' },
  {
    capabilities: {
      experimental: { 'claude/channel': {} },
      tools: {},
    },
    instructions: `
      你是 Legate 代勞者。收到 <channel source="legate"> 事件時：
      1. 解析任務（repo URL + 需求描述）
      2. Fork repo → Docker 內用 Claude Code 處理
      3. 推 PR 交付
      4. 用 reply tool 回報結果
    `,
  },
)
```

**雙入口設計：**

| 入口 | 機制 | 適合誰 |
|------|------|--------|
| Telegram | Legate Channel 內建 Telegram bot polling | 不會 GitHub 的人 |
| GitHub Issue | Legate Channel 內建 GitHub webhook receiver | 開發者 |

### 2.2 Telegram 任務入口

**預估**：6-8 小時

```
委託者透過 Telegram 發任務：

1. 委託者 DM Legate bot
2. 發送格式：
   repo: https://github.com/user/project
   task: 修復登入驗證 bug
3. Legate Channel 收到 → 推入 Claude Code session
4. Claude Code 觸發 Docker 流程
5. 完成後透過 reply tool 回傳 PR 連結

簡單問答（不需要 code change）直接 Telegram 回覆。
```

### 2.3 GitHub Issue Heartbeat

**預估**：6-8 小時

```
Heartbeat 機制：

1. 每 5 分鐘觸發一次
2. 掃描所有 tracked repos 的 Issues
3. 篩選條件：
   - label = "legate"
   - state = "open"
   - NOT 已有 "in-progress" label
4. 發現新 Issue：
   - 加 "in-progress" label
   - 轉為 Channel event 推入 Claude Code
5. 完成後：
   - PR body 加 `Closes #N`
   - Issue 加 "pr-ready" label
```

### 2.4 `.legate/` 規範

**預估**：2-3 小時

定義委託者在 repo 中放置的設定：

```
.legate/
├── config.yaml          # 基本設定
│   ├── base_branch: main
│   ├── label: legate
│   └── max_task_duration: 10m
├── CLAUDE.md            # AI 的行為指引
└── skills/              # 可選的 Skill 檔案
    └── ...
```

### 2.5 PR Review 迴路

**預估**：4-5 小時

```
委託者在 PR 留 review comment → AI 繼續修改：

1. Heartbeat 同時掃描 open PRs 的 review comments
2. 篩選條件：
   - PR 由 Legate 開的（branch prefix: legate/）
   - 有未回應的 review comment
3. 轉為 Channel event：
   - Clone existing branch
   - Claude Code 讀取 review comment + 修改
   - Push 到同一 branch（PR 自動更新）
   - 回覆處理結果（GitHub comment / Telegram）
```

### 2.6 並發控制

**預估**：3-4 小時

```
簡單做：
- 最多 2 個並發 container
- 超過的任務排隊（記憶體內 queue）
- Telegram / Issue comment 通知：「前面還有 N 個任務排隊中」
```

---

### Phase 2 完成標準

| 指標 | 標準 |
|------|------|
| Channel Plugin | `claude --channels plugin:legate` 啟動成功 |
| Telegram 入口 | Telegram 發任務 → PR 出現 |
| GitHub 入口 | 開 Issue → 5 分鐘內開始處理 |
| Review 迴路 | PR comment → AI 繼續修改 |
| 並發處理 | 同時處理 2 個任務 |

---

## Phase 3：社群推廣 + 多人使用（持續）

> **目標**：讓朋友和社群成員開始使用
> **驗收**：5+ 個不同 repo 成功交付

### 3.1 Onboarding 流程

```
委託者（GitHub 用戶）：
1. 在 repo 根目錄建立 .legate/ 資料夾
2. 放入 config.yaml + CLAUDE.md
3. 通知 operator 加入追蹤
4. 開 Issue + 加 "legate" label
5. 等 PR

委託者（Telegram 用戶）：
1. 加 Legate bot 好友
2. 發送 repo URL + 任務描述
3. 等 PR 連結或直接回覆

代勞者：
1. claude --channels plugin:legate
2. 完成。
```

### 3.2 多 Repo 追蹤

```
legate-config.yaml（operator 端）：

tracked_repos:
  - owner: friend-a
    repo: web-app
  - owner: friend-b
    repo: api-server
```

### 3.3 品質回饋機制

```
每完成一個任務：
- 記錄成功/失敗
- 記錄 PR review 來回次數
- 記錄任務耗時
- 委託者可在 Issue 留 👍/👎 或 Telegram 回饋

累積數據 → 優化 prompt / skill / 流程
```

### 3.4 監控 + 穩定性

```
□ VPS 上用 PM2 跑 Claude Code + Legate channel
□ Health check endpoint
□ Crash 時自動重啟
□ 定時清理 orphan containers + volumes
□ API 用量監控（防超額）
```

---

## Phase 4（未來考量）

| 項目 | 說明 |
|------|------|
| 官方 Plugin Marketplace | 提交 Legate 到 claude-plugins-official |
| GitHub Webhook | 替代 polling，即時觸發 |
| Firecracker microVM | 更強隔離（取代 Docker） |
| 多 operator 網路 | 讓多個代勞者組成服務網路 |
| Web dashboard | 查看任務狀態（可選） |
| 支援 GitLab | 擴展平台 |

---

## 技術架構

```
                    ┌─────────────────────────┐
                    │  委託者                   │
                    │  GitHub Issues / Telegram │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  Legate Channel Plugin   │
                    │  (MCP Server)            │
                    │                          │
                    │  ├─ Telegram Bot Polling  │
                    │  ├─ GitHub Heartbeat      │
                    │  ├─ Sender Allowlist      │
                    │  └─ Reply Tool            │
                    └──────────┬──────────────┘
                               │ MCP stdio
                    ┌──────────▼──────────────┐
                    │  Claude Code Session     │
                    │  (代勞者的本機)            │
                    │                          │
                    │  ├─ Task Queue            │
                    │  ├─ Docker Manager        │
                    │  └─ PR Submitter          │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ Container A  │  │ Container B  │  │ Container C  │
    │ Claude Code  │  │ Claude Code  │  │ Claude Code  │
    │ + workspace  │  │ + workspace  │  │ + workspace  │
    └─────────────┘  └─────────────┘  └─────────────┘
    (isolated)       (isolated)       (isolated)
```

### 與 OpenClaw 的差異

VentureBeat 稱 Claude Code Channels 為「OpenClaw killer」。但三者定位不同：

| | OpenClaw | Claude Code Channels | Legate |
|---|---|---|---|
| 定位 | 通用 AI 生活助理 | 開發者自用遠端控制 | 額度共享代勞服務 |
| 用戶 | 自己用自己的額度 | 自己用自己的額度 | 有額度的人幫沒額度的人 |
| 平台 | WhatsApp/Tg/Slack/DC 等 | Tg/DC（research preview） | GitHub + Tg |
| 安全 | 被稱為「2026 最大內部威脅」 | Anthropic 品牌 + sender allowlist | Docker 隔離 + PR review |
| 開源 | 是 | Plugin 開源，核心閉源 | 是 |

**Legate 的獨特價值：Channels 和 OpenClaw 都是「自己用自己的額度」。Legate 是唯一做「額度共享」的。**

---

## 安全模型

| 層級 | 機制 |
|------|------|
| Channel 層 | Sender allowlist + pairing（誰能發任務） |
| Container 隔離 | cap-drop ALL, non-root, seccomp, pids-limit |
| Network 限制 | egress-only (GitHub + npm/pypi allowlist) |
| 時間限制 | 10min hard timeout → SIGKILL |
| 資源限制 | 4GB RAM, 2 CPU cores |
| PR 安全 | Orchestrator 提交 PR（非 container 內 agent） |
| 代碼不留存 | Workspace volume 任務完成後銷毀 |
| Secrets | API Key 透過 env 注入，不存在 image 或 workspace |

---

## 風險與緩解

| 風險 | 緩解 |
|------|------|
| AI 寫爛 code | PR 強制 review，委託者決定是否 merge |
| Prompt injection via repo | Diff review + orchestrator 推 PR |
| Prompt injection via Telegram | Sender allowlist + pairing |
| Container 逃逸 | 多層防禦（cap-drop + seccomp + non-root + namespace） |
| API 額度耗盡 | 監控用量，設每日上限 |
| 委託者 repo 準備不足 | `.legate/` 模板 + onboarding 文件 |
| Channels API 變動 | Research preview 階段，追蹤官方更新 |

---

*最後更新：2026-03-20*

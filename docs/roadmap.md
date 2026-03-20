# Legate — 路線圖

> **一句話**：有額度的人幫沒額度的人——社群互助形式的 AI 代勞服務
> **模式**：不收費的額度共享 / 社群互助
> **定位**：規格文件與社群指南，非可直接運行的服務

---

## 核心理念

訂閱制服務的額度用不完是普遍現象。你不能分享 API Key，但「委託有額度的人幫你做事」本質上是勞務——就像請有 Photoshop 的設計師幫朋友做圖。

**Legate 的運作模式：**

1. 委託者透過 GitHub Issue 或其他管道發送任務
2. 代勞者（有 Claude 額度的人）用自己的 Claude Code 處理
3. 完成後透過 PR 或直接回覆交付
4. 溝通在 GitHub 上進行

**不收費** — 這不是商業產品，是社群互助工具。

---

## 架構轉型：基於 Claude Code Channels

> **2026-03-20 更新**：Claude Code v2.1.80 推出 Channels（research preview），讓 MCP server 能將外部訊息推入 Claude Code session。這改變了 Legate 的架構方向。

### 原本設計

```
GitHub Issue → 自建 Node.js Orchestrator → Docker → PR
```

需要代勞者自行架設服務、管理 Docker，門檻高。

### 新方向（基於 Channels）

```
GitHub Issue → Legate Channel Plugin (MCP) → Claude Code（代勞者本機）→ PR
```

代勞者只需要：啟動 Claude Code + 載入 Legate Channel plugin，不需要架設任何服務。

**關鍵比較：**

| | 舊架構 | 新架構（Channels） |
|---|---|---|
| 代勞者需要 | 架設 Node.js 服務 + Docker | 一行指令啟動 Claude Code |
| 任務入口 | 僅 GitHub Issue | GitHub + 未來可擴展 |
| 通訊協議 | 自建 polling | MCP 標準協議 |
| 安全模型 | 自建 allowlist | Channel sender allowlist + pairing |

**目前限制：**
- Channels 目前需要 claude.ai 登入（不支援 API key）
- Research preview 階段，自建 plugin 需用 `--dangerously-load-development-channels`
- 單人單 session，不是多租戶服務

---

## 與 OpenClaw / Channels 的差異

VentureBeat 稱 Claude Code Channels 為「OpenClaw killer」。但三者定位不同：

| | OpenClaw | Claude Code Channels | Legate |
|---|---|---|---|
| 定位 | 通用 AI 生活助理 | 開發者自用遠端控制 | 額度共享代勞服務 |
| 用戶 | 自己用自己的額度 | 自己用自己的額度 | 有額度的人幫沒額度的人 |
| 平台 | WhatsApp/Tg/Slack/DC 等 | Tg/DC（research preview） | GitHub Issues（MVP） |
| 開源 | 是 | Plugin 開源，核心閉源 | 是 |

**Legate 的獨特價值：Channels 和 OpenClaw 都是「自己用自己的額度」。Legate 是唯一做「額度共享」的。**

---

## 整體路線圖

```
Phase 1（已完成）    Phase 2（進行中）    Phase 3（計劃中）    Phase 4（未來）
Channel 機制驗證    文件與社群引導       更多 Channel 實作    Docker 隔離
GitHub Issues MVP   指南 + 推廣          社群成長             多 operator 網路
```

---

## Phase 1：Channel 機制驗證（已完成）

**目標**：驗證「透過 GitHub Issues 接收任務 → Claude Code 處理 → PR 交付」的核心流程可行性

**已完成：**
- 驗證 GitHub Issues 作為任務入口的基本流程
- 確認 Claude Code Channels（research preview）的技術可行性
- 建立 Legate 的核心概念與設計方向

**現況安全模型：**

目前代勞者在自己的 Claude Code session 中操作，隔離層級為 session 層級：
- 代勞者決定接受哪些任務
- PR 流程本身是天然的安全閘門（委託者 review 後才 merge）
- 代勞者對自己機器上的操作負完全責任

Docker 隔離是未來計劃（Phase 4），不是當前實作。

---

## Phase 2：文件、指南與社群引導（進行中）

**目標**：讓有意願的代勞者能夠根據 Legate 的指南自行運作；讓委託者知道如何發起請求

**工作項目：**

- 代勞者操作指南（如何接收與處理任務）
- 委託者使用指南（如何發起 GitHub Issue 任務）
- 最佳實踐：任務描述格式、PR 交付規範
- 社群引導文件（onboarding）
- Channel plugin 概念說明與安裝參考

**驗收標準：**
- 一個從未接觸 Legate 的人能根據文件獨立完成第一個任務

---

## Phase 3：更多 Channel 實作與社群成長（計劃中）

**目標**：擴展任務入口，讓更多人能參與

**計劃項目：**

- 更多 Channel 實作（不同的任務來源整合）
- 社群試用與回饋收集
- 根據實際使用優化指南與流程
- 多個代勞者協作的社群模型

**驗收標準：**
- 5+ 個不同委託者成功完成任務交付

---

## Phase 4：進階隔離與多 Operator 網路（未來）

| 項目 | 說明 |
|------|------|
| Docker 隔離環境 | 代勞者機器上的安全沙盒，防止惡意 repo 影響 host |
| 多 operator 網路 | 多個代勞者組成服務網路，任務自動路由 |
| Firecracker microVM | 更強隔離（取代 Docker） |
| 官方 Plugin Marketplace | 提交 Legate 到 claude-plugins-official |
| Web dashboard | 查看任務狀態（可選） |
| 擴展平台 | GitLab、其他程式碼託管平台 |

---

## 安全模型

### 現在（Phase 1-2）

| 層級 | 機制 |
|------|------|
| 任務來源 | GitHub Issues（公開可見，代勞者主動選擇接受） |
| 操作隔離 | Claude Code session 層級（代勞者自己的機器） |
| 交付安全 | PR 流程：委託者 review 後才 merge，不會直接影響 main branch |
| 信任模型 | 代勞者對委託者有基本了解（社群互助，非陌生人服務） |

### 未來（Phase 4）

| 層級 | 機制 |
|------|------|
| Channel 層 | Sender allowlist + pairing（誰能發任務） |
| Container 隔離 | Docker：cap-drop ALL, non-root, seccomp, pids-limit |
| Network 限制 | egress-only（僅允許 GitHub + 套件源） |
| 時間限制 | Hard timeout → SIGKILL |
| 代碼不留存 | Workspace 任務完成後銷毀 |

---

## 風險矩陣

| 風險 | 現狀評估 | 緩解 |
|------|---------|------|
| AI 寫出錯誤的 code | 中（已知風險） | PR 強制 review，委託者決定是否 merge |
| Prompt injection via repo | 低（社群互助模式，委託者已知） | 代勞者自行判斷任務可信度 |
| 代勞者機器被惡意 code 影響 | 中（無 Docker 隔離時） | Phase 4 Docker 隔離；目前靠代勞者審查任務 |
| API 額度耗盡 | 低（代勞者自願分享） | 代勞者自行控制接受任務量 |
| Channels API 變動 | 中（Research preview） | 追蹤官方更新，文件即時調整 |
| 社群規模無法成長 | 中 | Phase 2 重點：降低參與門檻 |

---

*最後更新：2026-03-21*

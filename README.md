<p align="center">
  <h1 align="center">Legate</h1>
  <p align="center">
    <strong>AI 程式協助，用不完的額度幫你做事。</strong>
  </p>
</p>

<p align="center">
  <a href="#功能特色">功能特色</a> •
  <a href="#運作方式">運作方式</a> •
  <a href="#委託者指南">委託者指南</a> •
  <a href="#代勞者指南">代勞者指南</a> •
  <a href="#faq">FAQ</a> •
  <a href="#文件">文件</a>
</p>

<p align="center">
  <a href="README.en.md">English</a>
</p>

---

## Legate 是什麼？

Legate 是一個社群互助工具。有 AI 訂閱額度但用不完的人，可以透過 GitHub 或 Telegram 幫助他人完成程式任務。

**不收費。不分享 API Key。純粹幫忙。**

```
你（Telegram / GitHub Issue）：「修復 src/auth.ts 的登入驗證 bug」

Legate：
  🔍 收到任務...
  📦 Fork repo...
  🤖 AI 在 Docker sandbox 中作業...
  ✅ PR 準備好了！
  🔗 https://github.com/you/project/pull/42
```

---

## 為什麼叫 Legate？

很多 AI 訂閱的額度用不完。你不能分享 API Key（違反 ToS），但你**可以**用自己的工具幫別人做事——就像有 Photoshop 的設計師幫朋友做圖一樣。

Legate 把這件事自動化：代勞者的 Claude Code 透過 [Channel plugin](https://code.claude.com/docs/en/channels) 接收任務、Fork 你的 repo、在沙盒 Docker 環境中處理、然後推 PR 交付。

---

## 功能特色

### 📱 Telegram + GitHub 雙入口
透過 Telegram 發訊息或開 GitHub Issue，兩種方式都能委託任務。不會 GitHub？沒關係，傳訊息就好。

### 🐳 Docker 隔離
每個任務在獨立 Docker 容器中執行。你的程式碼不會被儲存——工作區在每次任務後銷毀。

### 🧠 技能驅動
把 CLAUDE.md 和 skill 放在 repo 裡。AI 會讀取它們，理解你的專案慣例、架構和程式風格。

### 🔄 Fork 模式
Legate 在自己的 fork 上作業，不會直接碰你的 repo。你 review PR 後決定是否 merge。

### 🔌 基於 Claude Code Channels
Legate 是一個 [Claude Code Channel plugin](https://code.claude.com/docs/en/channels)。代勞者一行指令就能上線，不需要自建伺服器。

### 💰 免費
不收費。代勞者志願貢獻自己用不完的 AI 額度。

---

## 運作方式

```
┌──────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│  委託者       │     │  代勞者的 Claude Code      │     │  Fork        │
│              │     │                          │     │              │
│  Telegram ───┼────▶│  Legate Channel Plugin   │────▶│  (在這作業)   │
│  GitHub Issue┼────▶│  (MCP Server)            │◀────│              │
│              │◀────│  + Docker                │     │              │
│  (收到 PR)   │     │                          │     │              │
└──────────────┘     └──────────────────────────┘     └──────────────┘
```

1. **準備** — 在你的 repo 加入 `.legate/` 目錄，包含 `config.yaml` + `CLAUDE.md`
2. **委託** — 透過 Telegram 發訊息，或開 GitHub Issue 加上 `legate` label
3. **等待** — AI 收到任務，Fork 後在 Docker 中作業
4. **審查** — 收到 PR，review diff，留言要求修改
5. **合併** — 滿意就 merge。完成。

---

## 委託者指南

### 方式一：Telegram（推薦新手）

1. 加 Legate bot 為好友
2. 傳送任務：
   ```
   repo: https://github.com/you/project
   task: 修復登入驗證的 bug
   ```
3. 等 PR 連結。簡單問答會直接回覆。

### 方式二：GitHub Issue

1. 在 repo 根目錄建立 `.legate/`：

```
.legate/
├── config.yaml     # 基本設定
└── CLAUDE.md       # 你的專案的 AI 行為指南
```

2. `config.yaml` 範例：

```yaml
base_branch: main
label: legate
```

3. `CLAUDE.md` — 告訴 AI 你的專案細節（coding style、架構、慣例）。給越多 context，結果越好。

4. 開 GitHub Issue，加上 `legate` label，清楚描述需求。

### 審查結果

- Legate 會開一個 PR 並連結你的 Issue
- 像平常一樣 review diff
- 留 review comment — AI 會讀取並迭代修改
- 滿意就 merge

---

## 代勞者指南

### 環境需求

- Claude Max 訂閱（Channels 需要 claude.ai 登入）
- [Claude Code](https://code.claude.com) v2.1.80+
- [Bun](https://bun.sh) runtime
- Docker
- GitHub 帳號 + Personal Access Token

### 啟動

```bash
# 安裝 Legate Channel plugin
# （在 Claude Code 內執行）
/plugin install legate@claude-plugins-official

# 設定 Telegram bot token
/legate:configure <your-bot-token>

# 啟動（加上 --channels 旗標）
claude --channels plugin:legate@claude-plugins-official
```

就這樣。你的 Claude Code 現在會接收 Telegram 和 GitHub 的任務請求。

### 追蹤 Repo

編輯 `legate-config.yaml`：

```yaml
tracked_repos:
  - owner: friend-name
    repo: their-project
```

Heartbeat 會自動偵測帶有 `legate` label 的新 issue。

---

## 安全性

- **Channel 安全** — Sender allowlist + pairing，只有你批准的人能發任務
- **Docker 隔離** — 每個任務在獨立容器中執行（cap-drop ALL、non-root、seccomp）
- **不留存程式碼** — 任務完成後工作區銷毀
- **Fork 模式** — 代勞者永遠沒有你 repo 的寫入權限
- **PR 交付** — 你 review 所有內容後才 merge
- **Orchestrator 推 PR** — 不是容器內的 AI agent（防止 prompt injection）
- **網路限制** — 容器只能連到 GitHub + 套件 registry
- **時間限制** — 每個任務硬限 10 分鐘

---

## 技術棧

- [Claude Code Channels](https://code.claude.com/docs/en/channels) — MCP-based 訊息推送框架
- [ClaudeCab](https://github.com/cablate/claudecab) — Multi-agent 框架
- [dockerode](https://github.com/apocas/dockerode) — Docker SDK for Node.js
- [Octokit](https://github.com/octokit/octokit.js) — GitHub API client
- [MCP SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — Model Context Protocol

---

## 限制

- **本地任務** — 無法存取你的本機檔案、GUI、桌面。全部在 Docker 裡執行。
- **大型重寫** — 每個任務有 10 分鐘限制。大任務請拆成小 Issue。
- **資料庫 Migration** — 風險太高，不適合自動化。
- **處理 Secret** — 不要在 Issue 或 Telegram 放 API Key 或密碼。
- **跨系統整合** — 複雜的多服務串接不穩定。
- **記住上次任務** — 每個任務獨立執行，沒有上一個任務的脈絡。
- **Channels 限制** — 目前需要 claude.ai 登入（不支援 API key），Research Preview 階段。

---

## FAQ

### 這合法嗎？

合法。你用自己的訂閱/API 替別人做事——跟設計師用自己的 Photoshop 授權幫朋友做圖一樣。沒有分享 API Key，沒有轉移帳號。

### 我的程式碼安全嗎？

你的程式碼在隔離的 Docker 容器中執行，任務完成後容器銷毀。代勞者透過 Fork 看到你的程式碼（可見性跟你的 repo 相同）。任務完成後不留存任何程式碼。

### AI 品質如何？

把它想成一個初級工程師的初稿。Bug 修復、小功能、重構、程式碼清理都能處理。複雜的業務邏輯或架構決策需要人的判斷。**Merge 前一定要 review PR。**

### 跟 OpenClaw 有什麼不同？

OpenClaw 和 Claude Code Channels 都是「用自己的額度控制自己的 AI」。Legate 是唯一做「額度共享」的——有額度的人幫沒額度的人做事。

### 我能自己當代勞者嗎？

可以！只要你有 Claude Max 訂閱和 Docker，一行指令就能上線。見[代勞者指南](#代勞者指南)。

### PR 做錯了怎麼辦？

在 PR 留 review comment — AI 會讀取並迭代修改。如果根本做錯，關掉 PR，改善你的 Issue 描述和 CLAUDE.md，重新開 Issue。

---

## 文件

| 文件 | 說明 |
|------|------|
| [`.legate/` 規範](docs/legate-spec.md) | `.legate/` 目錄規範 + CLAUDE.md 撰寫指南 |
| [使用規章](docs/usage-guidelines.md) | 適合的任務、品質預期、責任歸屬 |
| [代勞者指南](docs/operator-guide.md) | 代勞者設定與操作手冊 |
| [Roadmap](docs/roadmap.md) | 執行計畫（[English](docs/roadmap.en.md)） |
| [可行性分析](docs/feasibility-analysis.md) | 可行性分析報告 |

---

## License

MIT

---

<p align="center">
  <sub>Built with ClaudeCab 🦞 — Sharing is caring.</sub>
</p>

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

Legate 是一個社群互助工具。有 AI 訂閱額度但用不完的人，可以透過 GitHub 幫助他人完成程式任務。

**不收費。不分享 API Key。純粹幫忙。**

```
你（GitHub Issue）：「修復 src/auth.ts 的登入驗證 bug」

Legate：
  🔍 偵測到新 issue...
  📦 Fork repo...
  🤖 AI 在 Docker sandbox 中作業...
  ✅ PR 準備好了！
  🔗 https://github.com/you/project/pull/42
```

---

## 為什麼叫 Legate？

很多 AI 訂閱的額度用不完。你不能分享 API Key（違反 ToS），但你**可以**用自己的工具幫別人做事——就像有 Photoshop 的設計師幫朋友做圖一樣。

Legate 把這件事自動化：代勞者的 AI 讀取你的 repo、透過你的 CLAUDE.md 和 skill 理解你的專案、在沙盒 Docker 環境中處理、然後推 PR 交付。

---

## 功能特色

### 🔗 GitHub 原生
全程在 GitHub 上進行。開 Issue、收 PR、Review、留言迭代——完全在你現有的工作流裡。

### 🐳 Docker 隔離
每個任務在獨立 Docker 容器中執行。你的程式碼不會被儲存——工作區在每次任務後銷毀。

### 🧠 技能驅動
把 CLAUDE.md 和 skill 放在 repo 裡。AI 會讀取它們，理解你的專案慣例、架構和程式風格。

### 🔄 Fork 模式
Legate 在自己的 fork 上作業，不會直接碰你的 repo。你 review PR 後決定是否 merge。

### 💰 免費
不收費。代勞者志願貢獻自己用不完的 AI 額度。

---

## 運作方式

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  你的 Repo    │     │  Legate          │     │  Fork        │
│  (Issues)    │────▶│  Orchestrator    │────▶│  (在這作業)   │
│              │◀────│  + Docker        │◀────│              │
│  (PRs)       │     │  + Claude Code   │     │              │
└──────────────┘     └──────────────────┘     └──────────────┘
```

1. **準備** — 在你的 repo 加入 `.legate/` 目錄，包含 `config.yaml` + `CLAUDE.md`
2. **委託** — 開一個 GitHub Issue，加上 `legate` label
3. **等待** — AI 偵測到 issue（heartbeat），Fork 後在 Docker 中作業
4. **審查** — 收到 PR，review diff，留言要求修改
5. **合併** — 滿意就 merge。完成。

---

## 委託者指南

### 設定

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

4. 聯繫一位 Legate 代勞者來追蹤你的 repo。

### 建立任務

- 開一個 GitHub Issue
- 加上 `legate` label
- 清楚描述你的需求
- 附上相關檔案路徑、預期行為等

### 審查結果

- Legate 會開一個 PR 並連結你的 Issue
- 像平常一樣 review diff
- 留 review comment — AI 會讀取並迭代修改
- 滿意就 merge

---

## 代勞者指南

### 環境需求

- 一台有 Docker 的機器（VPS 或本機）
- Claude API key 或 Max 訂閱
- GitHub 帳號 + Personal Access Token
- Node.js 20+

### 設定

```bash
# Clone Legate
git clone https://github.com/cablate/legate.git
cd legate
npm install

# 設定環境變數
cp .env.example .env
# 填入：ANTHROPIC_API_KEY, GITHUB_TOKEN

# 建置 Docker image
docker build -f Dockerfile.legate -t legate-worker .

# 啟動
npm run start
```

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

- **Docker 隔離** — 每個任務在獨立容器中執行（cap-drop ALL、non-root、seccomp）
- **不留存程式碼** — 任務完成後工作區銷毀
- **Fork 模式** — 代勞者永遠沒有你 repo 的寫入權限
- **PR 交付** — 你 review 所有內容後才 merge
- **Orchestrator 推 PR** — 不是容器內的 AI agent（防止 prompt injection）
- **網路限制** — 容器只能連到 GitHub + 套件 registry
- **時間限制** — 每個任務硬限 10 分鐘

---

## 技術棧

- [ClaudeCab](https://github.com/cablate/claudecab) — Multi-agent 框架
- [Claude Code](https://claude.ai) — AI coding engine（Anthropic）
- [dockerode](https://github.com/apocas/dockerode) — Docker SDK for Node.js
- [Octokit](https://github.com/octokit/octokit.js) — GitHub API client

---

## 限制

- **本地任務** — 無法存取你的本機檔案、GUI、桌面。全部在 Docker 裡執行。
- **大型重寫** — 每個任務有 10 分鐘限制。大任務請拆成小 Issue。
- **資料庫 Migration** — 風險太高，不適合自動化。
- **處理 Secret** — 不要在 Issue 放 API Key 或密碼。
- **跨系統整合** — 複雜的多服務串接不穩定。
- **記住上次任務** — 每個任務獨立執行，沒有上一個 Issue 的脈絡。

---

## FAQ

### 這合法嗎？

合法。你用自己的訂閱/API 替別人做事——跟設計師用自己的 Photoshop 授權幫朋友做圖一樣。沒有分享 API Key，沒有轉移帳號。

### 我的程式碼安全嗎？

你的程式碼在隔離的 Docker 容器中執行，任務完成後容器銷毀。代勞者透過 Fork 看到你的程式碼（可見性跟你的 repo 相同）。任務完成後不留存任何程式碼。

### AI 品質如何？

把它想成一個初級工程師的初稿。Bug 修復、小功能、重構、程式碼清理都能處理。複雜的業務邏輯或架構決策需要人的判斷。**Merge 前一定要 review PR。**

### 我能自己架 Legate 嗎？

可以！如果你有用不完的 AI 額度，你可以成為代勞者。見[代勞者指南](docs/operator-guide.md)。

### PR 做錯了怎麼辦？

在 PR 留 review comment — AI 會讀取並迭代修改。如果根本做錯，關掉 PR，改善你的 Issue 描述和 CLAUDE.md，重新開 Issue。

---

## 文件

| 文件 | 說明 |
|------|------|
| [`.legate/` 規範](docs/legate-spec.md) | `.legate/` 目錄規範 + CLAUDE.md 撰寫指南 |
| [使用規章](docs/usage-guidelines.md) | 適合的任務、品質預期、責任歸屬 |
| [代勞者指南](docs/operator-guide.md) | 代勞者設定與操作手冊 |
| [Roadmap](docs/roadmap.md) | 執行計畫 |
| [可行性分析](docs/feasibility-analysis.md) | 可行性分析報告 |

---

## License

MIT

---

<p align="center">
  <sub>Built with ClaudeCab 🦞 — Sharing is caring.</sub>
</p>

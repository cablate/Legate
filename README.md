<p align="center">
  <h1 align="center">Legate</h1>
  <p align="center">
    <strong>AI 程式協助，用不完的額度幫你做事。</strong>
  </p>
</p>

<p align="center">
  <a href="#legate-是什麼">概念</a> •
  <a href="#運作方式">運作方式</a> •
  <a href="#channel-架構">Channel 架構</a> •
  <a href="#開始使用">開始使用</a> •
  <a href="#faq">FAQ</a> •
  <a href="#文件">文件</a>
</p>

<p align="center">
  <a href="README.en.md">English</a>
</p>

---

## Legate 是什麼？

Legate 是一個**額度共享**的社群互助工具。

很多人有 AI 訂閱但額度用不完。你不能分享 API Key（違反 ToS），但你**可以**用自己的工具幫別人做事——就像有 Photoshop 的設計師幫朋友做圖一樣。

Legate 把這件事自動化。

**不收費。不分享 API Key。純粹幫忙。**

---

## 運作方式

```
委託者：「修復 src/auth.ts 的登入驗證 bug」
         ↓
    [ Channel ]  ← 任務入口（GitHub Issue、或任何支援的平台）
         ↓
    代勞者的 Claude Code 收到任務
         ↓
    AI 處理 → Fork repo → 作業 → 推 PR
         ↓
委託者：收到 PR，review，滿意就 merge
```

1. **委託者**在支援的平台上描述任務
2. **代勞者**的 Claude Code 透過 Channel 自動接收
3. AI 讀取你的 repo、理解你的專案慣例（透過 repo 內的 `CLAUDE.md`）、處理任務
4. 交付 Pull Request，委託者 review 後決定是否 merge

---

## Channel 架構

Legate 基於 [Claude Code Channels](https://code.claude.com/docs/en/channels)——讓外部訊息推入 Claude Code session 的 MCP 協議。

**Channel 是可插拔的。** 任何能收訊息的平台都能寫成 Channel：

| Channel | 狀態 | 說明 |
|---------|------|------|
| GitHub Issues | ✅ MVP 驗證完成 | 偵測帶 label 的 Issue，自動處理 |
| Telegram | 📋 規劃中 | 透過 bot 接收任務 |
| Discord | 📋 規劃中 | 透過 bot 接收任務 |
| 自訂 | 📖 有指南 | 見 [Channel Plugin 改造指南](docs/channel-plugin-guide.md) |

想為其他平台寫 Channel？只需要在現有 MCP Server 上加 ~10 行 Channel capability 宣告。詳見 [channel-plugin-guide.md](docs/channel-plugin-guide.md)。

---

## 開始使用

### 委託者

1. 在你的 repo 裡準備好 `CLAUDE.md`（Claude Code 標準的專案說明檔），告訴 AI 你的專案架構、慣例和程式風格——寫得越清楚，結果越好

2. 在 GitHub 開一個 Issue，加上 `legate` label，清楚描述你想要完成的任務

3. 等待代勞者的 Claude Code 接單、處理，完成後收到 PR

4. Review PR，留 comment 可以要求修改，滿意就 merge

### 代勞者

以下以 Legate 參考實作為例：

```bash
# 從 Legate 專案目錄啟動
cd /path/to/Legate
claude --dangerously-load-development-channels server:github-issues
```

需要：
- Claude Max 訂閱（Channels 需要 claude.ai 登入）
- [Claude Code](https://code.claude.com) v2.1.80+
- [Bun](https://bun.sh) runtime
- GitHub Personal Access Token

設定方式見 [代勞者指南](docs/operator-guide.md)。

---

## 核心特色

### 🧠 技能驅動
委託者把 `CLAUDE.md` 和 skill 放在 repo 裡。AI 會讀取它們，理解你的專案慣例、架構和程式風格。CLAUDE.md 寫得越好，結果越好。

### 🔄 Fork 模式
Legate 在自己的 fork 上作業，不會直接碰你的 repo。你 review PR 後決定是否 merge。

### 🔌 Channel 可插拔
任務入口不綁定特定平台。今天是 GitHub Issues，明天可以是 Telegram、Discord、LINE、或任何你想要的平台。

### 💰 免費
不收費。代勞者志願貢獻自己用不完的 AI 額度。

---

## 安全性

- **Channel 安全** — Sender allowlist，只有授權的人能發任務
- **Fork 模式** — 代勞者永遠沒有你 repo 的寫入權限
- **PR 交付** — 你 review 所有內容後才 merge
- **狀態持久化** — 重啟不會重複處理已完成的任務

> Docker 隔離（每任務獨立容器）列在 Phase 2 roadmap 中。目前任務在 Claude Code session 中執行（與你平常使用 Claude Code 相同的隔離等級）。

---

## 限制

- **大型重寫** — 大任務請拆成小 Issue
- **資料庫 Migration** — 風險太高，不適合自動化
- **處理 Secret** — 不要在任務描述中放 API Key 或密碼
- **記住上次任務** — 每個任務獨立執行，沒有上一個任務的脈絡
- **Channels 限制** — 目前需要 claude.ai 登入（不支援 API key），Research Preview 階段

---

## FAQ

### 這合法嗎？

合法。你用自己的訂閱替別人做事——跟設計師用自己的 Photoshop 授權幫朋友做圖一樣。沒有分享 API Key，沒有轉移帳號。

### 跟 OpenClaw / Claude Code Channels 有什麼不同？

OpenClaw 和 Claude Code Channels 都是「用自己的額度控制自己的 AI」。Legate 是唯一做**額度共享**的——有額度的人幫沒額度的人做事。

### AI 品質如何？

把它想成一個初級工程師的初稿。Bug 修復、小功能、重構、程式碼清理都能處理。複雜的業務邏輯或架構決策需要人的判斷。**Merge 前一定要 review PR。**

### PR 做錯了怎麼辦？

留 review comment — AI 會迭代修改。如果根本做錯，關掉 PR，改善你的任務描述和 CLAUDE.md，重新發任務。

---

## 文件

| 文件 | 說明 |
|------|------|
| [使用規章](docs/usage-guidelines.md) | 適合的任務、品質預期、責任歸屬 |
| [代勞者指南](docs/operator-guide.md) | 代勞者設定與操作手冊 |
| [Channel Plugin 改造指南](docs/channel-plugin-guide.md) | 將現有 MCP Server 改造為 Channel |
| [Roadmap](docs/roadmap.md) | 執行計畫 |
| [可行性分析](docs/feasibility-analysis.md) | 可行性分析報告 |

---

## 技術棧

- [Claude Code Channels](https://code.claude.com/docs/en/channels) — MCP-based 訊息推送框架
- [MCP SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — Model Context Protocol
- [Octokit](https://github.com/octokit/octokit.js) — GitHub API client
- [Bun](https://bun.sh) — Runtime

---

## License

MIT

---

<p align="center">
  <sub>Built with 🦞 — Sharing is caring.</sub>
</p>

# Legate 可行性分析報告

> **日期**：2026-03-18
> **版本**：v1.0
> **產出方式**：4 路平行研究（ToS、競品、架構、Docker）整合
>
> **⚠️ 2026-03-21 註**：本報告撰寫於 Claude Code Channels 發布之前。架構適配性（第 3 節）和 Docker 方案（第 4 節）的部分內容已被 Channels 架構取代。Legate 現在以 Channel plugin 形式運作，不再需要自建 Node.js orchestrator。ToS 分析（第 1 節）和市場定位（第 2 節）仍然有效。詳見 [roadmap.md](roadmap.md) 的「架構轉型」章節。

---

## 核心理念對齊

**Legate 的本質**：額度代勞服務。

- 訂閱制服務的額度用不完是普遍現象
- 不能分享 API Key（違反 ToS），但「委託有額度的人幫你做事」是合法勞務
- 全程 GitHub 介面操作（Issue + PR），避免直接溝通
- 客戶準備好 repo（含 skill、context），Legate Fork 下來處理再推 PR 交付
- AI Heartbeat 自動巡邏未處理的任務
- 基於 ClaudeCab 架構，需發展「中繼模式」取代現有的龍蝦代理模式
- Docker 隔離確保資安

---

## 1. ToS 合規性分析

### 結論：合規，但需選對認證方式

| 方式 | 合規？ | 依據 |
|------|--------|------|
| 分享 API Key | ❌ | Consumer ToS 明確禁止 |
| 讓別人登入你的帳號 | ❌ | "may not make your Account available to anyone else" |
| 用 Max 訂閱跑 headless 服務 | ⚠️ 灰色 | "ordinary, individual usage"，服務化超出此定義 |
| **用 API Key（Commercial Terms）建商業產品** | **✅** | "power products and services Customer makes available to its own customers" |
| 用自己的額度幫別人做事（勞務） | ✅ | 你是操作者，不是轉售 access |

### 關鍵判斷

Legate 的模式是「你委託我做事，我用我的工具完成」——法律上是勞務/服務，不是轉售 API access。就像請一個用 Photoshop 的設計師做圖，客戶不需要自己買 Photoshop 授權。

### 風險點

- **Max 訂閱（Consumer Terms）**：2026 年 1 月 Anthropic 已封鎖第三方工具使用訂閱 OAuth。雖然 Legate 用官方 Claude Code CLI，但系統性替多客戶跑任務明顯不是 "individual usage"
- **2026 年 2 月執法升級**：Anthropic 確認「OAuth tokens from Free, Pro, and Max plans are for use exclusively with Claude Code and Claude.ai」，第三方工具被封鎖

### 建議

Legate 不收費（社群互助模式），所以不涉及商業轉售。用自己的額度幫別人做事 = 純粹勞務，完全合規。

| 階段 | 認證方式 | 理由 |
|------|----------|------|
| Phase 1（自用測試） | Max 訂閱 | 個人用途範圍，完全合規 |
| Phase 2+（社群使用） | Max 訂閱 or API Key | 不收費 = 非商業行為，兩者皆可 |

### API 成本參考（如果切 API Key）

- Claude Sonnet：~$3/1M input, $15/1M output
- 典型 coding task：50K-200K tokens ≈ **$0.15-$3/task**
- 不收費模式下，這是 operator 的額度消耗成本

---

## 2. 市場定位分析

### 競品對照

| | Legate | Devin | GitHub Copilot Agent | OpenAI Codex |
|---|---|---|---|---|
| **介面** | GitHub Issue/PR | Slack + Web | GitHub Issue | ChatGPT + GitHub |
| **交付** | Fork → PR | VM → PR | Branch → Draft PR | Sandbox → PR |
| **費用** | 免費（互助） | $20/mo + $2.25/ACU | Copilot 訂閱費 | ChatGPT Plus/Pro |
| **隔離** | Docker per task | VM per session | Ephemeral Actions Runner | Cloud Sandbox |
| **客戶需安裝** | 無（只需 repo） | GitHub App | 已有 Copilot | 已有 ChatGPT |
| **溝通** | Issue/PR comments | Slack 即時 | Issue assign | @codex mention |

### Legate 的獨特性

1. **零基建要求** — 客戶只需一個 GitHub repo，不需安裝任何 App/訂閱任何服務
2. **Fork 模式** — 比 GitHub App 權限模型更安全（只操作自己的 fork，客戶 merge 時完全可控）
3. **Skill-driven** — 客戶把 CLAUDE.md / skill 放在 repo，AI 自動遵循，越做越懂專案
4. **額度共享經濟** — 讓用不完額度的人變現，沒有額度的人享受服務

### 潛在劣勢

1. **溝通延遲** — 沒有即時互動（Devin 有 Slack），全靠 Issue/PR 異步
2. **任務範圍受限** — 無法處理本地任務（整理檔案、操作 GUI）
3. **品牌信任** — 新服務 vs Devin/GitHub 的品牌背書
4. **客戶教育成本** — 「準備好 repo + skill」的門檻不低

### 2026 年市場趨勢

- **PR 作為交付單位** 是業界共識——所有服務都透過 PR 交付
- **VM/Container 隔離** 是標配（Devin、Codex、Copilot Agent、Cursor Background Agent）
- **定價收斂在 $20-$200/月**，Legate 的 per-task 模式是差異化
- **GitHub 作為介面** 是主流——Issue、@mention、PR comments

---

## 3. ClaudeCab 架構適配性

### 可直接複用

| 元件 | 檔案 | 需修改 |
|------|------|--------|
| SDK 查詢層 | `SDKQueryManager.ts`, `SDKSessionManager.ts` | 改 `cwd` 指向客戶 repo |
| 排程系統 | `CronScheduler.ts`, `ScheduleExecutor.ts` | 用 `interval` trigger 當 Heartbeat |
| Agent 設定 schema | `types/agent.ts` | 新增 Legate 專用欄位 |
| 權限模板 | `.claude/settings.local.json` | 建 Legate 專用模板 |
| ConfigTransformer | `core/ConfigTransformer.ts` | 映射 Legate config 到 SDK options |

### 需要新建

| 元件 | 理由 |
|------|------|
| GitHub 適配器（Octokit） | 目前完全沒有 GitHub 整合 |
| Issue 巡邏器 / Heartbeat | 讀取 GitHub Issues，轉換為任務 |
| PR 建立器 / 評論器 | 結果推送回 PR/comments |
| Docker 任務編排器（dockerode） | 每任務獨立容器 |
| Repo 工作區管理器 | Fork/Clone/Branch/Push 全套 |
| Legate AgentLoader | 從客戶 repo 載入 config（非 `agents/` 目錄） |
| Webhook 接收器（可選） | 替代 polling 的即時觸發 |

### 核心架構變更

目前 ClaudeCab 將三件事綁在一起，Legate 需要拆開：

| | 現況（龍蝦模式） | Legate（中繼模式） |
|---|---|---|
| Agent config | `agents/{id}/agent.json` | 中央設定 or 客戶 repo `.legate/` |
| CLAUDE.md | `agents/{id}/CLAUDE.md` | 客戶 repo 自帶 |
| cwd | `agents/{id}/` | Docker 內的客戶 repo 根目錄 |

---

## 4. Docker 隔離方案

### 推薦架構

```
客戶 Issue
    │
    ▼
Legate Orchestrator (Node.js + dockerode)
    │  Fork repo → Clone → Create branch
    ▼
Docker Container (per task)
  ├─ Base: ubuntu + git + node + Claude Code CLI
  ├─ User: UID 1000 (non-root)
  ├─ Network: egress-only (GitHub + npm/pypi allowlist)
  ├─ Memory: 2-4GB, CPU: 1-2 cores
  ├─ PID limit: 512
  ├─ cap-drop=ALL, no-new-privileges, seccomp
  ├─ Max runtime: 10min → SIGKILL
  └─ Workspace: disposable volume (task 完成後刪除)
    │
    ▼
Post-task Validation
  ├─ git diff review
  ├─ npm audit / security scan
  └─ PR 由 orchestrator 提交（非 agent）
```

### 安全決策

| 決策 | 理由 |
|------|------|
| PR 由 orchestrator 提交 | 防止 agent 被 prompt injection 推送惡意代碼 |
| Network egress allowlist | 只允許 GitHub API + 套件註冊表 |
| 不注入 secret 到容器 | Token 由 orchestrator 管理 |
| Workspace 立即銷毀 | 客戶代碼不留存 |
| Non-root user | 降低容器逃逸影響 |

### 成本估算

| 項目 | 費用 |
|------|------|
| Hetzner 4vCPU/8GB VPS | ~€8/月 |
| Claude API per task | ~$0.15-$3 |
| Docker overhead | 幾乎為零 |
| 可並行任務數 | 2-4 個 |

### 未來升級路徑

Docker → Firecracker microVM（E2B 模式），提供更強的隔離。但 Phase 1 Docker 足夠。

---

## 5. 風險矩陣

| 風險 | 嚴重度 | 機率 | 緩解措施 |
|------|--------|------|----------|
| Max 訂閱被封 | 高 | 中 | Phase 2 前切 API Key |
| AI 產出品質不穩 | 高 | 高 | PR 強制 review、Skill 機制、品質模板 |
| 容器逃逸 | 高 | 低 | cap-drop ALL + seccomp + non-root |
| Prompt injection via repo | 中 | 中 | Post-task diff review、orchestrator 推 PR |
| 客戶 repo 準備度差 | 中 | 高 | `.legate/` 模板、onboarding 文件 |
| 異步溝通延遲 | 低 | 高 | Heartbeat 頻率可調 |
| 競品壓力 | 中 | 高 | Skill-driven + Fork 模式差異化 |
| API 額度消耗過快 | 中 | 中 | 監控用量、設每日任務上限 |

---

## 6. 可行性結論

### 技術可行性：高

- ClaudeCab 的 SDK 層、排程系統、權限模型可複用
- Docker 隔離是成熟技術
- GitHub API 整合不複雜
- 最大工程挑戰是「中繼模式」的 cwd 解耦——架構重構，非技術瓶頸

### 社群可行性：高（不收費模式）

**利多：**
- 「額度共享互助」是全新切入點，市場上無人這麼做
- 不收費大幅降低門檻——委託者零成本
- Skill-driven 是真正護城河——AI 越做越懂專案，Devin 等無狀態競品做不到
- 進入門檻極低——委託者只需 GitHub repo

**風險：**
- 委託者教育成本不低（準備好 repo + skill）
- 品質不穩是最大體驗風險
- Operator 的額度消耗需自行承擔

### 建議 MVP 路線

1. 用自己的專案驗證完整流程（Fork → Docker → Claude Code → PR）
2. 先手動觸發跑通，不急做 Heartbeat
3. 確認額度消耗在可接受範圍
4. 再做 GitHub Issue 自動巡邏
5. 朋友測試（5-10 人），收集回饋
6. 根據回饋決定是否擴大

---

## 附錄：研究來源

### ToS 相關
- [Claude Code Legal and Compliance Docs](https://code.claude.com/docs/en/legal-and-compliance)
- [Anthropic Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms)
- [Anthropic Consumer Terms of Service](https://www.anthropic.com/terms)
- [Anthropic clarifies ban on third-party tool access (The Register, Feb 2026)](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/)

### 競品相關
- [Devin Pricing](https://devin.ai/pricing/)
- [GitHub Copilot Coding Agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)
- [CodeRabbit Pricing](https://www.coderabbit.ai/pricing)
- [OpenAI Codex](https://openai.com/codex)
- [Augment Code Intent](https://www.augmentcode.com/product/intent)

### Docker/安全相關
- [OWASP Docker Security Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Docker Security Docs](https://docs.docker.com/engine/security/)
- [dockerode (Node.js SDK)](https://github.com/apocas/dockerode)
- [E2B Infra (Firecracker+KVM)](https://github.com/e2b-dev/infra)
- [Against Docker-in-Docker (Petazzoni)](https://jpetazzo.github.io/2015/09/03/do-not-use-docker-in-docker-for-ci/)

---

*最後更新：2026-03-18*

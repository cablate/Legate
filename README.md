<p align="center">
  <h1 align="center">Legate</h1>
  <p align="center">
    <strong>AI coding help, powered by shared quota.</strong><br/>
    AI 程式協助，用不完的額度幫你做事。
  </p>
</p>

<p align="center">
  <a href="#features--功能特色">Features</a> •
  <a href="#how-it-works--運作方式">How It Works</a> •
  <a href="#for-requesters--委託者指南">For Requesters</a> •
  <a href="#for-operators--代勞者指南">For Operators</a> •
  <a href="#faq">FAQ</a> •
  <a href="#docs--文件">Docs</a>
</p>

---

## What is Legate? ｜ Legate 是什麼？

Legate is a community tool that lets people with unused AI subscription quota help others with coding tasks — all through GitHub.

Legate 是一個社群互助工具。有 AI 訂閱額度但用不完的人，可以透過 GitHub 幫助他人完成程式任務。

**No fees. No API keys shared. Just help.**

不收費。不分享 API Key。純粹幫忙。

```
You (GitHub Issue): "Fix the login validation bug in src/auth.ts"

Legate:
  🔍 Detected new issue...
  📦 Forking repo...
  🤖 AI working in Docker sandbox...
  ✅ PR ready!
  🔗 https://github.com/you/project/pull/42
```

---

## Why Legate? ｜ 為什麼叫 Legate？

Many AI subscriptions come with quotas that go unused. You can't share your API key (violates ToS), but you **can** use your own tools to help someone else — just like a designer with Photoshop doing work for a friend.

很多 AI 訂閱的額度用不完。你不能分享 API Key（違反 ToS），但你**可以**用自己的工具幫別人做事——就像有 Photoshop 的設計師幫朋友做圖一樣。

Legate automates this: the operator's AI reads your repo, understands your codebase via your own CLAUDE.md and skills, does the work in a sandboxed Docker container, and delivers a Pull Request.

Legate 把這件事自動化：代勞者的 AI 讀取你的 repo、透過你的 CLAUDE.md 和 skill 理解你的專案、在沙盒 Docker 環境中處理、然後推 PR 交付。

---

## Features ｜ 功能特色

### 🔗 GitHub-native ｜ GitHub 原生
Everything happens on GitHub. Open an Issue, get a PR. Review, comment, iterate — all in your existing workflow.

全程在 GitHub 上進行。開 Issue、收 PR、Review、留言迭代——完全在你現有的工作流裡。

### 🐳 Docker Isolated ｜ Docker 隔離
Every task runs in its own Docker container. Your code is never stored — workspace is destroyed after each task.

每個任務在獨立 Docker 容器中執行。你的程式碼不會被儲存——工作區在每次任務後銷毀。

### 🧠 Skill-driven ｜ 技能驅動
Put your CLAUDE.md and skills in the repo. The AI reads them and understands your project's conventions, architecture, and coding style.

把 CLAUDE.md 和 skill 放在 repo 裡。AI 會讀取它們，理解你的專案慣例、架構和程式風格。

### 🔄 Fork Model ｜ Fork 模式
Legate works on its own fork, never touches your repo directly. You review the PR and decide whether to merge.

Legate 在自己的 fork 上作業，不會直接碰你的 repo。你 review PR 後決定是否 merge。

### 💰 Free ｜ 免費
No fees. The operator volunteers their unused AI quota to help.

不收費。代勞者志願貢獻自己用不完的 AI 額度。

---

## How It Works ｜ 運作方式

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Your Repo   │     │  Legate          │     │  Fork        │
│  (Issues)    │────▶│  Orchestrator    │────▶│  (Work here) │
│              │◀────│  + Docker        │◀────│              │
│  (PRs)       │     │  + Claude Code   │     │              │
└──────────────┘     └──────────────────┘     └──────────────┘
```

1. **Prepare** — Add `.legate/` to your repo with `config.yaml` + `CLAUDE.md`
2. **Request** — Open a GitHub Issue with the `legate` label
3. **Wait** — AI detects the issue (heartbeat), forks, and works in Docker
4. **Review** — Get a PR, review the diff, leave comments for iteration
5. **Merge** — Happy? Merge the PR. Done.

---

## For Requesters ｜ 委託者指南

### Setup

1. Create `.legate/` in your repo root:

```
.legate/
├── config.yaml     # Basic settings
└── CLAUDE.md       # AI behavior guide for your project
```

2. `config.yaml` example:

```yaml
base_branch: main
label: legate
```

3. `CLAUDE.md` — Tell the AI about your project (coding style, architecture, conventions). The more context, the better the results.

4. Contact a Legate operator to track your repo.

### Creating Tasks

- Open a GitHub Issue
- Add the `legate` label
- Describe what you need clearly
- Include relevant file paths, expected behavior, etc.

### Reviewing Results

- Legate opens a PR linking to your Issue
- Review the diff like any normal PR
- Leave review comments — the AI will iterate
- Merge when satisfied

---

## For Operators ｜ 代勞者指南

### Requirements

- A machine (VPS or local) with Docker
- Claude API key or Max subscription
- GitHub account + Personal Access Token
- Node.js 20+

### Setup

```bash
# Clone Legate
git clone https://github.com/cablate/Legate.git
cd legate
npm install

# Configure
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, GITHUB_TOKEN

# Build Docker image
docker build -f Dockerfile.legate -t legate-worker .

# Start
npm run start
```

### Adding Repos to Track

Edit `legate-config.yaml`:

```yaml
tracked_repos:
  - owner: friend-name
    repo: their-project
```

The heartbeat will automatically detect new issues with the `legate` label.

---

## Security ｜ 安全性

- **Docker isolation** — Each task runs in its own container (cap-drop ALL, non-root, seccomp)
- **No code retention** — Workspace destroyed after each task
- **Fork model** — Operator never has write access to your repo
- **PR-based delivery** — You review everything before merge
- **Orchestrator submits PR** — Not the AI agent inside the container (prevents prompt injection)
- **Network restricted** — Containers can only reach GitHub + package registries
- **Time limited** — 10-minute hard timeout per task

---

## Built With ｜ 技術棧

- [ClaudeCab](https://github.com/cablate/ClaudeCab) — Multi-agent framework
- [Claude Code](https://claude.ai) — AI coding engine (Anthropic)
- [dockerode](https://github.com/apocas/dockerode) — Docker SDK for Node.js
- [Octokit](https://github.com/octokit/octokit.js) — GitHub API client

---

## Limitations ｜ 限制

### What Legate can't do

- **Local tasks** — Can't access your local files, GUI, or desktop. Everything runs in Docker.
- **Large rewrites** — 10-minute timeout per task. Break big tasks into smaller Issues.
- **Database migrations** — Too risky for automated execution.
- **Secrets handling** — Never put API keys or passwords in Issues.
- **Cross-system integration** — Complex multi-service orchestration is unreliable.
- **Remember past tasks** — Each task is independent. No context from previous Issues.

### Legate 做不到的

- **本地任務** — 無法存取你的本機檔案、GUI、桌面。全部在 Docker 裡執行。
- **大型重寫** — 每個任務有 10 分鐘限制。大任務請拆成小 Issue。
- **資料庫 Migration** — 風險太高，不適合自動化。
- **處理 Secret** — 不要在 Issue 放 API Key 或密碼。
- **跨系統整合** — 複雜的多服務串接不穩定。
- **記住上次任務** — 每個任務獨立執行，沒有上一個 Issue 的脈絡。

---

## FAQ

### Is this legal? ｜ 這合法嗎？

Yes. You're using your own subscription/API to do work for someone else — just like a designer using their own Photoshop license to help a friend. No API keys are shared, no accounts are transferred.

合法。你用自己的訂閱/API 替別人做事——跟設計師用自己的 Photoshop 授權幫朋友做圖一樣。沒有分享 API Key，沒有轉移帳號。

### Is my code safe? ｜ 我的程式碼安全嗎？

Your code runs in an isolated Docker container that is destroyed after each task. The operator sees your code through their fork (same visibility as your repo). No code is stored after the task completes.

你的程式碼在隔離的 Docker 容器中執行，任務完成後容器銷毀。代勞者透過 Fork 看到你的程式碼（可見性跟你的 repo 相同）。任務完成後不留存任何程式碼。

### How good is the AI? ｜ AI 品質如何？

Think of it as a junior developer's first draft. It can handle bug fixes, small features, refactoring, and code cleanup well. Complex business logic or architectural decisions need human judgment. **Always review the PR before merging.**

把它想成一個初級工程師的初稿。Bug 修復、小功能、重構、程式碼清理都能處理。複雜的業務邏輯或架構決策需要人的判斷。**Merge 前一定要 review PR。**

### Can I run my own Legate? ｜ 我能自己架 Legate 嗎？

Yes! If you have unused AI quota, you can become an operator. See [Operator Guide](docs/operator-guide.md).

可以！如果你有用不完的 AI 額度，你可以成為代勞者。見 [Operator 指南](docs/operator-guide.md)。

### What if the PR is wrong? ｜ PR 做錯了怎麼辦？

Leave review comments on the PR — the AI will read them and iterate. If it's fundamentally wrong, close the PR, improve your Issue description and CLAUDE.md, and try again.

在 PR 留 review comment — AI 會讀取並迭代修改。如果根本做錯，關掉 PR，改善你的 Issue 描述和 CLAUDE.md，重新開 Issue。

---

## Docs ｜ 文件

| Document | Description |
|----------|-------------|
| [`.legate/` Spec](docs/legate-spec.md) | `.legate/` 目錄規範 + CLAUDE.md 撰寫指南 |
| [Usage Guidelines](docs/usage-guidelines.md) | 使用規章（適合的任務、品質預期、責任歸屬） |
| [Operator Guide](docs/operator-guide.md) | 代勞者設定與操作手冊 |
| [Roadmap](docs/roadmap.md) | 執行計畫 |
| [Feasibility Analysis](docs/feasibility-analysis.md) | 可行性分析報告 |

---

## License

MIT

---

<p align="center">
  <sub>Built with ClaudeCab 🦞 — Sharing is caring.</sub>
</p>

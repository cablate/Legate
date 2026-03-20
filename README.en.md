<p align="center">
  <h1 align="center">Legate</h1>
  <p align="center">
    <strong>AI coding help, powered by shared quota.</strong>
  </p>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#for-requesters">For Requesters</a> •
  <a href="#for-operators">For Operators</a> •
  <a href="#faq">FAQ</a> •
  <a href="#docs">Docs</a>
</p>

<p align="center">
  <a href="README.md">中文</a>
</p>

---

## What is Legate?

Legate is a community tool that lets people with unused AI subscription quota help others with coding tasks — through GitHub or Telegram.

**No fees. No API keys shared. Just help.**

```
You (Telegram / GitHub Issue): "Fix the login validation bug in src/auth.ts"

Legate:
  🔍 Task received...
  📦 Forking repo...
  🤖 AI working in Docker sandbox...
  ✅ PR ready!
  🔗 https://github.com/you/project/pull/42
```

---

## Why Legate?

Many AI subscriptions come with quotas that go unused. You can't share your API key (violates ToS), but you **can** use your own tools to help someone else — just like a designer with Photoshop doing work for a friend.

Legate automates this: the operator's Claude Code receives tasks through a [Channel plugin](https://code.claude.com/docs/en/channels), forks your repo, processes it in a sandboxed Docker container, and delivers a Pull Request.

---

## Features

### 📱 Telegram + GitHub Dual Intake
Send a Telegram message or open a GitHub Issue — both work. Don't know GitHub? No problem, just send a message.

### 🐳 Docker Isolated
Every task runs in its own Docker container. Your code is never stored — workspace is destroyed after each task.

### 🧠 Skill-driven
Put your CLAUDE.md and skills in the repo. The AI reads them and understands your project's conventions, architecture, and coding style.

### 🔄 Fork Model
Legate works on its own fork, never touches your repo directly. You review the PR and decide whether to merge.

### 🔌 Built on Claude Code Channels
Legate is a [Claude Code Channel plugin](https://code.claude.com/docs/en/channels). Operators go live with a single command — no custom server needed.

### 💰 Free
No fees. The operator volunteers their unused AI quota to help.

---

## How It Works

```
┌──────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│  Requester   │     │  Operator's Claude Code   │     │  Fork        │
│              │     │                          │     │              │
│  Telegram ───┼────▶│  Legate Channel Plugin   │────▶│  (Work here) │
│  GitHub Issue┼────▶│  (MCP Server)            │◀────│              │
│              │◀────│  + Docker                │     │              │
│  (Gets PR)   │     │                          │     │              │
└──────────────┘     └──────────────────────────┘     └──────────────┘
```

1. **Prepare** — Add `.legate/` to your repo with `config.yaml` + `CLAUDE.md`
2. **Request** — Send a Telegram message, or open a GitHub Issue with the `legate` label
3. **Wait** — AI receives the task, forks, and works in Docker
4. **Review** — Get a PR, review the diff, leave comments for iteration
5. **Merge** — Happy? Merge the PR. Done.

---

## For Requesters

### Option 1: Telegram (recommended for beginners)

1. Add Legate bot as a friend
2. Send your task:
   ```
   repo: https://github.com/you/project
   task: Fix the login validation bug
   ```
3. Wait for the PR link. Simple questions get a direct reply.

### Option 2: GitHub Issue

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

4. Open a GitHub Issue with the `legate` label and describe what you need.

### Reviewing Results

- Legate opens a PR linking to your Issue
- Review the diff like any normal PR
- Leave review comments — the AI will iterate
- Merge when satisfied

---

## For Operators

### Requirements

- Claude Max subscription (Channels require claude.ai login)
- [Claude Code](https://code.claude.com) v2.1.80+
- [Bun](https://bun.sh) runtime
- Docker
- GitHub account + Personal Access Token

### Getting Started

```bash
# Install the Legate Channel plugin
# (run inside Claude Code)
/plugin install legate@claude-plugins-official

# Configure your Telegram bot token
/legate:configure <your-bot-token>

# Launch with channels flag
claude --channels plugin:legate@claude-plugins-official
```

That's it. Your Claude Code now accepts task requests from Telegram and GitHub.

### Adding Repos to Track

Edit `legate-config.yaml`:

```yaml
tracked_repos:
  - owner: friend-name
    repo: their-project
```

The heartbeat automatically detects new issues with the `legate` label.

---

## Security

- **Channel security** — Sender allowlist + pairing, only approved users can send tasks
- **Docker isolation** — Each task runs in its own container (cap-drop ALL, non-root, seccomp)
- **No code retention** — Workspace destroyed after each task
- **Fork model** — Operator never has write access to your repo
- **PR-based delivery** — You review everything before merge
- **Orchestrator submits PR** — Not the AI agent inside the container (prevents prompt injection)
- **Network restricted** — Containers can only reach GitHub + package registries
- **Time limited** — 10-minute hard timeout per task

---

## Built With

- [Claude Code Channels](https://code.claude.com/docs/en/channels) — MCP-based message push framework
- [ClaudeCab](https://github.com/cablate/claudecab) — Multi-agent framework
- [dockerode](https://github.com/apocas/dockerode) — Docker SDK for Node.js
- [Octokit](https://github.com/octokit/octokit.js) — GitHub API client
- [MCP SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — Model Context Protocol

---

## Limitations

- **Local tasks** — Can't access your local files, GUI, or desktop. Everything runs in Docker.
- **Large rewrites** — 10-minute timeout per task. Break big tasks into smaller Issues.
- **Database migrations** — Too risky for automated execution.
- **Secrets handling** — Never put API keys or passwords in Issues or Telegram messages.
- **Cross-system integration** — Complex multi-service orchestration is unreliable.
- **Remember past tasks** — Each task is independent. No context from previous tasks.
- **Channels limitation** — Currently requires claude.ai login (no API key support), Research Preview stage.

---

## FAQ

### Is this legal?

Yes. You're using your own subscription/API to do work for someone else — just like a designer using their own Photoshop license to help a friend. No API keys are shared, no accounts are transferred.

### Is my code safe?

Your code runs in an isolated Docker container that is destroyed after each task. The operator sees your code through their fork (same visibility as your repo). No code is stored after the task completes.

### How good is the AI?

Think of it as a junior developer's first draft. It can handle bug fixes, small features, refactoring, and code cleanup well. Complex business logic or architectural decisions need human judgment. **Always review the PR before merging.**

### How is this different from OpenClaw?

Both OpenClaw and Claude Code Channels are "use your own quota to control your own AI." Legate is the only one doing "quota sharing" — people with quota help those without.

### Can I be an operator?

Yes! If you have a Claude Max subscription and Docker, you're one command away. See [For Operators](#for-operators).

### What if the PR is wrong?

Leave review comments on the PR — the AI will read them and iterate. If it's fundamentally wrong, close the PR, improve your Issue description and CLAUDE.md, and try again.

---

## Docs

| Document | Description |
|----------|-------------|
| [`.legate/` Spec](docs/legate-spec.md) | `.legate/` directory spec + CLAUDE.md writing guide |
| [Usage Guidelines](docs/usage-guidelines.md) | Task suitability, quality expectations, responsibility |
| [Operator Guide](docs/operator-guide.md) | Operator setup and operations manual |
| [Roadmap](docs/roadmap.md) | Execution plan ([English](docs/roadmap.en.md)) |
| [Feasibility Analysis](docs/feasibility-analysis.md) | Feasibility analysis report |

---

## License

MIT

---

<p align="center">
  <sub>Built with ClaudeCab 🦞 — Sharing is caring.</sub>
</p>

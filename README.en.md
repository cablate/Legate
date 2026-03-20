<p align="center">
  <h1 align="center">Legate</h1>
  <p align="center">
    <strong>AI coding help, powered by shared quota.</strong>
  </p>
</p>

<p align="center">
  <a href="#what-is-legate">Concept</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#channel-architecture">Channel Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#faq">FAQ</a> •
  <a href="#docs">Docs</a>
</p>

<p align="center">
  <a href="README.md">中文</a>
</p>

---

## What is Legate?

Legate is a **quota-sharing** community tool.

Many people have AI subscriptions with unused quota. You can't share your API key (violates ToS), but you **can** use your own tools to help others — just like a designer with Photoshop doing work for a friend.

Legate automates this.

**No fees. No API keys shared. Just help.**

---

## How It Works

```
Requester: "Fix the login validation bug in src/auth.ts"
              ↓
         [ Channel ]  ← Task entry (GitHub Issue, or any supported platform)
              ↓
         Operator's Claude Code receives the task
              ↓
         AI processes → Fork repo → Work → Push PR
              ↓
Requester: Receives PR, reviews, merges if satisfied
```

1. **Requester** describes the task on a supported platform
2. **Operator's** Claude Code automatically receives it via Channel
3. AI reads your repo, understands your project conventions (via `CLAUDE.md`), and processes the task
4. Delivers a Pull Request — requester reviews and decides whether to merge

---

## Channel Architecture

Legate is built on [Claude Code Channels](https://code.claude.com/docs/en/channels) — an MCP protocol that pushes external messages into Claude Code sessions.

**Channels are pluggable.** Any platform that can receive messages can be built into a Channel:

| Channel | Status | Description |
|---------|--------|-------------|
| GitHub Issues | ✅ MVP verified | Detects labeled Issues, processes automatically |
| Telegram | 📋 Planned | Receive tasks via bot |
| Discord | 📋 Planned | Receive tasks via bot |
| Custom | 📖 Guide available | See [Channel Plugin Guide](docs/channel-plugin-guide.md) |

Want to build a Channel for another platform? Just add ~10 lines of Channel capability declaration to an existing MCP Server. See [channel-plugin-guide.md](docs/channel-plugin-guide.md).

---

## Getting Started

### For Requesters

1. Prepare your repo with a good `CLAUDE.md` — Claude Code's standard project instructions file. Describe your project conventions, architecture, and coding style. The better the `CLAUDE.md`, the better the results.

2. Open a GitHub Issue with the `legate` label. Describe your task clearly: what needs to be done, what the expected outcome is, and any relevant context.

3. Receive a PR, review it, leave comments to request changes, merge when satisfied.

### For Operators

The reference implementation uses the `--dangerously-load-development-channels` flag, which is currently required for Channels support:

```bash
# Launch from the Legate project directory
cd /path/to/Legate
claude --dangerously-load-development-channels server:github-issues
```

Requirements:
- Claude Max subscription (Channels requires claude.ai login)
- [Claude Code](https://code.claude.com) v2.1.80+
- [Bun](https://bun.sh) runtime
- GitHub Personal Access Token

See [Operator Guide](docs/operator-guide.md) for setup details.

---

## Key Features

### 🧠 Skill-Driven
Requesters put `CLAUDE.md` in their repo. The AI reads it and understands your project conventions, architecture, and coding style. The better the CLAUDE.md, the better the results.

### 🔄 Fork Model
Legate works on its own fork — never touches your repo directly. You review the PR and decide whether to merge.

### 🔌 Pluggable Channels
Task entry isn't tied to a specific platform. Today it's GitHub Issues, tomorrow it could be Telegram, Discord, LINE, or any platform you want.

### 💰 Free
No fees. Operators volunteer their unused AI quota to help.

---

## Security

- **Channel security** — Sender allowlist, only authorized users can submit tasks
- **Fork model** — Operators never have write access to your repo
- **PR delivery** — You review all content before merging
- **Persistent state** — Restarts won't re-process completed tasks

> Docker isolation (per-task containers) is on the Phase 2 roadmap. Currently tasks run in a Claude Code session (same isolation level as normal Claude Code usage).

---

## Limitations

- **Large rewrites** — Break big tasks into smaller Issues
- **Database migrations** — Too risky for automation
- **Secrets handling** — Never put API keys or passwords in task descriptions
- **Remember past tasks** — Each task runs independently, no context from previous tasks
- **Channels limitation** — Currently requires claude.ai login (no API key support), Research Preview

---

## FAQ

### Is this legal?

Yes. You're using your own subscription to do work for someone else — just like a designer using their own Photoshop license to help a friend. No API keys shared, no accounts transferred.

### How is this different from OpenClaw / Claude Code Channels?

OpenClaw and Claude Code Channels are both "use your own quota to control your own AI." Legate is the only one doing **quota sharing** — people with quota help those without.

### How good is the AI?

Think of it as a junior developer's first draft. Bug fixes, small features, refactoring, and code cleanup work well. Complex business logic or architectural decisions need human judgment. **Always review the PR before merging.**

### What if the PR is wrong?

Leave review comments — the AI will iterate. If it's fundamentally wrong, close the PR, improve your task description and CLAUDE.md, and try again.

---

## Docs

| Document | Description |
|----------|-------------|
| [Usage Guidelines](docs/usage-guidelines.md) | Task suitability, quality expectations, responsibility |
| [Operator Guide](docs/operator-guide.md) | Operator setup and operations manual |
| [Channel Plugin Guide](docs/channel-plugin-guide.md) | Convert existing MCP Server into a Channel |
| [Roadmap](docs/roadmap.md) | Execution plan |
| [Feasibility Analysis](docs/feasibility-analysis.md) | Feasibility analysis report |

---

## Tech Stack

- [Claude Code Channels](https://code.claude.com/docs/en/channels) — MCP-based message push framework
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

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

Legate is a community tool that lets people with unused AI subscription quota help others with coding tasks — all through GitHub.

**No fees. No API keys shared. Just help.**

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

## Why Legate?

Many AI subscriptions come with quotas that go unused. You can't share your API key (violates ToS), but you **can** use your own tools to help someone else — just like a designer with Photoshop doing work for a friend.

Legate automates this: the operator's AI reads your repo, understands your codebase via your own CLAUDE.md and skills, does the work in a sandboxed Docker container, and delivers a Pull Request.

---

## Features

### 🔗 GitHub-native
Everything happens on GitHub. Open an Issue, get a PR. Review, comment, iterate — all in your existing workflow.

### 🐳 Docker Isolated
Every task runs in its own Docker container. Your code is never stored — workspace is destroyed after each task.

### 🧠 Skill-driven
Put your CLAUDE.md and skills in the repo. The AI reads them and understands your project's conventions, architecture, and coding style.

### 🔄 Fork Model
Legate works on its own fork, never touches your repo directly. You review the PR and decide whether to merge.

### 💰 Free
No fees. The operator volunteers their unused AI quota to help.

---

## How It Works

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

## For Requesters

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

## For Operators

### Requirements

- A machine (VPS or local) with Docker
- Claude API key or Max subscription
- GitHub account + Personal Access Token
- Node.js 20+

### Setup

```bash
# Clone Legate
git clone https://github.com/cablate/legate.git
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

## Security

- **Docker isolation** — Each task runs in its own container (cap-drop ALL, non-root, seccomp)
- **No code retention** — Workspace destroyed after each task
- **Fork model** — Operator never has write access to your repo
- **PR-based delivery** — You review everything before merge
- **Orchestrator submits PR** — Not the AI agent inside the container (prevents prompt injection)
- **Network restricted** — Containers can only reach GitHub + package registries
- **Time limited** — 10-minute hard timeout per task

---

## Built With

- [ClaudeCab](https://github.com/cablate/claudecab) — Multi-agent framework
- [Claude Code](https://claude.ai) — AI coding engine (Anthropic)
- [dockerode](https://github.com/apocas/dockerode) — Docker SDK for Node.js
- [Octokit](https://github.com/octokit/octokit.js) — GitHub API client

---

## Limitations

- **Local tasks** — Can't access your local files, GUI, or desktop. Everything runs in Docker.
- **Large rewrites** — 10-minute timeout per task. Break big tasks into smaller Issues.
- **Database migrations** — Too risky for automated execution.
- **Secrets handling** — Never put API keys or passwords in Issues.
- **Cross-system integration** — Complex multi-service orchestration is unreliable.
- **Remember past tasks** — Each task is independent. No context from previous Issues.

---

## FAQ

### Is this legal?

Yes. You're using your own subscription/API to do work for someone else — just like a designer using their own Photoshop license to help a friend. No API keys are shared, no accounts are transferred.

### Is my code safe?

Your code runs in an isolated Docker container that is destroyed after each task. The operator sees your code through their fork (same visibility as your repo). No code is stored after the task completes.

### How good is the AI?

Think of it as a junior developer's first draft. It can handle bug fixes, small features, refactoring, and code cleanup well. Complex business logic or architectural decisions need human judgment. **Always review the PR before merging.**

### Can I run my own Legate?

Yes! If you have unused AI quota, you can become an operator. See [Operator Guide](docs/operator-guide.md).

### What if the PR is wrong?

Leave review comments on the PR — the AI will read them and iterate. If it's fundamentally wrong, close the PR, improve your Issue description and CLAUDE.md, and try again.

---

## Docs

| Document | Description |
|----------|-------------|
| [`.legate/` Spec](docs/legate-spec.md) | `.legate/` directory spec + CLAUDE.md writing guide |
| [Usage Guidelines](docs/usage-guidelines.md) | Task suitability, quality expectations, responsibility |
| [Operator Guide](docs/operator-guide.md) | Operator setup and operations manual |
| [Roadmap](docs/roadmap.md) | Execution plan |
| [Feasibility Analysis](docs/feasibility-analysis.md) | Feasibility analysis report |

---

## License

MIT

---

<p align="center">
  <sub>Built with ClaudeCab 🦞 — Sharing is caring.</sub>
</p>

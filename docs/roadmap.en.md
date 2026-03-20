# Legate — Execution Plan

> **One-liner**: People with unused AI quota help others via GitHub / Telegram — AI auto Forks → processes → delivers PRs
> **Model**: Free quota sharing / community mutual aid
> **Phase 1 cost**: One VPS + existing Claude quota
> **Codename**: Legate

---

## Core Concept

Unused subscription quota is everywhere. You can't share your API key, but "asking someone with quota to do work for you" is fundamentally labor — like asking a designer with Photoshop to make a graphic for a friend.

**How Legate works:**

1. Requester sends a task via GitHub Issue or Telegram
2. Operator's Claude Code receives the task through a Channel plugin
3. AI processes the task in an isolated Docker environment
4. Pushes a PR back to the requester's repo
5. Communication happens in GitHub PR or Telegram

**Free** — This is not a commercial product. It's a community tool.

---

## Architecture Shift: Built on Claude Code Channels

> **2026-03-20 Update**: Claude Code v2.1.80 introduced Channels (research preview), allowing MCP servers to push external messages into a Claude Code session. This changes Legate's architectural foundation.

### Original Design

```
GitHub Issue → Custom Node.js Orchestrator → Docker → PR
```

### New Design (Channel-based)

```
Telegram / GitHub Webhook → Legate Channel Plugin (MCP) → Claude Code → Docker → PR / Telegram reply
```

**Key Advantages:**

| | Old Architecture | New Architecture (Channels) |
|---|---|---|
| Orchestrator | Custom Node.js service | Channel plugin (MCP server) |
| Operator setup | clone repo → npm install → .env → docker build | `claude --channels plugin:legate` |
| Task intake | GitHub Issues only | GitHub + Telegram + Discord |
| Protocol | Custom polling + Octokit | MCP standard protocol |
| Security | Custom allowlist | Channel sender allowlist + pairing |

**Limitations:**
- Channels currently require claude.ai login (no API key support)
- Research preview — custom plugins need `--dangerously-load-development-channels`
- Single-user, single-session — not a multi-tenant service

---

## Overall Blueprint

```
Phase 1 (Now)         Phase 2              Phase 3
Tech validation +     Channel Plugin +     Community rollout +
Core flow             Automation           Multi-user
────────────────── ────────────────── ──────────────────
1-2 weeks             2-3 weeks            Ongoing
Docker working        Plugin packaged      Friends/community try it
```

---

## Phase 1: Tech Validation + Core Flow (1-2 weeks)

> **Goal**: Validate the complete Fork → Docker → Claude Code → PR flow using your own repo
> **Cost**: Existing hardware + Claude quota
> **Acceptance**: Describe task in GitHub Issue → AI processes in Docker → PR appears

### 1.1 Docker Base Image

**Estimate**: 3-4 hours

```
Legate Docker image:

Dockerfile.legate
├── Base: ubuntu:22.04
├── Runtime: Node.js 20 (nvm), Git, gh CLI
├── Claude Code CLI (npm install -g @anthropic-ai/claude-code)
├── Auth: ANTHROPIC_API_KEY env var (not baked into image)
├── User: UID 1000 (non-root)
└── Entrypoint: accepts repo URL + task prompt params

Security:
├── --cap-drop=ALL
├── --security-opt=no-new-privileges
├── --memory=4g --cpus=2
├── --pids-limit=512
├── Network: egress-only (GitHub + npm/pypi)
└── Max runtime: 10min timeout
```

**Acceptance**: `docker run legate-worker "say hello"` → Claude Code responds normally

---

### 1.2 Manual Flow Validation

**Estimate**: 4-5 hours

No automation — manually verify each step:

```
Steps:
□ Prepare test repo (simple Node.js project + CLAUDE.md)
□ Manually fork repo
□ Manually start Docker container:
    docker run \
      -e ANTHROPIC_API_KEY=$KEY \
      -v /tmp/legate-workspace:/workspace \
      --network=legate-net \
      --memory=4g --cpus=2 \
      legate-worker
□ Inside container:
    - git clone fork-url /workspace/repo
    - cd /workspace/repo
    - git checkout -b legate/task-001
    - claude -p "Fix the code based on Issue #1" \
        --allowedTools Read,Edit,Bash,Glob,Grep
    - git add + commit + push
□ Manually open PR to original repo using gh CLI
□ Verify PR content
□ Clean up workspace
```

**Acceptance**: Complete one full fork → code → PR cycle

---

### 1.3 Orchestrator Prototype

**Estimate**: 8-10 hours

Node.js + dockerode automation:

```typescript
// src/legate/LegateOrchestrator.ts

Core flow:
1. receiveTask(repoUrl, issueNumber, taskPrompt)
2. forkRepo(repoUrl) → fork URL
3. createContainer(forkUrl, taskPrompt)
   - Clone repo into workspace
   - Run Claude Code with task prompt
   - Commit changes to new branch
4. submitPR(forkUrl, originalRepoUrl, branch)
   - PR body includes: task description, change summary, file list
   - PR submitted by orchestrator (not the agent inside the container)
5. cleanup(containerId, workspaceVolume)

Dependencies:
  npm install dockerode @octokit/rest
```

**Key Design Decisions:**

- Container only handles clone + code + commit + push
- PR creation by orchestrator outside container (security)
- One disposable volume per task, destroyed after completion
- ANTHROPIC_API_KEY injected via env, never in image or workspace

**Acceptance**: Single command triggers full flow → PR appears

---

### 1.4 Basic Error Handling

**Estimate**: 3-4 hours

```
Scenarios to handle:

□ Clone failure (repo doesn't exist, permission denied)
  → Mark task failed + log

□ Claude Code execution failure (API error, timeout)
  → Kill container + log + clean workspace

□ Push failure (branch conflict)
  → Retry once, mark failed if still fails

□ Container timeout (>10 minutes)
  → SIGKILL + cleanup

□ Disk space
  → Clean workspace after each task completion/failure
```

**Acceptance**: All failure scenarios produce reasonable logs

---

### Phase 1 Completion Criteria

| Metric | Standard |
|--------|----------|
| End-to-end flow | Single command → PR appears |
| Docker isolation | Container cannot access host filesystem |
| Error handling | All failure scenarios logged |
| Cleanup | Workspace zeroed after task |

---

## Phase 2: Channel Plugin + Automation (2-3 weeks)

> **Goal**: Package Legate as a Claude Code Channel plugin, supporting Telegram + GitHub dual intake
> **Acceptance**: Operator runs `claude --channels plugin:legate` → Requester sends task via Telegram → PR appears

### 2.1 Legate Channel Plugin

**Estimate**: 8-10 hours

Build Legate's MCP server based on Claude Code Channels:

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
      You are a Legate operator. When you receive <channel source="legate"> events:
      1. Parse the task (repo URL + description)
      2. Fork repo → process in Docker with Claude Code
      3. Push PR to deliver
      4. Use reply tool to report results
    `,
  },
)
```

**Dual intake design:**

| Intake | Mechanism | For whom |
|--------|-----------|----------|
| Telegram | Built-in Telegram bot polling in Legate Channel | Non-GitHub users |
| GitHub Issue | Built-in GitHub webhook receiver in Legate Channel | Developers |

### 2.2 Telegram Task Intake

**Estimate**: 6-8 hours

```
Requester sends task via Telegram:

1. Requester DMs Legate bot
2. Send format:
   repo: https://github.com/user/project
   task: Fix the login validation bug
3. Legate Channel receives → pushes into Claude Code session
4. Claude Code triggers Docker flow
5. On completion, replies via reply tool with PR link

Simple Q&A (no code changes needed) replies directly via Telegram.
```

### 2.3 GitHub Issue Heartbeat

**Estimate**: 6-8 hours

```
Heartbeat mechanism:

1. Triggers every 5 minutes
2. Scans all tracked repos' Issues
3. Filter criteria:
   - label = "legate"
   - state = "open"
   - NOT already labeled "in-progress"
4. New Issue found:
   - Add "in-progress" label
   - Convert to Channel event, push into Claude Code
5. On completion:
   - PR body includes `Closes #N`
   - Add "pr-ready" label to Issue
```

### 2.4 `.legate/` Specification

**Estimate**: 2-3 hours

Configuration placed by requesters in their repo:

```
.legate/
├── config.yaml          # Basic settings
│   ├── base_branch: main
│   ├── label: legate
│   └── max_task_duration: 10m
├── CLAUDE.md            # AI behavior guide
└── skills/              # Optional Skill files
    └── ...
```

### 2.5 PR Review Loop

**Estimate**: 4-5 hours

```
Requester leaves review comment on PR → AI continues:

1. Heartbeat also scans open PRs for review comments
2. Filter criteria:
   - PR opened by Legate (branch prefix: legate/)
   - Has unresponded review comments
3. Convert to Channel event:
   - Clone existing branch
   - Claude Code reads review comment + makes changes
   - Push to same branch (PR auto-updates)
   - Report result (GitHub comment / Telegram)
```

### 2.6 Concurrency Control

**Estimate**: 3-4 hours

```
Keep it simple:
- Max 2 concurrent containers
- Excess tasks queued (in-memory queue)
- Notify via Telegram / Issue comment: "N tasks ahead in queue"
```

---

### Phase 2 Completion Criteria

| Metric | Standard |
|--------|----------|
| Channel Plugin | `claude --channels plugin:legate` starts successfully |
| Telegram intake | Send task via Telegram → PR appears |
| GitHub intake | Open Issue → processing starts within 5 minutes |
| Review loop | PR comment → AI continues modifying |
| Concurrency | Handle 2 tasks simultaneously |

---

## Phase 3: Community Rollout + Multi-user (Ongoing)

> **Goal**: Friends and community members start using it
> **Acceptance**: 5+ different repos successfully delivered

### 3.1 Onboarding Flow

```
Requester (GitHub user):
1. Create .legate/ in repo root
2. Add config.yaml + CLAUDE.md
3. Notify operator to track your repo
4. Open Issue + add "legate" label
5. Wait for PR

Requester (Telegram user):
1. Add Legate bot as friend
2. Send repo URL + task description
3. Wait for PR link or direct reply

Operator:
1. claude --channels plugin:legate
2. Done.
```

### 3.2 Multi-repo Tracking

```
legate-config.yaml (operator side):

tracked_repos:
  - owner: friend-a
    repo: web-app
  - owner: friend-b
    repo: api-server
```

### 3.3 Quality Feedback

```
After each task:
- Record success/failure
- Record PR review round-trips
- Record task duration
- Requester can leave 👍/👎 on Issue or Telegram feedback

Accumulated data → optimize prompts / skills / flow
```

### 3.4 Monitoring + Stability

```
□ Run Claude Code + Legate channel with PM2 on VPS
□ Health check endpoint
□ Auto-restart on crash
□ Periodic cleanup of orphan containers + volumes
□ API usage monitoring (prevent overuse)
```

---

## Phase 4 (Future Considerations)

| Item | Description |
|------|-------------|
| Official Plugin Marketplace | Submit Legate to claude-plugins-official |
| GitHub Webhook | Replace polling with instant triggers |
| Firecracker microVM | Stronger isolation (replace Docker) |
| Multi-operator network | Multiple operators forming a service mesh |
| Web dashboard | Task status viewer (optional) |
| GitLab support | Expand platform support |

---

## Technical Architecture

```
                    ┌─────────────────────────┐
                    │  Requesters              │
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
                    │  (Operator's machine)    │
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

### Differentiation from OpenClaw

VentureBeat called Claude Code Channels an "OpenClaw killer." But the three serve different purposes:

| | OpenClaw | Claude Code Channels | Legate |
|---|---|---|---|
| Purpose | General AI life assistant | Developer self-use remote control | Quota sharing service |
| Users | Use your own quota for yourself | Use your own quota for yourself | People with quota help those without |
| Platforms | WhatsApp/Tg/Slack/DC etc. | Tg/DC (research preview) | GitHub + Tg |
| Security | Called "biggest insider threat of 2026" | Anthropic brand + sender allowlist | Docker isolation + PR review |
| Open source | Yes | Plugins open, core closed | Yes |

**Legate's unique value: Both Channels and OpenClaw are "use your own quota for yourself." Legate is the only one doing "quota sharing."**

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Channel layer | Sender allowlist + pairing (who can send tasks) |
| Container isolation | cap-drop ALL, non-root, seccomp, pids-limit |
| Network restriction | egress-only (GitHub + npm/pypi allowlist) |
| Time limit | 10min hard timeout → SIGKILL |
| Resource limit | 4GB RAM, 2 CPU cores |
| PR security | Orchestrator submits PR (not the agent inside container) |
| No code retention | Workspace volume destroyed after task |
| Secrets | API Key injected via env, never in image or workspace |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| AI writes bad code | Mandatory PR review, requester decides to merge |
| Prompt injection via repo | Diff review + orchestrator submits PR |
| Prompt injection via Telegram | Sender allowlist + pairing |
| Container escape | Multi-layer defense (cap-drop + seccomp + non-root + namespace) |
| API quota exhaustion | Usage monitoring, daily limits |
| Requester repo not prepared | `.legate/` template + onboarding docs |
| Channels API changes | Research preview stage, track official updates |

---

*Last updated: 2026-03-20*

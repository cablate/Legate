# Legate — Roadmap

> **One-liner**: People with unused AI quota help those who don't have any — community-driven quota sharing
> **Model**: Free quota sharing / community mutual aid
> **Nature**: Spec, guide, and community project — not a runnable service

---

## Core Concept

Unused subscription quota is everywhere. You can't share your API key, but "asking someone with quota to do work for you" is fundamentally labor — like asking a designer with Photoshop to make something for a friend.

**How Legate works:**

1. Requester submits a task via GitHub Issue or another channel
2. Operator (someone with Claude quota) processes it using their own Claude Code
3. Delivered via PR or direct reply
4. Communication happens on GitHub

**Free** — This is not a commercial product. It's a community tool.

---

## Architecture Shift: Built on Claude Code Channels

> **2026-03-20 Update**: Claude Code v2.1.80 introduced Channels (research preview), allowing MCP servers to push external messages into a Claude Code session. This changes Legate's architectural direction.

### Original Design

```
GitHub Issue → Custom Node.js Orchestrator → Docker → PR
```

Required operators to self-host a service and manage Docker — high barrier to entry.

### New Direction (Channel-based)

```
GitHub Issue → Legate Channel Plugin (MCP) → Claude Code (operator's machine) → PR
```

Operators only need to: launch Claude Code + load the Legate Channel plugin. No infrastructure to manage.

**Key Comparison:**

| | Old Architecture | New Architecture (Channels) |
|---|---|---|
| Operator needs | Self-host Node.js + Docker | One command to start Claude Code |
| Task intake | GitHub Issues only | GitHub + extensible |
| Protocol | Custom polling | MCP standard protocol |
| Security model | Custom allowlist | Channel sender allowlist + pairing |

**Current Limitations:**
- Channels currently require claude.ai login (no API key support)
- Research preview — custom plugins need `--dangerously-load-development-channels`
- Single-user, single-session — not a multi-tenant service

---

## Differentiation from OpenClaw / Channels

VentureBeat called Claude Code Channels an "OpenClaw killer." But the three serve different purposes:

| | OpenClaw | Claude Code Channels | Legate |
|---|---|---|---|
| Purpose | General AI life assistant | Developer self-use remote control | Quota sharing service |
| Users | Use your own quota for yourself | Use your own quota for yourself | People with quota help those without |
| Platforms | WhatsApp/Tg/Slack/DC etc. | Tg/DC (research preview) | GitHub Issues (MVP) |
| Open source | Yes | Plugins open, core closed | Yes |

**Legate's unique value: Both Channels and OpenClaw are "use your own quota for yourself." Legate is the only one doing quota sharing.**

---

## Overall Roadmap

```
Phase 1 (Done)       Phase 2 (Current)    Phase 3 (Planned)    Phase 4 (Future)
Channel mechanism    Docs & community     More channel impls   Docker isolation
verified             onboarding           Community growth     Multi-operator network
GitHub Issues MVP
```

---

## Phase 1: Channel Mechanism Verified (Done)

**Goal**: Validate that the core flow — GitHub Issues as task intake → Claude Code processes → PR delivered — is feasible

**Completed:**
- Verified GitHub Issues as a viable task intake mechanism
- Confirmed technical feasibility of Claude Code Channels (research preview)
- Established Legate's core concept and design direction

**Current Security Model:**

Operators currently work within their own Claude Code session. Isolation is at the session level:
- Operators decide which tasks to accept
- The PR flow is a natural security gate (requester reviews before merging)
- Operators take full responsibility for operations on their own machine

Docker isolation is planned for Phase 4, not currently implemented.

---

## Phase 2: Documentation, Guidelines, and Community Onboarding (Current)

**Goal**: Enable willing operators to run Legate independently based on guides; help requesters understand how to submit tasks

**Work items:**

- Operator guide (how to receive and process tasks)
- Requester guide (how to submit a GitHub Issue task)
- Best practices: task description format, PR delivery standards
- Community onboarding documentation
- Channel plugin concept explanation and setup reference

**Acceptance criteria:**
- Someone who has never seen Legate can complete their first task independently using the docs

---

## Phase 3: More Channel Implementations and Community Growth (Planned)

**Goal**: Expand task intake channels; grow the community of operators and requesters

**Planned items:**

- Additional Channel implementations (different task source integrations)
- Community trial usage and feedback collection
- Refine guides and workflows based on real usage
- Community model for multiple operators collaborating

**Acceptance criteria:**
- 5+ different requesters successfully receive task deliveries

---

## Phase 4: Advanced Isolation and Multi-Operator Network (Future)

| Item | Description |
|------|-------------|
| Docker isolation | Secure sandbox on operator's machine to prevent malicious repos from affecting the host |
| Multi-operator network | Multiple operators forming a service mesh with automatic task routing |
| Firecracker microVM | Stronger isolation (replacing Docker) |
| Official Plugin Marketplace | Submit Legate to claude-plugins-official |
| Web dashboard | Task status viewer (optional) |
| Platform expansion | GitLab and other code hosting platforms |

---

## Security Model

### Now (Phase 1-2)

| Layer | Mechanism |
|-------|-----------|
| Task source | GitHub Issues (publicly visible; operator actively chooses to accept) |
| Operational isolation | Claude Code session level (operator's own machine) |
| Delivery safety | PR flow: requester reviews before merging — main branch is never directly affected |
| Trust model | Operator has basic knowledge of requester (community mutual aid, not stranger service) |

### Future (Phase 4)

| Layer | Mechanism |
|-------|-----------|
| Channel layer | Sender allowlist + pairing (who can send tasks) |
| Container isolation | Docker: cap-drop ALL, non-root, seccomp, pids-limit |
| Network restriction | egress-only (GitHub + package registries only) |
| Time limit | Hard timeout → SIGKILL |
| No code retention | Workspace destroyed after task completes |

---

## Risk Matrix

| Risk | Current Assessment | Mitigation |
|------|-------------------|------------|
| AI writes incorrect code | Medium (known risk) | Mandatory PR review; requester decides whether to merge |
| Prompt injection via repo | Low (community mutual aid model; requester is known) | Operator judges task trustworthiness |
| Malicious code affecting operator's machine | Medium (no Docker isolation yet) | Phase 4 Docker isolation; currently relies on operator reviewing tasks |
| API quota exhaustion | Low (operators voluntarily sharing) | Operators self-regulate how many tasks they accept |
| Channels API changes | Medium (research preview) | Track official updates; update docs accordingly |
| Community unable to grow | Medium | Phase 2 focus: lower the barrier to participation |

---

*Last updated: 2026-03-21*

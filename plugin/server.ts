#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "octokit";
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";

// ---------------------------------------------------------------------------
// Config paths
// ---------------------------------------------------------------------------

const CONFIG_DIR = join(homedir(), ".claude", "channels", "github-issues");
const ENV_PATH = join(CONFIG_DIR, ".env");
const ACCESS_PATH = join(CONFIG_DIR, "access.json");
const STATE_PATH = join(CONFIG_DIR, "state.json");
const LOG_PATH = join(CONFIG_DIR, "debug.log");

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    appendFileSync(LOG_PATH, line);
  } catch {}
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrackedRepo {
  owner: string;
  repo: string;
  label: string;
}

interface AccessConfig {
  trackedRepos: TrackedRepo[];
  pollIntervalMs: number;
}

/** Per-issue persistent state */
interface IssueState {
  /** Highest comment ID we've already processed */
  lastCommentId: number;
  /** Comment IDs posted by this bot (persisted to survive restarts) */
  botCommentIds: number[];
}

interface PersistedState {
  issues: Record<string, IssueState>;
}

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadState(): PersistedState {
  try {
    const raw = readFileSync(STATE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { issues: {} };
  }
}

function saveState(state: PersistedState) {
  ensureConfigDir();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadToken(): string | null {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const content = readFileSync(ENV_PATH, "utf-8");
    const match = content.match(/^GITHUB_TOKEN=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function loadAccess(): AccessConfig {
  try {
    const raw = readFileSync(ACCESS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { trackedRepos: [], pollIntervalMs: 60 * 1000 };
  }
}

function issueKey(owner: string, repo: string, number: number) {
  return `${owner}/${repo}#${number}`;
}

function createOctokit(): Octokit | null {
  const token = loadToken();
  if (!token) return null;
  return new Octokit({ auth: token });
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const mcp = new Server(
  { name: "github-issues", version: "0.1.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
    instructions: [
      'You receive GitHub Issue events via <channel source="github-issues">.',
      "",
      "Each event has these attributes:",
      '- repo: "owner/repo"',
      "- issue: issue number",
      "- author: who opened/commented",
      '- type: "new_issue" or "issue_comment"',
      "- url: link to the issue/comment",
      "",
      "When you receive a new_issue event:",
      "1. Read the issue body to understand the task",
      "2. Work on it using your available tools",
      '3. Use the "reply" tool to post your response/result as a comment on the issue',
      "",
      "When you receive an issue_comment event:",
      "1. Read the comment to understand what is being asked",
      "2. Respond accordingly",
      '3. Use the "reply" tool to post your response',
      "",
      "Always pass the repo and issue number from the channel event to the reply tool.",
    ].join("\n"),
  }
);

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "reply",
      description: "Post a comment on a GitHub Issue or Pull Request.",
      inputSchema: {
        type: "object" as const,
        properties: {
          repo: {
            type: "string",
            description: "Repository in owner/repo format",
          },
          issue_number: {
            type: "number",
            description: "Issue or PR number",
          },
          body: {
            type: "string",
            description: "Comment body (Markdown supported)",
          },
        },
        required: ["repo", "issue_number", "body"],
      },
    },
    {
      name: "add_label",
      description: "Add a label to a GitHub Issue or Pull Request.",
      inputSchema: {
        type: "object" as const,
        properties: {
          repo: {
            type: "string",
            description: "Repository in owner/repo format",
          },
          issue_number: {
            type: "number",
            description: "Issue or PR number",
          },
          label: {
            type: "string",
            description: "Label to add",
          },
        },
        required: ["repo", "issue_number", "label"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const octokit = createOctokit();
  if (!octokit) {
    return {
      content: [
        {
          type: "text",
          text: "Error: GITHUB_TOKEN not configured. Run /github-issues:configure <token> first.",
        },
      ],
    };
  }

  if (req.params.name === "reply") {
    const { repo, issue_number, body } = req.params.arguments as {
      repo: string;
      issue_number: number;
      body: string;
    };
    const [owner, repoName] = repo.split("/");
    const { data: created } = await octokit.rest.issues.createComment({
      owner,
      repo: repoName,
      issue_number,
      body,
    });

    // Persist bot comment ID so we can filter it on future polls (even after restart)
    const state = loadState();
    const key = issueKey(owner, repoName, issue_number);
    if (!state.issues[key]) {
      state.issues[key] = { lastCommentId: 0, botCommentIds: [] };
    }
    state.issues[key].botCommentIds.push(created.id);
    // Also advance the high-water mark past our own comment
    if (created.id > state.issues[key].lastCommentId) {
      state.issues[key].lastCommentId = created.id;
    }
    saveState(state);

    log(`reply: posted comment ${created.id} on ${repo}#${issue_number}`);
    return { content: [{ type: "text", text: "Comment posted." }] };
  }

  if (req.params.name === "add_label") {
    const { repo, issue_number, label } = req.params.arguments as {
      repo: string;
      issue_number: number;
      label: string;
    };
    const [owner, repoName] = repo.split("/");
    await octokit.rest.issues.addLabels({
      owner,
      repo: repoName,
      issue_number,
      labels: [label],
    });
    return { content: [{ type: "text", text: `Label "${label}" added.` }] };
  }

  throw new Error(`Unknown tool: ${req.params.name}`);
});

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

async function pollOnce(octokit: Octokit, access: AccessConfig) {
  const state = loadState();
  let stateChanged = false;

  for (const tracked of access.trackedRepos) {
    const { owner, repo, label } = tracked;

    try {
      const { data: issues } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        labels: label,
        state: "open",
        sort: "updated",
        direction: "desc",
        per_page: 20,
      });

      for (const issue of issues) {
        if (issue.pull_request) continue;

        const key = issueKey(owner, repo, issue.number);
        const issueState = state.issues[key];

        if (!issueState) {
          // ── New issue we've never seen ──
          log(`${key}: NEW ISSUE`);

          // Fetch latest comment to set high-water mark (skip old comments)
          let lastCommentId = 0;
          if (issue.comments && issue.comments > 0) {
            const { data: latest } = await octokit.rest.issues.listComments({
              owner,
              repo,
              issue_number: issue.number,
              per_page: 100,
            });
            if (latest.length > 0) {
              lastCommentId = latest[latest.length - 1].id;
            }
          }

          state.issues[key] = { lastCommentId, botCommentIds: [] };
          stateChanged = true;

          await mcp.notification({
            method: "notifications/claude/channel",
            params: {
              content: `**${issue.title}**\n\n${issue.body ?? "(no body)"}`,
              meta: {
                repo: `${owner}/${repo}`,
                issue: String(issue.number),
                author: issue.user?.login ?? "unknown",
                type: "new_issue",
                url: issue.html_url,
              },
            },
          });
        } else {
          // ── Known issue — check for new comments ──
          // Only fetch comments newer than our high-water mark
          const { data: comments } = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: issue.number,
            per_page: 100,
          });

          const botIds = new Set(issueState.botCommentIds);

          // Filter: id > lastCommentId AND not our own bot comment
          const newComments = comments.filter(
            (c) => c.id > issueState.lastCommentId && !botIds.has(c.id)
          );

          if (newComments.length > 0) {
            log(`${key}: ${newComments.length} new comment(s)`);
          }

          for (const comment of newComments) {
            log(`Pushing comment ${comment.id} by ${comment.user?.login}`);
            await mcp.notification({
              method: "notifications/claude/channel",
              params: {
                content: comment.body ?? "",
                meta: {
                  repo: `${owner}/${repo}`,
                  issue: String(issue.number),
                  author: comment.user?.login ?? "unknown",
                  type: "issue_comment",
                  url: comment.html_url ?? issue.html_url,
                  comment_id: String(comment.id),
                },
              },
            });
          }

          // Update high-water mark to highest comment ID seen (including bot's)
          if (comments.length > 0) {
            const maxId = Math.max(...comments.map((c) => c.id));
            if (maxId > issueState.lastCommentId) {
              issueState.lastCommentId = maxId;
              stateChanged = true;
            }
          }
        }
      }
    } catch (err) {
      log(
        `Error polling ${owner}/${repo}: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  if (stateChanged) {
    saveState(state);
  }
}

async function startPolling() {
  const access = loadAccess();

  if (access.trackedRepos.length === 0) {
    log("No tracked repos. Use /github-issues:access add <owner/repo> to add one.");
    return;
  }

  log(`Polling ${access.trackedRepos.length} repo(s) every ${access.pollIntervalMs / 1000}s`);

  // Initial poll
  const octokit = createOctokit();
  if (!octokit) {
    log("No GITHUB_TOKEN found. Configure with /github-issues:configure <token>");
    return;
  }
  await pollOnce(octokit, access);

  // Recurring poll — refresh token + access each cycle
  setInterval(async () => {
    try {
      const freshOctokit = createOctokit();
      if (!freshOctokit) {
        log("GITHUB_TOKEN not available, skipping poll");
        return;
      }
      const freshAccess = loadAccess();
      await pollOnce(freshOctokit, freshAccess);
    } catch (err) {
      log(`Poll error: ${err instanceof Error ? err.message : err}`);
    }
  }, access.pollIntervalMs);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

await mcp.connect(new StdioServerTransport());
startPolling();

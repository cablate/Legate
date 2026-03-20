#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "octokit";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ---------------------------------------------------------------------------
// Config paths
// ---------------------------------------------------------------------------

const CONFIG_DIR = join(homedir(), ".claude", "channels", "github-issues");
const ENV_PATH = join(CONFIG_DIR, ".env");
const ACCESS_PATH = join(CONFIG_DIR, "access.json");

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

interface SeenState {
  issues: Record<string, number>;
  /** Comment IDs posted by this bot (to filter our own replies) */
  myCommentIds: Set<number>;
}

const seen: SeenState = { issues: {}, myCommentIds: new Set() };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

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
    return { trackedRepos: [], pollIntervalMs: 5 * 60 * 1000 };
  }
}

function issueKey(owner: string, repo: string, number: number) {
  return `${owner}/${repo}#${number}`;
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const mcp = new Server(
  { name: "github-issues", version: "0.0.1" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
    instructions: [
      "You receive GitHub Issue events via <channel source=\"github-issues\">.",
      "",
      "Each event has these attributes:",
      "- repo: \"owner/repo\"",
      "- issue: issue number",
      "- author: who opened/commented",
      "- type: \"new_issue\" or \"issue_comment\"",
      "- url: link to the issue/comment",
      "",
      "When you receive a new_issue event:",
      "1. Read the issue body to understand the task",
      "2. Work on it using your available tools",
      "3. Use the \"reply\" tool to post your response/result as a comment on the issue",
      "",
      "When you receive an issue_comment event:",
      "1. Read the comment to understand what is being asked",
      "2. Respond accordingly",
      "3. Use the \"reply\" tool to post your response",
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
  const token = loadToken();
  if (!token) {
    return {
      content: [
        {
          type: "text",
          text: "Error: GITHUB_TOKEN not configured. Run /github-issues:configure <token> first.",
        },
      ],
    };
  }
  const octokit = new Octokit({ auth: token });

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
    seen.myCommentIds.add(created.id);
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
        // Skip pull requests (GitHub API returns PRs in issues endpoint)
        if (issue.pull_request) continue;

        const key = issueKey(owner, repo, issue.number);
        const prevComments = seen.issues[key];

        if (prevComments === undefined) {
          // New issue
          seen.issues[key] = issue.comments ?? 0;

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
        } else if (
          issue.comments !== undefined &&
          issue.comments > prevComments
        ) {
          // New comments on known issue
          const { data: comments } = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: issue.number,
            since: new Date(
              Date.now() - access.pollIntervalMs * 1.5
            ).toISOString(),
            per_page: 10,
          });

          for (const comment of comments) {
            // Skip comments posted by this bot instance
            if (seen.myCommentIds.has(comment.id)) continue;

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

          seen.issues[key] = issue.comments;
        }
      }
    } catch (err) {
      console.error(
        `[github-issues] Error polling ${owner}/${repo}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
}

async function startPolling() {
  const token = loadToken();
  if (!token) {
    console.error(
      "[github-issues] No GITHUB_TOKEN found. Configure with /github-issues:configure <token>"
    );
    return;
  }

  const octokit = new Octokit({ auth: token });
  const access = loadAccess();

  if (access.trackedRepos.length === 0) {
    console.error(
      "[github-issues] No tracked repos. Use /github-issues:access add <owner/repo> to add one."
    );
    return;
  }

  console.error(
    `[github-issues] Polling ${access.trackedRepos.length} repo(s) every ${access.pollIntervalMs / 1000}s`
  );

  // Initial poll
  await pollOnce(octokit, access);

  // Recurring poll
  setInterval(async () => {
    const freshAccess = loadAccess();
    await pollOnce(octokit, freshAccess);
  }, access.pollIntervalMs);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

await mcp.connect(new StdioServerTransport());
startPolling();

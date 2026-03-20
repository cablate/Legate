# GitHub Issues Channel Plugin for Claude Code

將 GitHub Issues 事件推入 Claude Code session 的 Channel plugin。

## 功能

- **自動偵測**：定時掃描追蹤的 repo，偵測帶有指定 label 的新 Issue
- **雙向溝通**：Claude 可透過 reply tool 在 Issue 留 comment
- **狀態持久化**：重啟後不會重複推送已處理的事件
- **Bot comment 過濾**：自動過濾 bot 自己留的 comment

## 安裝

### 開發模式

```bash
cd /path/to/Legate/plugin
bun install
```

在專案根目錄的 `.mcp.json`：

```json
{
  "mcpServers": {
    "github-issues": {
      "command": "bun",
      "args": ["run", "--cwd", "./plugin", "--shell=bun", "--silent", "start"]
    }
  }
}
```

### 設定

1. **GitHub Token**：

```bash
# 在 Claude Code 中
/github-issues:configure <your-github-pat>
```

或手動建立 `~/.claude/channels/github-issues/.env`：

```
GITHUB_TOKEN=ghp_your_token_here
```

2. **追蹤 Repo**：

```bash
# 在 Claude Code 中
/github-issues:access add owner/repo
```

或手動建立 `~/.claude/channels/github-issues/access.json`：

```json
{
  "trackedRepos": [
    { "owner": "cablate", "repo": "Legate", "label": "legate" }
  ],
  "pollIntervalMs": 60000
}
```

### 啟動

```bash
claude --dangerously-load-development-channels server:github-issues
```

## Tools

| Tool | 說明 |
|------|------|
| `reply` | 在 Issue/PR 留 comment |
| `add_label` | 加 label 到 Issue/PR |

## 儲存位置

| 檔案 | 路徑 | 用途 |
|------|------|------|
| Token | `~/.claude/channels/github-issues/.env` | GitHub PAT |
| 追蹤設定 | `~/.claude/channels/github-issues/access.json` | 追蹤的 repo 列表 |
| 狀態 | `~/.claude/channels/github-issues/state.json` | 已處理的 comment 記錄 |
| Log | `~/.claude/channels/github-issues/debug.log` | 除錯日誌 |

## License

MIT

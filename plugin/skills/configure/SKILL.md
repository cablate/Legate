# /github-issues:configure

Configure the GitHub token for the GitHub Issues channel.

## Usage

### No arguments — show status

Read the current configuration:
1. Check if GITHUB_TOKEN exists in ~/.claude/channels/github-issues/.env (show first 10 chars if set, masked)
2. Read tracked repos from access.json
3. Show poll interval
4. Provide next steps based on current state

### With token — save it

```
/github-issues:configure <github-pat-token>
```

1. Create ~/.claude/channels/github-issues/ directory if needed
2. Write GITHUB_TOKEN=<token> to .env (no quotes, no extra whitespace)
3. Confirm the token was saved
4. Note: the server reads .env at boot — restart Claude Code or run /reload-plugins to pick up changes

### clear — remove the token

```
/github-issues:configure clear
```

Remove the GITHUB_TOKEN line from .env.

## Important

- The token needs repo scope to read issues and post comments
- For private repos, ensure the token has access to those repos
- Never echo the full token back to the user — show only the first 10 characters

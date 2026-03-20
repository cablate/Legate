# 代勞者指南

> 給代勞者（Legate operator）的設定與操作手冊。

---

## 你需要什麼

| 項目 | 說明 |
|------|------|
| **Claude Max 訂閱** | Channels 需要 claude.ai 登入（不支援 API key） |
| **Claude Code** | v2.1.80+（支援 Channels） |
| **Bun** | Channel plugin runtime（[安裝](https://bun.sh)） |
| **GitHub 帳號** | 需要 Personal Access Token（PAT） |
| **Docker**（Phase 2） | 任務隔離用，Phase 1 可先不裝 |

---

## 快速開始

### 1. 安裝 Legate Channel Plugin

在 Claude Code 內：

```
/plugin install legate@claude-plugins-official
```

> 如果 plugin 找不到，先加 marketplace：
> `/plugin marketplace add anthropics/claude-plugins-official`

### 2. 設定 GitHub Token

```
/github-issues:configure <your-github-pat>
```

PAT 需要的權限：
- Issues：Read and write
- Pull requests：Read and write
- Contents：Read
- Metadata：Read

Token 存放在 `~/.claude/channels/github-issues/.env`。

### 3. 追蹤 Repo

```
/github-issues:access add owner/repo
```

或手動編輯 `~/.claude/channels/github-issues/access.json`：

```json
{
  "trackedRepos": [
    { "owner": "friend-name", "repo": "their-project", "label": "legate" }
  ],
  "pollIntervalMs": 60000
}
```

### 4. 啟動

```bash
claude --channels plugin:legate
```

就這樣。你的 Claude Code 現在會自動：
- 掃描追蹤 repo 的 GitHub Issues（帶 `legate` label）
- 接收任務，處理，在 Issue 留 comment 回報

---

## 開發模式（尚未發布到 marketplace 時）

```bash
cd /path/to/Legate
claude --dangerously-load-development-channels server:github-issues
```

這會讀取專案根目錄的 `.mcp.json`，直接從原始碼啟動 plugin。

---

## 追蹤新 Repo

有人請你幫忙時：

1. **確認對方的 repo 有 `.legate/`** — 至少要有 `config.yaml` + `CLAUDE.md`。沒有的話請對方先按 [legate-spec.md](legate-spec.md) 設定。
2. **加入追蹤列表** — `/github-issues:access add owner/repo`
3. **對方開 Issue** — 加上 `legate` label，下一次 polling 就會偵測到。

---

## 日常操作

### 查看狀態

- **Polling log**：`~/.claude/channels/github-issues/debug.log`
- **State**：`~/.claude/channels/github-issues/state.json`（已處理的 Issue/Comment 記錄）

### 手動重置

如果 state 出問題（重複推送、漏掉事件），可以刪掉 state 重來：

```bash
rm ~/.claude/channels/github-issues/state.json
```

下次 polling 會重新建立 state（已有的 Issue 會被偵測為「新」，但 comment 高水位會設在最新）。

---

## 額度消耗

每個任務大約消耗：

| 任務類型 | Token 估計 | 費用估計（API） |
|---------|-----------|----------------|
| 簡單 bug fix | 50K-100K | ~$0.15-$0.50 |
| 中型功能 | 100K-200K | ~$0.50-$2 |
| 複雜修改 | 200K+ | ~$2-$5 |

> 使用 Max 訂閱時不另外計費（用你的月額度）。使用 API Key 時按 token 計費。

---

## 安全注意事項

1. **只追蹤你信任的人的 repo** — AI 會讀取 repo 內容，惡意 repo 可能含 prompt injection
2. **Channel sender gating** — 只有 allowlist 內的人能透過 Channel 發任務
3. **PAT scope 最小化** — 只給必要的權限
4. **定期輪換 Token** — PAT 和 bot token 都要定期換

### 未來：Docker 隔離（Phase 2）

Phase 2 會加入 Docker 隔離，讓每個任務在獨立容器中執行：

```bash
--cap-drop=ALL
--security-opt=no-new-privileges
--memory=4g --cpus=2
--pids-limit=512
--user 1000:1000
```

目前 Phase 1 的任務直接在 Claude Code session 中執行（跟你平常用 Claude Code 一樣的隔離等級）。

---

## 故障排除

### Issue 沒被偵測到

1. 確認 Issue 有正確的 label（預設 `legate`）
2. 確認 repo 在 `access.json` 的 `trackedRepos` 裡
3. 查看 `debug.log` 有沒有 polling 記錄
4. 確認 PAT 有讀取 Issues 的權限

### Comment 沒被偵測到

1. 查看 `state.json` 的 `lastCommentId` 是否正確
2. Bot 自己的 comment 會被過濾（存在 `botCommentIds`）
3. 確認 polling interval 內有新的 poll tick

### Plugin 啟動失敗

1. 確認 `bun --version` 能正常執行
2. 確認 `.mcp.json` 格式正確
3. 開發模式下確認從 Legate 專案根目錄啟動

---

## 成為好的代勞者

- **回應有品質的任務** — CLAUDE.md 寫得好的 repo，AI 結果會更好
- **幫委託者改善 CLAUDE.md** — 如果 AI 結果不理想，建議對方補充專案資訊
- **監控額度** — 不要讓月額度被單一 repo 吃光
- **保持工具更新** — Claude Code、Bun、plugin 都要定期更新

---

*最後更新：2026-03-21*

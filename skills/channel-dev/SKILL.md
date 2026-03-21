---
name: channel-dev
description: |
  Claude Code Channel Plugin 開發知識。觸發時機：需要將現有 MCP Server 改造為 Channel、
  開發新的 Channel plugin、除錯 Channel 推送/接收問題、或評估某個平台是否適合做成 Channel 時。
  涵蓋：Channel 機制本質、改造核心原則、安全模型。
  主動更新時機：Channel 協議有新版本變動、或完成新平台 Channel 實作時更新 references/。
---

# Channel Plugin 開發知識

## Channel 的本質

Channel = 宣告了 `claude/channel` capability 的 MCP Server。

普通 MCP Server 是被動的（Claude 呼叫 tools），Channel 多了主動能力（推事件給 Claude）。你的現有 tools 全部保留，改動量 ~10 行。

**一句話：Channel 不是新東西，是 MCP Server 的能力擴充。**

## 三條核心原則

### 原則一：stdout 是神聖的

Channel 透過 stdio transport 與 Claude Code 通訊。stdout 是 MCP 協議的通道——任何非 MCP 的 stdout 輸出都會破壞 session。

- `console.log()` = 炸彈。用 `console.error()`（stderr）或寫 log 檔
- stderr 在 Claude Code UI 中**看不到**，所以除錯建議寫檔

### 原則二：驗 sender，不是驗 room

未經驗證的 Channel = prompt injection 向量。Sender gating 是安全底線。

- 群組場景中 `message.from.id ≠ message.chat.id`
- 只驗 chat/room ID → 群組裡所有人都能注入
- **必須驗證 sender ID**，靜默丟棄未授權的訊息

### 原則三：State 必須持久化

Polling 模式的 Channel 重啟後 in-memory state 歸零，會重複推送。

- 追蹤 `lastProcessedId`，持久化到磁碟（JSON 檔）
- 過濾自己的回覆：比對 authenticated user ID 或 bot comment ID 列表
- ❌ 用 comment 數量差判斷新訊息（不可靠，自己的回覆也算）
- ❌ 靠 `performed_via_github_app` 過濾（PAT 認證的 bot 不帶此標記）

## 改造 Checklist（最小必要改動）

1. **capability 宣告** — `experimental: { 'claude/channel': {} }`
2. **notification 推送** — `mcp.notification({ method: 'notifications/claude/channel', params: { content, meta } })`
3. **instructions** — 告訴 Claude 事件格式、meta 含義、用哪個 tool 回覆
4. **reply tool** — 如果現有 MCP Server 已有 sendMessage/createComment，直接復用
5. **sender gating** — allowlist + pairing/config
6. **stdio transport** — `StdioServerTransport`，不支援 HTTP/SSE

詳細程式碼範例見 `references/code-examples.md`。

## 決策樹

```
你有一個現有的 MCP Server
│
├── 已有需要的 tools（reply、send 等）？
│   ├── 是 → 只加 capability + polling/webhook + notification（不動 tools）
│   └── 否 → 加 capability + 寫新的 reply tool
│
├── 平台支援 webhook？
│   ├── 是 → HTTP listener（即時，不耗 API quota）
│   └── 否 → polling（定時掃描）→ 必須持久化 state
│
└── 使用者從公開場所發訊息？
    ├── 是 → 必須實作 sender gating
    └── 否（只有自己用）→ 建議還是加
```

## Notification 格式

```typescript
await mcp.notification({
  method: 'notifications/claude/channel',  // 固定值
  params: {
    content: '事件內容（字串，支援 Markdown）',
    meta: { key: 'value' },  // 每個 key 變成 <channel> tag 的屬性
  },
})
```

Claude 收到：`<channel source="your-channel" key="value">事件內容</channel>`

- `source` 由 Claude Code 自動填入（= server name）
- `meta` key 只能用字母/數字/底線（連字號 `-` 被靜默丟棄）

## 已知限制

- **只在 session 開啟時接收**：Claude Code 關閉期間的事件會遺失
- **需 claude.ai 登入**：不支援 API key 認證
- **Research Preview**：協議細節可能隨版本更新變動
- **開發階段需 flag**：`claude --dangerously-load-development-channels server:<name>`（per-entry bypass）

## 參考資源

- 程式碼範例與打包結構 → `references/code-examples.md`
- 官方文件連結 → `references/official-refs.md`

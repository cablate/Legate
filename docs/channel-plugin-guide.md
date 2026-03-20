# 將現有 MCP Server 改造為 Claude Code Channel Plugin

> 本文件適用於：已有一個能用的 MCP Server（GitHub、LINE、Slack、Discord 等），想讓它支援 Claude Code Channel 的開發者。
>
> 不涉及：具體的業務邏輯（監聯什麼訊息、如何過濾）。那是各平台自己的事。
>
> 前提：Claude Code v2.1.80+，需 claude.ai 登入（不支援 API key 認證）。

---

## 概念：MCP Server vs Channel

| | 普通 MCP Server | Channel |
|---|---|---|
| 方向 | **被動** — Claude 呼叫它的 tools | **主動** — 它推事件給 Claude |
| 能力 | 提供 tools（搜尋、建立、修改等） | 監聽外部系統，推 notification |
| 觸發 | Claude 決定何時呼叫 | 外部事件到達時自動推送 |
| 用途 | 工具箱 | 守衛 / 橋樑 |

**Channel 就是一個宣告了 `claude/channel` capability 的 MCP Server。** 你的現有 tools 全部保留，只是多了「主動推事件」的能力。

---

## 改造 Checklist

### 1. 宣告 Channel Capability

在 `Server` constructor 的 `capabilities` 裡加一行：

```typescript
const mcp = new Server(
  { name: 'your-channel', version: '0.0.1' },
  {
    capabilities: {
      // ✅ 加這行：告訴 Claude Code 這是一個 Channel
      experimental: { 'claude/channel': {} },
      // ✅ 如果有 tools（reply 等），保留這行
      tools: {},
    },
    // ✅ 加 instructions：告訴 Claude 如何處理你的事件
    instructions: '你的 channel 事件說明...',
  },
)
```

**就這樣。** `experimental: { 'claude/channel': {} }` 是唯一讓 MCP Server 變成 Channel 的開關。值永遠是空物件 `{}`。

### 2. 推送事件（Notification）

當外部事件到達時，呼叫 `mcp.notification()`：

```typescript
await mcp.notification({
  method: 'notifications/claude/channel',  // 固定值
  params: {
    content: '事件內容（純文字或 Markdown）',
    meta: {                                // 可選，每個 key 變成 <channel> tag 的屬性
      chat_id: '12345',
      author: 'username',
      type: 'new_message',
    },
  },
})
```

Claude 收到的格式：

```xml
<channel source="your-channel" chat_id="12345" author="username" type="new_message">
事件內容（純文字或 Markdown）
</channel>
```

**注意事項：**
- `source` 屬性由 Claude Code 自動從 server name 填入，你不用設
- `meta` 的 key 只能用字母、數字、底線。含連字號（`-`）的 key 會被靜默丟棄
- `content` 是字串，不是物件

### 3. 寫 Instructions

`instructions` 會被注入 Claude 的 system prompt。這是 Claude 理解你的事件的唯一依據。必須包含：

```typescript
instructions: `
  事件從 <channel source="your-channel"> 到達。

  屬性說明：
  - chat_id：對話 ID，reply 時要帶回
  - author：發送者
  - type：事件類型（new_message / reply / ...）

  收到事件時：
  1. 讀取內容，理解任務
  2. 執行所需操作
  3. 用 reply tool 回覆，帶上 chat_id
`
```

**好的 instructions 模式：**
- 明確列出 meta 屬性的含義
- 說明哪些屬性要在 reply 時帶回
- 區分事件類型的處理方式
- 說明是否需要回覆（one-way vs two-way）

### 4. Reply Tool（雙向 Channel）

如果需要 Claude 回覆（chat bridge 場景），暴露一個標準 MCP tool：

```typescript
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// 工具列表
mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'reply',
    description: '回覆到外部平台',
    inputSchema: {
      type: 'object',
      properties: {
        chat_id: { type: 'string', description: '要回覆的對話 ID' },
        text:    { type: 'string', description: '回覆內容' },
      },
      required: ['chat_id', 'text'],
    },
  }],
}))

// 工具實作
mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === 'reply') {
    const { chat_id, text } = req.params.arguments as { chat_id: string; text: string }
    await yourPlatform.send(chat_id, text)  // 你的平台 SDK
    return { content: [{ type: 'text', text: 'sent' }] }
  }
  throw new Error(`unknown tool: ${req.params.name}`)
})
```

**Reply tool 不是 Channel 特有的。** 它就是一個普通的 MCP tool。Channel 特有的只有 notification。

如果你的現有 MCP Server 已經有 `sendMessage` / `createComment` 之類的 tool，那就直接用它們當 reply tool，不需要另外寫。只要在 instructions 裡告訴 Claude 用哪個 tool 回覆即可。

### 5. Sender Gating（安全）

**未經驗證的 Channel = prompt injection 向量。** 在呼叫 `mcp.notification()` 之前，檢查發送者身分：

```typescript
const allowed = new Set(loadAllowlist())

// 在你的訊息處理邏輯中，推送前檢查：
if (!allowed.has(message.sender_id)) {
  return  // 靜默丟棄
}
await mcp.notification({ ... })
```

**重要：驗證 sender，不是 room/channel。** 群組場景中 `message.from.id ≠ message.chat.id`，只驗 chat ID 會讓群組裡所有人都能注入。

常見的 allowlist bootstrap 方式：
- **Pairing**（Telegram/Discord 做法）：使用者 DM bot → bot 回覆 pairing code → 使用者在 Claude Code 輸入 code → 加入 allowlist
- **Config file**：直接在設定檔寫 allowed sender IDs
- **OAuth**：透過 OAuth flow 驗證身分

### 6. Transport：必須用 stdio

Channel 跟 Claude Code 之間**只支援 stdio transport**。Claude Code 把你的 server 當 subprocess 啟動，透過 stdin/stdout 通訊：

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

await mcp.connect(new StdioServerTransport())
```

你的 server 要能被 `bun run server.ts` / `node server.js` 直接啟動。不支援 HTTP/SSE transport 連接 Claude Code。

**console.log 會破壞 MCP 協議。** stdout 是 MCP 的通訊管道。除錯用 `console.error`（stderr）或寫到 log 檔。

---

## Plugin 打包結構

要讓別人能 `/plugin install` 安裝你的 channel：

```
your-channel/
├── .claude-plugin/
│   └── plugin.json        # Plugin metadata
├── skills/                 # 可選：使用者指令
│   ├── configure/
│   │   └── SKILL.md        # /your-channel:configure <token>
│   └── access/
│       └── SKILL.md        # /your-channel:access pair <code>
├── .mcp.json               # MCP server 啟動設定
├── package.json            # 依賴宣告
└── server.ts               # 入口
```

### .mcp.json

```json
{
  "mcpServers": {
    "your-channel": {
      "command": "bun",
      "args": ["run", "--cwd", "${CLAUDE_PLUGIN_ROOT}", "--shell=bun", "--silent", "start"]
    }
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` 是 plugin 安裝後的實際路徑，由 Claude Code 自動替換。

### package.json

```json
{
  "name": "claude-channel-your-platform",
  "version": "0.0.1",
  "type": "module",
  "bin": "./server.ts",
  "scripts": {
    "start": "bun install --no-summary && bun server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
    // + 你的平台 SDK
  }
}
```

### plugin.json

```json
{
  "name": "your-channel",
  "description": "Claude Code channel for Your Platform",
  "version": "0.0.1"
}
```

---

## 啟動與測試

### 開發階段

自建的 Channel 不在官方 allowlist 上，需要用 development flag：

```bash
# server: 前綴 → 讀 .mcp.json 裡的 server 定義
claude --dangerously-load-development-channels server:your-channel

# plugin: 前綴 → 讀 plugin 打包格式
claude --dangerously-load-development-channels plugin:your-channel@your-marketplace
```

**注意：development flag 是 per-entry 的。** 只有 `--dangerously-load-development-channels` 後面直接指定的 entry 會繞過 allowlist。如果你同時用 `--channels` 指定其他 channel，那些不會被繞過。兩者的 bypass 範圍互不影響。

### 正式發布

提交到 `anthropics/claude-plugins-official` 通過安全審查後，使用者可以：

```bash
/plugin install your-channel@claude-plugins-official
claude --channels plugin:your-channel@claude-plugins-official
```

### 權限設定

Channel 的 tools 需要被 Claude Code 允許。在專案的 `.claude/settings.json`：

```json
{
  "permissions": {
    "allow": ["mcp__your-channel__*"]
  }
}
```

---

## 常見踩坑

### stdout 汙染

```
❌ console.log('debug info')   → 破壞 MCP 協議，session 直接掛掉
✅ console.error('debug info') → 輸出到 stderr，不影響 MCP
✅ writeFileSync('debug.log')  → 寫到檔案
```

但注意：stderr 在 Claude Code UI 中**看不到**。如果需要除錯，寫 log 檔比較可靠。

### meta key 命名

```
❌ meta: { 'chat-id': '123' }   → 連字號被靜默丟棄
✅ meta: { 'chat_id': '123' }   → 底線 OK
✅ meta: { 'chatId': '123' }    → camelCase OK
```

### Polling 重啟後重複推送

如果你的 Channel 用 polling 模式（定時掃描 API），重啟後 in-memory state 歸零，會重複推送已處理的事件。

```
❌ 用 comment 數量差判斷新訊息 → 不可靠（自己的回覆也算）
✅ 追蹤 lastProcessedId → 持久化到磁碟（JSON 檔）
✅ 過濾自己的回覆 → 比對 authenticated user ID，不是靠 performed_via_github_app
```

### Channel 只在 session 開啟時接收

事件只在 Claude Code session 開啟時才會到達。session 關閉期間的事件會遺失。

**Workaround**：如果需要 always-on，把 Claude Code 跑在背景 process 或持久 terminal（如 `tmux`/`screen`）。搭配 `--dangerously-skip-permissions` 可實現完全無人值守，但只在你信任的環境中使用。

如果你的平台支援 webhook，另一個選擇是讓 webhook receiver 在本地排隊，Claude Code 啟動後再推送積壓的事件。

---

## 改造決策樹

```
你有一個現有的 MCP Server
│
├── 它已經有你需要的 tools（reply、send、create 等）？
│   ├── 是 → 只加 Channel capability + polling/webhook + notification
│   │        不需要重新寫 tools
│   └── 否 → 加 Channel capability + 寫新的 reply tool
│
├── 你的平台支援 webhook？
│   ├── 是 → 用 HTTP listener 模式（即時，不耗 API quota）
│   └── 否 → 用 polling 模式（定時掃描 API）
│            → 必須持久化 state 避免重啟重複推送
│
└── 你的使用者會從公開場所發訊息？
    ├── 是 → 必須實作 sender gating（allowlist + pairing）
    └── 否（只有自己用）→ 可以先跳過，但建議還是加
```

---

## 最小改動範例

假設你有一個現成的 Slack MCP Server，已經有 `send_message` tool。要讓它支援 Channel：

```diff
 const mcp = new Server(
   { name: 'slack', version: '1.0.0' },
   {
     capabilities: {
+      experimental: { 'claude/channel': {} },
       tools: {},
     },
+    instructions: `
+      Slack 訊息從 <channel source="slack" channel_id="..." author="..."> 到達。
+      用 send_message tool 回覆，帶上 channel_id。
+    `,
   },
 )

+// 在你現有的 Slack event listener 裡加一行：
+await mcp.notification({
+  method: 'notifications/claude/channel',
+  params: {
+    content: message.text,
+    meta: { channel_id: message.channel, author: message.user },
+  },
+})
```

改動量：~10 行。你的現有 tools 完全不用動。

---

## 參考資料

- [Channels 概念頁](https://code.claude.com/docs/en/channels) — 使用者端文件
- [Channels Reference](https://code.claude.com/docs/en/channels-reference) — 開發者技術規格
- [Telegram plugin 原始碼](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/telegram) — 完整雙向 Channel 實作參考
- [Discord plugin 原始碼](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/discord) — 另一個完整參考
- [fakechat plugin](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/fakechat) — 最小可用範例（含 Web UI）

---

*基於 Claude Code v2.1.80 Channel research preview。協議細節可能隨版本更新變動。*
*最後更新：2026-03-21*

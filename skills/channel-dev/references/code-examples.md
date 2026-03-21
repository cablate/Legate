# Channel Plugin 程式碼範例

## 最小改動範例（現有 MCP Server → Channel）

假設你有一個 Slack MCP Server，已有 `send_message` tool：

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

## Capability 宣告

```typescript
const mcp = new Server(
  { name: 'your-channel', version: '0.0.1' },
  {
    capabilities: {
      experimental: { 'claude/channel': {} },  // 唯一開關，值永遠是空物件
      tools: {},
    },
    instructions: '...', // 或用陣列 .join('\n')
  },
)
```

## Instructions 寫法模式

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

好的 instructions 包含：
- meta 屬性含義
- 哪些屬性要在 reply 時帶回
- 區分事件類型的處理方式
- 是否需要回覆（one-way vs two-way）

## Reply Tool（雙向 Channel）

如果現有 MCP Server 已有 sendMessage / createComment 之類的 tool，直接復用。只要在 instructions 裡告訴 Claude 用哪個 tool 回覆。

新建 reply tool：

```typescript
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

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

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === 'reply') {
    const { chat_id, text } = req.params.arguments as { chat_id: string; text: string }
    await yourPlatform.send(chat_id, text)
    return { content: [{ type: 'text', text: 'sent' }] }
  }
  throw new Error(`unknown tool: ${req.params.name}`)
})
```

## Sender Gating

```typescript
const allowed = new Set(loadAllowlist())

// 推送前檢查：
if (!allowed.has(message.sender_id)) {
  return  // 靜默丟棄
}
await mcp.notification({ ... })
```

Allowlist bootstrap 方式：
- **Pairing**：DM bot → bot 回覆 code → 使用者輸入 code → 加入 allowlist
- **Config file**：直接寫 allowed sender IDs
- **OAuth**：透過 OAuth flow 驗證

## Transport

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
await mcp.connect(new StdioServerTransport())
```

## Plugin 打包結構

```
your-channel/
├── .claude-plugin/
│   └── plugin.json        # { name, description, version }
├── skills/                 # 可選：使用者指令
│   ├── configure/
│   │   └── SKILL.md        # /your-channel:configure <token>
│   └── access/
│       └── SKILL.md        # /your-channel:access pair <code>
├── .mcp.json               # MCP server 啟動設定
├── package.json
└── server.ts
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

`${CLAUDE_PLUGIN_ROOT}` 由 Claude Code 自動替換為 plugin 安裝路徑。

### 權限設定（.claude/settings.json）

```json
{
  "permissions": {
    "allow": ["mcp__your-channel__*"]
  }
}
```

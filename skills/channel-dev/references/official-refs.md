# Channel Plugin 官方參考

## 文件連結

- [Channels 概念頁](https://code.claude.com/docs/en/channels) — 使用者端文件
- [Channels Reference](https://code.claude.com/docs/en/channels-reference) — 開發者技術規格
- [Telegram plugin 原始碼](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/telegram) — 完整雙向 Channel 實作參考
- [Discord plugin 原始碼](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/discord) — 另一個完整參考
- [fakechat plugin](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/fakechat) — 最小可用範例（含 Web UI）

## 版本追蹤

| 版本 | 日期 | Channel 相關變動 |
|------|------|-----------------|
| v2.1.80 | 2026-03 | Channel 首次引入（Research Preview） |

## 技術規格摘要

- Transport：僅支援 stdio
- 認證：需 claude.ai 登入（不支援 API key）
- Capability：`experimental: { 'claude/channel': {} }`
- Notification method：`notifications/claude/channel`
- Meta key 限制：僅字母/數字/底線
- `source` 屬性：自動從 server name 填入

*基於 Claude Code v2.1.80 Research Preview。協議細節可能隨版本更新變動。*

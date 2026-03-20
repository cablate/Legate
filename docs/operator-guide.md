# 代勞者指南

> 給代勞者（Legate operator）的設定與操作手冊。

---

## 你需要什麼

| 項目 | 說明 |
|------|------|
| **Claude Max 訂閱** | Channels 需要 claude.ai 登入（不支援 API key） |
| **Claude Code** | v2.1.80+（支援 Channels） |
| **GitHub 帳號** | 需要 Personal Access Token（PAT） |

---

## 基本概念

Legate 讓你把自己的 Claude AI 額度「借」給需要幫助的人。委託者把任務放進某個「Channel」（任務傳遞管道），你的 Claude Code 接收任務、執行、回報結果。

Channel 定義了任務從哪裡來、怎麼傳、怎麼確認完成。目前的參考實作是 **GitHub Issues Channel**：任務以 GitHub Issue 的形式發出，結果以 comment 回報。你可以基於相同模式實作其他 Channel（如 Slack、Telegram、email）。

---

## 環境設定

### 1. 安裝 Claude Code

按照 [Claude Code 官方文件](https://docs.anthropic.com/claude-code) 安裝並登入你的 Claude Max 帳號。

### 2. 設定 GitHub Token（GitHub Issues Channel 用）

前往 GitHub → Settings → Developer settings → Personal access tokens，建立新 token：

**需要的權限：**
- Issues：Read and write
- Pull requests：Read and write
- Contents：Read
- Metadata：Read

把 token 儲存在安全的地方（如環境變數或密碼管理器）。

### 3. 決定你要追蹤哪些 Repo

每個委託你幫忙的人，都有一個 GitHub repo。你需要：
- 知道 repo 的 `owner/repo` 路徑
- 對方已在 repo 中建立好任務 label（預設使用 `legate`）

---

## 追蹤新 Repo

有人請你幫忙時：

1. **確認對方的 repo 有 CLAUDE.md** — 這是 AI 理解專案的核心。沒有的話，請對方先補充（專案說明、架構、規範、限制）。CLAUDE.md 寫得越清楚，AI 執行結果越好。
2. **取得 repo 資訊** — `owner/repo` 路徑、使用的 label 名稱
3. **把 repo 加進你的追蹤清單** — 依照你使用的 Channel 實作方式設定
4. **通知對方** — 他們可以開 Issue 並加上指定 label 來發送任務

---

## 日常操作

### 啟動

啟動你的 Claude Code，讓它開始監聽 Channel。GitHub Issues Channel 的參考實作會：
- 定期掃描追蹤 repo 中帶有指定 label 的 Issues
- 將新 Issue 轉為任務，交給 Claude 執行
- 執行結果以 comment 形式回報到 Issue

### 監控

留意：
- 任務是否有被正常接收和回應
- 每個任務的 token 消耗（避免單一委託者吃光月額度）
- 異常的任務（格式奇怪、需要超出授權的操作）

### 額度消耗估計

| 任務類型 | Token 估計 |
|---------|-----------|
| 簡單 bug fix | 50K–100K |
| 中型功能 | 100K–200K |
| 複雜修改 | 200K+ |

> 使用 Max 訂閱時從月額度扣除，不另外計費。

---

## 安全注意事項

1. **只追蹤你信任的人的 repo** — Claude 會讀取 repo 內容並在其中執行操作。惡意 repo 可能包含 prompt injection 攻擊。
2. **最小化 Token 權限** — PAT 只給實際需要的 scope，不要給 admin 或 write 到不相關的資源。
3. **定期輪換 Token** — PAT 應定期更換，尤其是長期閒置後重新啟用時。
4. **審查異常任務** — 任務要求存取外部服務、讀取敏感資料、執行系統指令時，要特別謹慎。

---

## 故障排除

### 任務沒被偵測到

1. 確認 Issue 有加上正確的 label
2. 確認 repo 在你的追蹤清單裡
3. 確認 PAT 有讀取該 repo Issues 的權限
4. 確認 Claude Code 正在運行並監聽

### 任務執行失敗

1. 查看 Issue 上的 comment，通常有錯誤說明
2. 確認委託者的 CLAUDE.md 有足夠的專案資訊
3. 確認 PAT 有執行所需操作的權限（如 PR 需要 write 權限）

### 結果沒有回報

1. 確認 PAT 有寫入 Issues comments 的權限
2. 確認 Claude Code 執行完成後有正常結束

---

## 成為好的代勞者

- **鼓勵委託者完善 CLAUDE.md** — 專案資訊越完整，AI 結果越好，你幫忙的效率越高
- **設定每 repo 的額度上限** — 避免某個 repo 過於頻繁地佔用你的資源
- **保持工具更新** — Claude Code 定期更新，新版本通常有重要的安全修正和功能改進
- **對不確定的任務說不** — 你有權拒絕追蹤任何 repo，不需要說明理由

---

*最後更新：2026-03-21*

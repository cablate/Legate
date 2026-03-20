# Legate 使用規章

> 委託者和代勞者共同遵守的規則，確保互助體驗順暢。

---

## 基本原則

1. **Legate 是互助，不是服務** — 沒有 SLA、沒有保證回應時間、沒有退款。代勞者用自己的額度幫忙，請尊重這份善意。
2. **PR 是交付物，不是承諾** — AI 產出的 PR 不一定完美。委託者有責任 review，代勞者不對 merge 後的結果負責。
3. **任務透過 Channel 進行** — GitHub Issue、Telegram、或其他支援的 Channel。溝通在對應平台上進行，不需要私下聯繫。

---

## 適合 Legate 的任務

### ✅ 適合

| 類型 | 範例 |
|------|------|
| Bug 修復 | 「`calculateTotal` 函式沒有處理空陣列」 |
| 小型功能 | 「新增 GET /health endpoint」 |
| 重構 | 「把 callback 改成 async/await」 |
| 程式碼清理 | 「把所有 console.log 換成 logger」 |
| 測試補充 | 「幫 UserService 補上單元測試」 |
| 文件更新 | 「更新 API 文件，加上新的 endpoint 說明」 |
| 設定調整 | 「把 ESLint 設定改成 flat config」 |

### ❌ 不適合

| 類型 | 原因 |
|------|------|
| 整個專案從零開始 | 範圍太大，AI 需要明確的 codebase 才能工作 |
| 需要存取本機檔案 | 任務在 Claude Code session 中執行，隔離程度與一般使用相同 |
| 需要資料庫 migration | 涉及生產資料，風險太高 |
| 需要 secret/credential | 不要把 API Key 放在 Issue 裡 |
| 涉及安全敏感邏輯 | 認證、加密、權限控制等建議人工處理 |
| 需要 GUI 操作 | 沒有瀏覽器、沒有桌面環境 |
| 超過 10 分鐘的任務 | 任務有時間限制，太大的任務請拆小 |

### 🔶 可能可以（看情況）

| 類型 | 條件 |
|------|------|
| 多檔案修改 | 如果邏輯清楚、CLAUDE.md 寫得好，通常 OK |
| 新增依賴套件 | 需要在 Issue 明確說明要裝什麼 |
| CI/CD 設定 | 需要在 CLAUDE.md 說明現有的 CI 架構 |

---

## 怎麼寫好一個 Issue

好的 Issue = 好的 PR。AI 不會讀心，你給的資訊越精確，結果越好。

### 必要資訊

```markdown
## 任務描述
（清楚描述你要什麼，不要模糊）

## 相關檔案
（列出 AI 需要看/改的檔案路徑）

## 預期行為
（修完之後應該是什麼樣子）
```

### 好的 Issue 範例

```markdown
標題：Fix: calculateTotal returns NaN for empty array

## 任務描述
`src/utils/calculate.ts` 的 `calculateTotal` 函式在收到空陣列時回傳 NaN，
應該回傳 0。

## 相關檔案
- `src/utils/calculate.ts` — 需要修改的函式
- `src/__tests__/calculate.test.ts` — 需要補上空陣列的測試案例

## 預期行為
- `calculateTotal([])` → `0`
- `calculateTotal([10, 20, 30])` → `60`（現有行為不變）
- 測試通過
```

### 不好的 Issue 範例

```
標題：fix bug

幫我修一下那個 bug
```

（什麼 bug？在哪裡？預期行為是什麼？AI 看到這種 Issue 只能猜。）

---

## 品質預期

### AI 做得到的

- 讀懂你的 codebase（尤其是有好的 CLAUDE.md 時）
- 遵循你的 coding style
- 產出可編譯、有基本邏輯正確性的程式碼
- 跑測試（如果你告訴它怎麼跑）
- 一次修改多個檔案

### AI 做不到的（或不穩定的）

- 理解複雜的業務邏輯（除非你在 Issue 或 CLAUDE.md 解釋清楚）
- 處理跨系統的整合（API A 呼叫 API B，B 又依賴 C...）
- 100% 正確——**你必須 review PR**
- 記住上一個 Issue 的脈絡（每個任務是獨立的）

### 品質提升技巧

1. **寫好 CLAUDE.md** — 這是最大的品質槓桿。說明專案架構、coding style、常用指令、測試方式
2. **Issue 寫清楚** — 給出具體檔案路徑、預期行為、邊界條件
3. **任務拆小** — 一個 Issue 做一件事，不要塞太多
4. **善用 PR review** — 第一次 PR 不完美？留 comment，AI 會迭代

---

## 責任歸屬

| 事項 | 誰負責 |
|------|--------|
| Issue 描述清楚 | 委託者 |
| CLAUDE.md 正確 | 委託者 |
| AI 產出的程式碼品質 | 沒有人保證——review 是你的責任 |
| 是否 merge PR | 委託者自行決定 |
| merge 後的後果 | 委託者 |
| AI 額度消耗 | 代勞者自行承擔 |

**重要**：Legate 產出的 PR 等同於「一個新手工程師的初稿」。你不會不 review 就 merge 新手的 code，對 AI 的 PR 也一樣。

---

## 隱私與安全

### 委託者的程式碼

- 你的 repo 是 GitHub 上的公開或私有 repo——Legate 不改變你的存取設定
- 代勞者透過 Fork 存取你的 repo，Fork 的可見性跟原 repo 相同
- **不要在 Issue 中放 secret、API Key、密碼等敏感資訊**

### 代勞者的額度

- 你的 API Key / 訂閱帳號只在你自己的機器上使用
- 不會被分享給委託者或任何第三方
- 每個任務的 token 消耗由你承擔

### AI 的限制

- 任務在 Claude Code session 中執行，隔離程度與一般 Claude Code 使用相同
- 任務有時間限制（預設 10 分鐘），過長的任務請拆小再委託

---

## 禮儀

- 不要同時開太多 Issue——代勞者的額度和機器資源有限
- 不要催——這是免費互助，不是付費服務
- PR 不滿意？友善地留 review comment，不要直接關掉或抱怨
- 感謝代勞者——一個 👍 或 "thanks" 就夠了
- 如果你的 CLAUDE.md 不完整導致 AI 做錯，先改好 CLAUDE.md 再重新開 Issue

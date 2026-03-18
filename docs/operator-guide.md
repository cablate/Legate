# Operator 指南

> 給代勞者（Legate operator）的完整設定與操作手冊。

---

## 你需要什麼

| 項目 | 說明 |
|------|------|
| **機器** | VPS 或本地電腦，需安裝 Docker |
| **Claude 額度** | API Key（Commercial Terms）或 Max 訂閱 |
| **GitHub 帳號** | 需要 Personal Access Token（PAT） |
| **Node.js** | 20+ |

### 硬體建議

| 規格 | 最低 | 建議 |
|------|------|------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| 並發任務 | 1-2 | 2-4 |

Claude Code 在容器內執行時吃記憶體，每個容器分配 2-4 GB RAM。

---

## 環境設定

### 1. 安裝 Docker

```bash
# Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 登出再登入

# 驗證
docker run hello-world
```

### 2. 安裝 Node.js

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
```

### 3. GitHub Personal Access Token

到 [github.com/settings/tokens](https://github.com/settings/tokens) 建立 PAT：

需要的 scope：
- `repo` — 完整 repo 存取（fork, clone, push）
- `workflow` — 如果需要觸發 GitHub Actions

> **安全提醒**：PAT 等同於你的 GitHub 帳號存取權限。不要洩漏，定期輪換。

### 4. Claude 認證

**方案 A：API Key（建議）**

到 [console.anthropic.com](https://console.anthropic.com) 取得 API Key。

```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**方案 B：Max 訂閱**

```bash
# 在有瀏覽器的環境登入
claude auth login

# 如果是 headless VPS，先在本機登入，再複製 auth 檔案到 VPS
scp -r ~/.claude user@vps:~/
```

> **注意**：Max 訂閱用於個人互助是合規的，但不適合大規模商業化。詳見 [feasibility-analysis.md](feasibility-analysis.md)。

---

## 設定 Legate

### 核心設定檔

```yaml
# legate-config.yaml

# Operator 資訊
operator:
  github_user: your-github-username

# 追蹤的 Repo 列表
tracked_repos:
  - owner: friend-a
    repo: web-app
    # 可選覆蓋設定
    max_concurrent: 1
    timeout: 10m

  - owner: friend-b
    repo: api-server

# Heartbeat 設定
heartbeat:
  interval: 5m           # 掃描間隔
  max_concurrent: 2      # 全域最大並發任務數

# Docker 設定
docker:
  image: legate-worker    # Docker image 名稱
  memory: 4g              # 每個容器的記憶體上限
  cpus: 2                 # 每個容器的 CPU 上限
  timeout: 10m            # 任務超時
  network: legate-net     # Docker network 名稱

# 通知（可選）
notification:
  # 任務完成/失敗時通知你
  telegram_bot_token: ""  # 留空 = 不通知
  telegram_chat_id: ""
```

### 環境變數

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxxxx
GITHUB_TOKEN=ghp_xxxxx
```

---

## 追蹤新 Repo

當有人請你幫忙：

### 1. Fork 對方的 Repo

```bash
gh repo fork owner/repo --clone=false
```

或在 GitHub 網頁上按 Fork。

### 2. 加入追蹤列表

```yaml
# legate-config.yaml
tracked_repos:
  - owner: new-friend
    repo: their-project
```

### 3. 驗證 `.legate/` 設定

檢查對方的 repo 是否有 `.legate/` 目錄：
- `config.yaml` 存在且格式正確
- `CLAUDE.md` 存在且有足夠資訊

如果沒有，請對方先按照 [legate-spec.md](legate-spec.md) 設定。

### 4. 重啟 Legate（或等下一次 heartbeat）

Heartbeat 會自動偵測新 repo 的 Issue。

---

## 日常操作

### 啟動

```bash
npm run start
# 或用 PM2
pm2 start npm --name legate -- run start
```

### 查看狀態

```bash
# 查看正在執行的任務
docker ps --filter name=legate

# 查看最近的任務 log
docker logs legate-task-xxx

# 查看 orchestrator log
pm2 logs legate
```

### 手動觸發任務

如果不想等 heartbeat，可以手動觸發：

```bash
npm run task -- --repo owner/repo --issue 42
```

### 停止

```bash
# 停止接受新任務，等當前任務完成
npm run stop --graceful

# 強制停止（會 kill 正在執行的容器）
npm run stop --force
```

---

## 監控

### 額度消耗

每個任務大約消耗：
- 簡單 bug fix：50K-100K tokens ≈ $0.15-$0.50
- 中型功能：100K-200K tokens ≈ $0.50-$2
- 複雜修改：200K+ tokens ≈ $2-$5

建議設定每日上限，避免意外消耗：

```yaml
# legate-config.yaml
limits:
  max_tasks_per_day: 20
  max_tokens_per_task: 500000  # 50 萬 tokens
```

### 磁碟空間

每個任務的 workspace 會在完成後自動清理。但如果任務異常中斷，可能留下 orphan volume：

```bash
# 清理沒有被使用的 volume
docker volume prune -f

# 清理沒有被使用的 image
docker image prune -f
```

建議設定 cron 每天自動清理：

```bash
# /etc/cron.daily/legate-cleanup
#!/bin/bash
docker volume prune -f
docker container prune -f
```

---

## 安全注意事項

### 你在幫陌生人跑 code

即使 Docker 有隔離，也要注意：

1. **只追蹤你信任的人的 repo** — 不要隨便幫陌生人跑
2. **定期檢查 Docker 容器行為** — CPU 異常飆高可能是挖礦
3. **保持 Docker 更新** — 容器逃逸漏洞每年都有
4. **不要在 operator 機器上放敏感資料** — 萬一出事，損失最小化
5. **PAT scope 最小化** — 只給必要的權限

### Docker 安全設定

Legate 預設的容器安全設定：

```bash
--cap-drop=ALL                    # 移除所有 Linux capabilities
--security-opt=no-new-privileges  # 禁止提權
--memory=4g                       # 記憶體上限
--cpus=2                          # CPU 上限
--pids-limit=512                  # 程序數上限
--read-only                       # 唯讀 root filesystem
--tmpfs /tmp:size=100m            # 可寫的 temp 目錄
--user 1000:1000                  # 非 root 執行
```

**不要關閉這些設定**，除非你完全理解後果。

### Network 隔離

```bash
# 建立 Legate 專用 network
docker network create legate-net \
  --driver bridge \
  --opt com.docker.network.bridge.enable_ip_masquerade=true

# 可選：設定 iptables 限制只允許 GitHub + npm
# 這部分依你的 VPS 環境而定
```

---

## 故障排除

### 任務一直失敗

1. 檢查 container log：`docker logs legate-task-xxx`
2. 常見原因：
   - CLAUDE.md 不夠清楚 → 請委託者改善
   - Issue 描述太模糊 → 請委託者補充
   - Repo 太大或太複雜 → 超出 AI 能力範圍
   - API Key 過期或額度用完 → 檢查 console.anthropic.com

### Container 跑太久

- 預設 10 分鐘 timeout
- 如果經常超時，可能是任務太大 → 請委託者拆小
- 或增加 `max_task_duration`（但會消耗更多額度）

### Fork 衝突

- 如果 fork 的 branch 跟原 repo 衝突，Legate 會自動 rebase
- 如果 rebase 失敗，任務會標記失敗，需要手動處理

### Heartbeat 沒偵測到 Issue

- 確認 Issue 有正確的 label（預設 `legate`）
- 確認 repo 在 `tracked_repos` 列表中
- 確認 PAT 有 `repo` scope
- 檢查 orchestrator log

---

## 成為好的 Operator

- **設定合理的並發上限** — 不要把機器跑爆
- **定期檢查任務品質** — 如果某個 repo 的任務一直失敗，跟委託者溝通改善 CLAUDE.md
- **保持環境更新** — Docker、Node.js、Claude Code CLI 都要定期更新
- **監控額度消耗** — 設定每日上限，避免意外
- **備份 config** — `legate-config.yaml` 和 `.env` 是你的核心設定

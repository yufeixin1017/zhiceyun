# Ubuntu 原生部署（不用 Docker）

适用于已经装好 MySQL、且服务器上已有 Cloudflare Tunnel 的主机。相比 Docker，这里直接使用系统 Node.js 与 MySQL，由 systemd 管理进程。

> 端口说明：示例统一使用 **3100**。如果服务器上已有项目占用 3000 或其他端口，请同步修改本指南中的端口、systemd 配置和隧道配置。

## 0. 先检查端口与已有服务

```bash
sudo ss -lntp | grep -E ':(3000|3100|3306)\b' || echo "端口空闲"
systemctl status cloudflared --no-pager || true
sudo cat /etc/cloudflared/config.yml 2>/dev/null || echo "未找到 cloudflared 配置文件"
```

如果 `3100` 已被占用，换一个未使用的端口（后续命令一并替换）。

## 1. 安装 Node.js 22 与 pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v            # 应为 v22.x
sudo npm install -g pnpm@11
pnpm -v
```

## 2. 准备 MySQL

如果服务器已有 MySQL，跳过安装：

```bash
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
```

创建数据库与专用账号（密码请自行替换，建议只用字母和数字）：

```bash
sudo mysql <<'SQL'
CREATE DATABASE IF NOT EXISTS zhiceyun
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'zhiceyun'@'127.0.0.1' IDENTIFIED BY '请替换为数据库密码';
GRANT ALL PRIVILEGES ON zhiceyun.* TO 'zhiceyun'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
```

MySQL 默认只监听 `127.0.0.1`，请勿改成公网监听。

## 3. 放置代码并执行迁移

```bash
sudo mkdir -p /opt/zhiceyun
sudo chown "$USER":"$USER" /opt/zhiceyun
git clone <你的仓库地址> /opt/zhiceyun
cd /opt/zhiceyun
```

按顺序执行迁移（脚本内含 `USE zhiceyun`，可直接执行）：

```bash
for file in database/migrations/00*.sql; do
  echo "执行 $file"
  sudo mysql < "$file" || exit 1
done
```

确认：

```bash
sudo mysql -e "SELECT version FROM zhiceyun.schema_migrations ORDER BY version;"
```

应看到 `001`～`004` 四条记录。

## 4. 安装依赖并构建

```bash
cd /opt/zhiceyun
pnpm install --frozen-lockfile
pnpm build
```

构建完成后应生成 `.next/standalone/server.js` 与 `.next/BUILD_ID`。

## 5. 创建运行用户与配置

```bash
sudo useradd --system --home-dir /opt/zhiceyun --shell /usr/sbin/nologin zhiceyun 2>/dev/null || true
sudo chown -R zhiceyun:zhiceyun /opt/zhiceyun

sudo mkdir -p /etc/zhiceyun
sudo cp deploy/zhiceyun.env.example /etc/zhiceyun/zhiceyun.env
sudo chown root:zhiceyun /etc/zhiceyun/zhiceyun.env
sudo chmod 640 /etc/zhiceyun/zhiceyun.env
sudo nano /etc/zhiceyun/zhiceyun.env
```

必须填写：

```dotenv
DATABASE_URL=mysql://zhiceyun:数据库密码@127.0.0.1:3306/zhiceyun
AI_API_KEY=模型密钥
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
PUBLIC_BASE_URL=https://你的隧道域名
COOKIE_SECURE=true
```

> 如果数据库密码包含 `@ : / ? #` 等字符，必须做 URL 编码，否则连接串会被解析错。

## 6. 安装并启动 systemd 服务

```bash
sudo cp deploy/zhiceyun.service /etc/systemd/system/zhiceyun.service
sudo systemctl daemon-reload
sudo systemctl enable --now zhiceyun
sudo systemctl status zhiceyun --no-pager
```

检查健康状态：

```bash
curl http://127.0.0.1:3100/api/health
```

应返回 `{"status":"ok","database":"connected",...}`。

查看日志：

```bash
sudo journalctl -u zhiceyun -f
```

## 7. 接入已有的 Cloudflare Tunnel

你服务器上已经安装 cloudflared，按现有方式接入即可。

### 情况 A：已有命名隧道（推荐）

查看现有配置：

```bash
sudo cat /etc/cloudflared/config.yml
```

在 `ingress` 中为智测云新增一条主机名规则，放在最后的兜底规则之前：

```yaml
tunnel: <你的隧道 UUID>
credentials-file: /etc/cloudflared/<你的隧道 UUID>.json
ingress:
  - hostname: quiz.example.com        # 你的域名
    service: http://127.0.0.1:3100
  - service: http_status:404
```

保存后重启隧道服务：

```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared --no-pager
```

再把 `PUBLIC_BASE_URL` 改成 `https://quiz.example.com`，重启应用：

```bash
sudo systemctl restart zhiceyun
```

### 情况 B：临时快速隧道

如果只是比赛演示，不配置域名：

```bash
cloudflared tunnel --url http://127.0.0.1:3100
```

把输出的 `https://xxxx.trycloudflare.com` 写入 `/etc/zhiceyun/zhiceyun.env` 的 `PUBLIC_BASE_URL`，然后：

```bash
sudo systemctl restart zhiceyun
```

快速隧道地址每次重启都会变化，变化后需要同步更新配置并重启应用。

## 8. 初始化教师账号

浏览器打开：

```text
https://你的域名/setup
```

创建第一个教师账号。首次初始化会接管数据库中已有的本地数据归属。

后续教师可以用手机号自行注册；如果公网环境不希望开放注册，可在演示前先创建好账号，再按需关闭注册入口。

## 9. 日常运维

```bash
sudo systemctl restart zhiceyun        # 重启
sudo systemctl status zhiceyun         # 状态
sudo journalctl -u zhiceyun -n 200     # 最近日志
```

备份数据库：

```bash
sudo mysqldump -u zhiceyun -p zhiceyun > "backup-$(date +%F-%H%M).sql"
```

升级代码：

```bash
cd /opt/zhiceyun
sudo -u zhiceyun git pull
sudo -u zhiceyun pnpm install --frozen-lockfile
sudo -u zhiceyun pnpm build
sudo systemctl restart zhiceyun
```

新增迁移时，按第 3 节的方式手动执行对应 SQL。

## 10. 与 Docker 方案的取舍

| | 原生部署 | Docker |
|---|---|---|
| 依赖安装 | 需要自己装 Node、MySQL | 一条命令 |
| 端口与配置 | 直接改 systemd/env | 改 compose/env |
| 排错 | 日志直观 | 多一层容器 |
| 升级 | git pull + 重新构建 | 重新 build 镜像 |
| 适用 | 已有 MySQL 与隧道的主机 | 想要环境隔离或迁移频繁 |

两种方式都可以；本机已装 MySQL、且隧道现成的情况下，原生部署改动最少。

## 11. 常见问题

**服务启动后立刻退出？**
`sudo journalctl -u zhiceyun -n 50` 查看原因，常见是 `DATABASE_URL` 密码错误或数据库未启动。

**登录成功但刷新后掉线？**
通过 HTTPS 访问时 `COOKIE_SECURE` 必须为 `true`；纯 HTTP 内网调试则设为 `false`。

**页面能打开但样式丢失？**
确认 `pnpm build` 成功且 `.next/static` 存在；不要在构建未完成时启动服务。

**端口冲突？**
修改 `deploy/zhiceyun.service` 中的 `--port`、隧道配置里的 `service` 地址，以及 `PUBLIC_BASE_URL` 的端口（若对外暴露端口）。
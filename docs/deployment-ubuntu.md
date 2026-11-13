# Ubuntu 主机部署指南

本指南把智测云部署到一台常开的 Ubuntu 主机，学生通过链接或二维码用手机作答，不受同一 Wi-Fi 限制。

> 不想使用 Docker？服务器已有 MySQL 和 cloudflared 时，见 [Ubuntu 原生部署指南](deployment-ubuntu-native.md)，直接安装 Node.js 并用 systemd 托管服务。

## 1. 环境要求

- Ubuntu 22.04 / 24.04（x86_64 或 arm64 均可）；
- Docker Engine 24 以上，含 `docker compose` 插件；
- 能访问外网（拉取镜像、调用大模型接口）；
- 不需要公网 IP，也不需要域名。

安装 Docker：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
newgrp docker
docker compose version
```

## 2. 获取代码

```bash
git clone <你的仓库地址> zhiceyun
cd zhiceyun
```

如果使用私有仓库，请先在服务器配置 SSH Key 或个人访问令牌。

## 3. 配置环境变量

```bash
cp .env.docker.example .env
```

编辑 `.env`：

```dotenv
MYSQL_ROOT_PASSWORD=数据库root强密码
MYSQL_PASSWORD=应用数据库密码
MYSQL_USER=zhiceyun

AI_API_KEY=你的模型密钥
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat

PUBLIC_BASE_URL=
COOKIE_SECURE=true
```

注意事项：

- 两个数据库密码请使用**字母和数字组合**，避免 `@ : / ? #` 等字符破坏连接串；
- `PUBLIC_BASE_URL` 先留空，等第 6 步拿到公网地址后再填；
- `.env` 已被 `.gitignore` 忽略，不会提交到仓库。

## 4. 启动

```bash
docker compose up -d --build
```

首次启动会自动：

1. 创建 MySQL 数据卷；
2. 按 `001`～`004` 顺序执行数据库迁移；
3. 构建并启动应用容器。

检查状态：

```bash
docker compose ps
curl http://127.0.0.1:3000/api/health
```

健康检查应返回 `{"status":"ok","database":"connected",...}`。

## 5. 初始化教师账号

在同一局域网内用浏览器打开：

```text
http://<Ubuntu主机IP>:3000/setup
```

创建第一个教师账号。**该账号会自动接管数据库中已有的本地数据归属**，历史测验不会丢失。

也可以先不建账号，直接进入第 6 步配置公网地址。

## 6. 配置公网访问（学生用流量也能访问）

安装 Cloudflare 隧道客户端：

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update
sudo apt install -y cloudflared
```

启动临时隧道：

```bash
cloudflared tunnel --url http://localhost:3000
```

终端会输出类似地址：

```text
https://random-words-1234.trycloudflare.com
```

把它填入 `.env`：

```dotenv
PUBLIC_BASE_URL=https://random-words-1234.trycloudflare.com
COOKIE_SECURE=true
```

重建应用容器使配置生效：

```bash
docker compose up -d app
```

之后教师结果页的分享链接和二维码都会使用该公网地址，**学生用 4G/5G 即可扫码作答**。

### 让隧道常驻

临时隧道在前台运行，关闭终端就会断开。比赛或课堂期间可以用一条后台命令：

```bash
nohup cloudflared tunnel --url http://localhost:3000 > cloudflared.log 2>&1 &
grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' cloudflared.log | head -1
```

Quick Tunnel 每次重启都会生成新地址，重启后需要同步更新 `PUBLIC_BASE_URL` 并重建容器。需要固定地址时，应改用 Cloudflare 命名隧道并绑定自有域名。

## 7. 日常运维

```bash
docker compose logs -f app     # 查看应用日志
docker compose restart app     # 重启应用
docker compose ps              # 查看运行状态
```

备份数据库：

```bash
docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" zhiceyun' \
  > "backup-$(date +%F-%H%M).sql"
```

恢复备份：

```bash
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" zhiceyun' < backup.sql
```

升级代码：

```bash
git pull
docker compose up -d --build
```

## 8. 安全提醒

- **公网开放后注册接口是公开的**。任何拿到地址的人都能注册教师账号并消耗 AI 额度。演示前建议先注册好账号，必要时临时关闭注册入口或增加邀请码；
- 数据库端口只绑定在 `127.0.0.1`，不要改成 `0.0.0.0`；
- 通过 HTTPS 访问时 `COOKIE_SECURE` 必须为 `true`，纯 HTTP 内网调试可临时设为 `false`；
- 学生数据只填虚拟姓名和学号，不要收集真实敏感信息；
- 定期备份数据卷，`docker compose down -v` 会删除数据库，谨慎执行。

## 9. 常见问题

**数据库迁移没有再次执行？**
`docker-entrypoint-initdb.d` 只在数据卷首次初始化时运行。后续迁移需要手动执行：

```bash
docker compose exec -T db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" zhiceyun \
  < database/migrations/00X_xxx.sql
```

**改了 `.env` 但没生效？**
容器环境变量在创建时确定，需要 `docker compose up -d app` 重建应用容器。

**手机打不开二维码地址？**
先在电脑浏览器直接打开分享链接确认可用；若使用隧道，检查 `cloudflared` 进程是否仍在运行，以及 `PUBLIC_BASE_URL` 是否与当前隧道地址一致。
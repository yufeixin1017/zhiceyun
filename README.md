# 智测云

> 面向高校课堂的 AI 随堂测验生成与自动评阅平台

智测云用于简化随堂测验中的出题、收卷和统计工作。教师输入真实课堂内容后，AI 生成选择、判断和简短填空题；教师审核并发布，学生通过链接或二维码作答，服务端自动评分并生成班级学情分析。

项目仓库：**https://github.com/yufeixin1017/zhiceyun**

## 公网演示与测试账号

- 演示地址：https://luis-gratuit-validation-iii.trycloudflare.com
- 教师手机号：`16666666666`
- 密码：`qwer@1234`

该账号仅用于本次比赛评审，已于 2026 年 11 月 16 日通过公网登录验证。学生打开测验链接或扫描二维码后，不需要注册即可作答。

## 一、10 分钟极速复现指南

下面是从空目录运行这套系统所需的环境和步骤。按顺序完成数据库迁移、环境变量配置、测试和启动即可，不需要额外准备示例题目。

### 1. 环境配置清单

| 软件或服务 | 要求 | 用途 |
|---|---|---|
| Node.js | 推荐 22.x，最低 20.9 | Next.js 与构建工具运行环境 |
| pnpm | 推荐 11.x | 安装项目依赖 |
| MySQL | 8.x | 保存教师、测验、题目、提交和逐题答案 |
| OpenAI 兼容 API | 必须配置才能 AI 出题 | 提供 `/chat/completions` 接口 |
| Cloudflare Tunnel | 可选 | 学生跨网络扫码访问 |
| Docker / Docker Compose | 可选 | 容器化部署，不是必需 |

直接依赖版本：

| 依赖 | 当前版本 |
|---|---|
| Next.js | 16.4.6 |
| React / React DOM | 19.3.1 |
| TypeScript | 5.9.3 |
| Drizzle ORM | 0.45.4 |
| mysql2 | 3.24.6 |
| Zod | 4.6.7 |
| lucide-react | 1.71.0 |
| qrcode.react | 4.2.0 |

完整锁定版本见 `package.json` 和 `pnpm-lock.yaml`。

### 2. 获取代码与安装依赖（约 2 分钟）

```bash
git clone https://github.com/yufeixin1017/zhiceyun.git
cd zhiceyun
pnpm install --frozen-lockfile
```

如果 pnpm 未安装：

```bash
npm install -g pnpm@11
```

### 3. 初始化 MySQL（约 2 分钟）

确保 MySQL 已启动，然后执行：

```bash
for file in database/migrations/00*.sql; do
  echo "执行 $file"
  mysql -u root -p < "$file" || break
done
```

依次输入 MySQL root 密码。脚本包含 `USE zhiceyun`，会创建数据库、核心表和迁移记录，执行到：

```text
001_initial_schema
002_teacher_phone_login
003_remove_generation_mode
004_submission_late_status
```

建议为应用创建独立数据库账号，不要用 root 作为长期运行账号：

```sql
CREATE USER IF NOT EXISTS 'zhiceyun'@'127.0.0.1'
  IDENTIFIED BY '请替换为数据库密码';
GRANT ALL PRIVILEGES ON zhiceyun.* TO 'zhiceyun'@'127.0.0.1';
FLUSH PRIVILEGES;
```

密码建议只使用字母和数字；其他字符需要进行 URL 编码。

### 4. 配置环境变量（约 1 分钟）

本地开发复制模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```dotenv
# 必填：OpenAI 兼容的大模型接口
AI_API_KEY=你的真实模型密钥
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat

# 必填：MySQL 连接串
DATABASE_URL=mysql://zhiceyun:你的数据库密码@127.0.0.1:3306/zhiceyun

# 本地 HTTP 开发可以设为 false；公网 HTTPS 必须为 true
COOKIE_SECURE=false

# 可选：学生跨网络访问时填写公网地址
# PUBLIC_BASE_URL=https://你的隧道域名
```

`AI_BASE_URL` 填写到 API 根路径，程序会请求：

```text
POST {AI_BASE_URL}/chat/completions
```

其他 OpenAI 兼容服务只需替换 `AI_BASE_URL` 和 `AI_MODEL`。**未配置模型时，系统明确提示并禁止生成，不提供预置题目冒充 AI 输出。**

密钥只保存在 `.env.local`，该文件已被 `.gitignore` 排除，不要提交到仓库。

### 5. 测试、构建与启动（约 3 分钟）

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

默认访问地址：

- 产品首页：http://localhost:3000
- 教师登录：http://localhost:3000/login
- 首次初始化：http://localhost:3000/setup
- 教师注册：http://localhost:3000/register
- 数据库健康检查：http://localhost:3000/api/health

macOS 也可以双击 `启动智测云.command`，启动器会检查依赖、构建并启动项目。MySQL 需已启动并完成迁移。

### 6. 首次使用（约 2 分钟）

1. 打开 `/setup` 创建首个教师账号；
2. 使用手机号注册或登录；
3. 输入真实课程名称、课堂主题和讲义要点；
4. 选择题量、题型、难度和答题限时；
5. 点击“AI 生成测验”；
6. 审核题目、答案、解析和知识点，保存并发布；
7. 将链接或二维码分享给学生；
8. 学生输入姓名、学号并作答；
9. 教师查看成绩、逐题分析、学生名单和 CSV 导出。

首次初始化会接管原有本地系统账号的数据归属，后续注册的教师拥有独立工作台。

## 二、公网访问与二维码

分享地址按以下优先级生成：

1. `PUBLIC_BASE_URL`；
2. 教师当前使用的非回环地址；
3. 本机局域网 IPv4 地址。

跨网络演示可使用 Cloudflare Quick Tunnel：

```bash
cloudflared tunnel --url http://localhost:3000
```

将输出地址写入 `.env.local`：

```dotenv
PUBLIC_BASE_URL=https://xxxx.trycloudflare.com
COOKIE_SECURE=true
```

重启服务后，分享链接和二维码都会使用该公网地址，学生可用手机流量作答。Quick Tunnel 地址变化后需同步更新并重启应用。

## 三、验证与复现证据

### 单元测试与构建

```bash
pnpm test       # 35 项单元测试
pnpm typecheck  # TypeScript 严格类型检查
pnpm build      # Next.js 生产构建
```

### 确定性冒烟测试

先启动应用，再执行：

```bash
pnpm test:smoke
```

测试覆盖：

- 未登录拦截、教师初始化、注册、登录和退出；
- 固定测验与 100 分校验；
- 学生无 Cookie 作答；
- 满分、零分与重复学号拦截；
- 成绩页、题目分析和 CSV 导出。

测试使用固定数据，不调用付费模型。默认测试账号为 `13800000000` / `Classroom2026`，仅用于独立测试数据库。需要自动初始化时可设置 `SMOKE_ALLOW_SETUP=1`；正式数据库请使用真实教师账号对应的 `TEACHER_TEST_PHONE` 和 `TEACHER_TEST_PASSWORD`。

## 四、Ubuntu 生产部署

原生 systemd 部署见：[Ubuntu 原生部署指南](docs/deployment-ubuntu-native.md)。

Docker Compose 部署见：[Ubuntu Docker 部署指南](docs/deployment-ubuntu.md)。

服务器配置文件推荐放在：

```text
/etc/zhiceyun/zhiceyun.env
```

服务器示例使用 `127.0.0.1:3100`。MySQL 仅监听本机，公网通过 Cloudflare 访问应用。

## 五、项目边界与数据说明

- 支持单选、多选、判断和简短填空，不包含主观题、数学过程、手写识别或图片作答；
- 答题限时从教师发布时刻计算，超时提交标记为“超时”，仍计入统计；
- 数据库统一以 UTC 存储时间，页面和 CSV 按 `Asia/Shanghai` 显示；
- 教师密码使用 scrypt 哈希，会话令牌只保存 SHA-256 哈希；
- 学生无需注册，姓名和学号属于自我声明，不用于正式身份认证；
- 演示请使用虚拟学生数据，不上传真实敏感信息；
- 原 `data/database.json` 仅是早期备份，不再参与运行。

## 六、提交材料

- [完整 AI 对话历史（Markdown）](提交材料/智测云-完整对话历史.md)
- [AI 协同 Prompt 演进记录（PDF）](提交材料/智测云-AI协同Prompt演进记录.pdf)
- [技术文档（PDF）](提交材料/智测云-技术文档.pdf)

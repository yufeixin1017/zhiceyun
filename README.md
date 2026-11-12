# 智测云

> 面向高校课堂的 AI 随堂测验生成与自动评阅平台

智测云服务于**课后快速知识回顾与形成性检测**：教师输入课程主题和讲义要点，生成选择、判断和简短填空题；审核发布后，学生在线作答，系统自动评分并汇总班级掌握情况。

本项目不是完整课程考试系统，不包含简答题、数学证明、计算过程评阅、图片作答、手写识别或编程题运行。

## 已实现功能

### 教师端

- 首次创建教师账号，手机号密码登录与安全退出；
- scrypt 密码哈希、MySQL 会话、HttpOnly Cookie；
- 按教师隔离测验、学生成绩和导出权限；
- 输入课程名称、课堂主题和讲义要点；
- 配置题量、题型、难度与建议用时；
- 支持 OpenAI 兼容的大模型接口；
- 未配置密钥时提供**明确标注的演示生成模式**；
- 校验题量、题型、选项、答案与总分；
- 逐题编辑题干、选项、答案、解析和知识点；
- 添加／删除题目并自动重新分配分值；
- 草稿保存、审核发布、作答链接与二维码；
- 查看平均分、最高分、及格率、逐题正确率和知识点反馈；
- 查看每名学生的逐题答案、正误、得分与解析；
- 查看每道题的正确／错误学生名单、选项分布和完整答案组合；
- 导出带 UTF-8 BOM 的 CSV 成绩表。

### 学生端

- 无需安装应用，打开链接即可作答；
- 单选、多选、判断、简短填空在线作答；
- 必答校验与学号重复提交拦截；
- 标准答案不随学生作答页下发，由服务端评分；
- 提交后立即查看成绩、逐题对错、正确答案和解析。

## 技术栈

- Next.js 16 App Router + React 19 + TypeScript
- Zod：请求与 AI 输出的运行时结构校验
- Node.js Route Handlers：生成、发布、评分、统计与导出 API
- MySQL 8.x＋Drizzle ORM＋mysql2：事务化持久化与唯一约束
- Node.js 原生测试框架：无需额外测试运行器
- Lucide 图标、原生响应式 CSS、QRCodeSVG

## 10 分钟运行指南

### 1. 环境要求

- Node.js 20.9 或更高版本，推荐 Node.js 22/24；
- pnpm 9 或更高版本；
- MySQL 8.x（本地默认数据库名为 `zhiceyun`）；
- 可选：一个 OpenAI 兼容的 Chat Completions API。

### 2. 安装与启动

#### macOS 双击启动（当前电脑推荐）

在 Finder 中打开项目根目录，双击 **`启动智测云.command`**。启动器会自动检查依赖、构建最新版本、启动服务并打开浏览器。

- 启动器需要保留在项目根目录，不能单独移动到其他文件夹；
- 首次安装依赖时需要联网；
- 使用时保持启动器打开的终端窗口运行，按 `Control + C` 停止；
- 如果服务已经运行，再次双击只会打开浏览器，不会重复启动；
- MySQL 服务需要已启动，并已执行下方初始化 SQL；
- PATH 仅在启动器进程内临时设置，不修改系统环境变量。

#### 终端启动

```bash
pnpm install
cp .env.example .env.local
```

首次运行先启动 MySQL 并初始化表结构：

```bash
mysql --protocol=TCP -h 127.0.0.1 -P 3306 -u root \
  < database/migrations/001_initial_schema.sql
mysql --protocol=TCP -h 127.0.0.1 -P 3306 -u root zhiceyun \
  < database/migrations/002_teacher_phone_login.sql
```

在 `.env.local` 中配置实际数据库账号（密码中的特殊字符需要 URL 编码）：

```dotenv
DATABASE_URL=mysql://zhiceyun:数据库密码@127.0.0.1:3306/zhiceyun
```

然后启动：

```bash
pnpm dev
```

打开：

- 产品首页：`http://localhost:3000`
- 教师工作台：`http://localhost:3000/teacher`
- 创建测验：`http://localhost:3000/teacher/create`
- 教师登录：`http://localhost:3000/login`
- 首次账号初始化：`http://localhost:3000/setup`

首次访问教师工作台会跳转到登录页。如果尚未初始化教师账号，请先进入 `/setup` 创建账号；密码至少 8 位且同时包含字母和数字。已有本地系统账号会升级为该教师账号，历史测验不会丢失。

没有配置 API 时也可以直接点击“生成演示测验”。演示生成器用于验证产品流程，页面对应内容会标注“演示生成”，**不会冒充实时大模型输出**。

### 3. 配置真实 AI 生成

编辑 `.env.local`：

```dotenv
AI_API_KEY=你的密钥
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
```

`AI_BASE_URL` 应填写到 API 根路径，系统会请求：

```text
POST {AI_BASE_URL}/chat/completions
```

其他 OpenAI 兼容服务也可以通过这三个变量接入。密钥只由服务端读取，不应写入 `NEXT_PUBLIC_` 变量或提交到 Git。

配置后重新启动，在创建页选择“AI 生成”。模型请求失败或输出未通过校验时会明确报错，不会静默替换成演示题。

教师 Cookie 在开发模式下不要求 HTTPS；本地 `next start` 使用 HTTP 时可设置 `COOKIE_SECURE=false`，公网 HTTPS 环境必须设置为 `true`。

## 验证与构建

```bash
pnpm test       # 数据结构、评分、答案隔离、统计等单元测试
pnpm typecheck  # TypeScript 严格类型检查
pnpm build      # 生产构建
pnpm start      # 启动生产服务
```

启动服务后，可在另一个终端执行端到端冒烟测试：

```bash
pnpm test:smoke
```

测试会真实创建并发布一份演示测验，验证教师认证、学生免登录、满分、零分、重复学号拦截、答案不泄露、统计页和 CSV 导出，最后输出可打开的教师端与学生端链接。

测试默认使用手机号 `13800000000` 和测试密码 `Classroom2026`。已有测试账号时直接登录；独立测试数据库可设置 `SMOKE_ALLOW_SETUP=1` 允许自动初始化。正式数据库请先在页面创建教师，再通过 `TEACHER_TEST_PHONE`、`TEACHER_TEST_PASSWORD` 提供测试登录信息，不要对正式账号开启自动初始化。

### macOS 原生签名兼容说明

`package.json` 已包含 Next.js 官方 `@next/swc-wasm-nodejs` 备用编译器。`scripts/next.mjs` 为 Next.js 提供本地 WASM 路径：原生 SWC 可正常使用时仍优先使用原生编译；当前机器若拒绝原生二进制签名，则使用 WASM 和 Webpack 完成构建，**不需要修改系统安全设置**。

## 数据与复现说明

- 运行数据保存在 MySQL 的 `zhiceyun` 数据库中；
- 初始化与手机号迁移脚本位于 `database/migrations/`；
- 原 `data/database.json` 仅作为早期演示数据备份，不再参与运行；
- 环境密钥、本地数据文件和构建产物均被 `.gitignore` 排除；
- 教师登录、会话和按教师隔离数据已启用，学生公开作答无需登录；
- 当前仅开放首个教师账号初始化，不包含学校统一认证或多教师管理后台；
- 演示时请使用虚拟学生姓名与学号，不收集真实敏感信息；
- 数据库健康检查：`GET /api/health`。

## 目录结构

```text
src/
├── app/
│   ├── api/                    # 生成、编辑、发布、作答和导出 API
│   ├── quiz/                   # 学生作答与成绩解析页
│   └── teacher/                # 教师工作台、创建、编辑与统计页
├── components/                 # 品牌、导航、状态与分享组件
└── lib/
    ├── domain.ts               # 统一 Schema 与类型
    ├── ai-generator.ts         # 大模型请求、JSON 提取与校验
    ├── demo-generator.ts       # 明确标注的演示生成器
    ├── scoring.ts              # 服务端自动评分内核
    ├── analytics.ts            # 班级与逐题统计
    ├── public-quiz.ts          # 学生端答案字段隔离
    ├── db/                     # MySQL 连接池与 Drizzle 表映射
    └── store.ts                # 事务化 MySQL 持久化
database/
└── migrations/               # 可复现的 MySQL 初始化 SQL
scripts/
├── next.mjs                    # 原生／WASM 编译兼容入口
└── smoke-test.mjs              # 完整业务链路验证
docs/
├── architecture.md
├── ai-collaboration.md
├── demo-script.md
└── competition-checklist.md
```

## 评分规则

- 单选、多选、判断：答案完全正确得分，否则 0 分；
- 多选题：不设置部分分，忽略选项顺序和重复选择；
- 填空题：支持多个可接受答案，忽略英文大小写、全半角及首尾／连续空格差异；
- 每份测验总分固定为 100 分，生成或增删题目时自动分配分值；
- 学生提交后由服务端重新计算成绩，不信任浏览器传入的分数。

## 参赛材料

- [系统架构与核心设计](docs/architecture.md)
- [真实 AI 协同开发记录](docs/ai-collaboration.md)
- [5–8 分钟演示视频脚本](docs/demo-script.md)
- [比赛提交检查清单](docs/competition-checklist.md)

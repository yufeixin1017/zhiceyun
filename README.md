# 智测云

> 面向高校课堂的 AI 随堂测验生成与自动评阅平台

智测云服务于**课后快速知识回顾与形成性检测**：教师输入课程主题和讲义要点，生成选择、判断和简短填空题；审核发布后，学生在线作答，系统自动评分并汇总班级掌握情况。

本项目不是完整课程考试系统，不包含简答题、数学证明、计算过程评阅、图片作答、手写识别或编程题运行。

## 已实现功能

### 教师端

- 输入课程名称、课堂主题和讲义要点；
- 配置题量、题型、难度与建议用时；
- 支持 OpenAI 兼容的大模型接口；
- 未配置密钥时提供**明确标注的演示生成模式**；
- 校验题量、题型、选项、答案与总分；
- 逐题编辑题干、选项、答案、解析和知识点；
- 添加／删除题目并自动重新分配分值；
- 草稿保存、审核发布、作答链接与二维码；
- 查看平均分、最高分、及格率、逐题正确率和知识点反馈；
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
- 本地 JSON 原子写入：适合单机演示的轻量持久化
- Node.js 原生测试框架：无需额外测试运行器
- Lucide 图标、原生响应式 CSS、QRCodeSVG

## 10 分钟运行指南

### 1. 环境要求

- Node.js 20.9 或更高版本，推荐 Node.js 22/24；
- pnpm 9 或更高版本；
- 可选：一个 OpenAI 兼容的 Chat Completions API。

### 2. 安装与启动

#### macOS 双击启动（当前电脑推荐）

在 Finder 中打开项目根目录，双击 **`启动智测云.command`**。启动器会自动检查依赖、构建最新版本、启动服务并打开浏览器。

- 启动器需要保留在项目根目录，不能单独移动到其他文件夹；
- 首次安装依赖时需要联网；
- 使用时保持启动器打开的终端窗口运行，按 `Control + C` 停止；
- 如果服务已经运行，再次双击只会打开浏览器，不会重复启动；
- PATH 仅在启动器进程内临时设置，不修改系统环境变量。

#### 终端启动

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

打开：

- 产品首页：`http://localhost:3000`
- 教师工作台：`http://localhost:3000/teacher`
- 创建测验：`http://localhost:3000/teacher/create`

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

测试会真实创建并发布一份演示测验，验证满分、零分、重复学号拦截、答案不泄露、统计页和 CSV 导出，最后输出可打开的教师端与学生端链接。

### macOS 原生签名兼容说明

`package.json` 已包含 Next.js 官方 `@next/swc-wasm-nodejs` 备用编译器。`scripts/next.mjs` 为 Next.js 提供本地 WASM 路径：原生 SWC 可正常使用时仍优先使用原生编译；当前机器若拒绝原生二进制签名，则使用 WASM 和 Webpack 完成构建，**不需要修改系统安全设置**。

## 数据与复现说明

- 运行数据保存在 `data/database.json`，首次写入时自动创建；
- 文件使用临时文件＋重命名进行原子替换；
- 数据文件、环境密钥、构建产物均被 `.gitignore` 排除；
- 当前版本未实现登录与多租户权限，适合本地比赛演示，不应直接作为公开生产系统部署；
- 演示时请使用虚拟学生姓名与学号，不收集真实敏感信息。

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
    └── store.ts                # JSON 持久化
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

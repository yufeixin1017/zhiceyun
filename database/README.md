# 智测云数据库

本目录保存智测云的 **MySQL 8.x** 初始化脚本，数据库字符集为 `utf8mb4`。

> 当前进度：MySQL 持久化与教师认证均已接入。首次初始化会把不可登录的本地系统账号升级为真实教师账号，已有测验和学生作答继续归属于该账号。

## 初始化

在项目根目录执行（本机初次安装、root 空密码的情况）：

```bash
mysql --protocol=TCP -h 127.0.0.1 -P 3306 -u root \
  < database/migrations/001_initial_schema.sql
mysql --protocol=TCP -h 127.0.0.1 -P 3306 -u root zhiceyun \
  < database/migrations/002_teacher_phone_login.sql
```

初始化使用 `CREATE DATABASE IF NOT EXISTS`、`CREATE TABLE IF NOT EXISTS` 和条件迁移，不会主动删除或覆盖已有数据。`002` 将教师登录方式迁移为手机号，保留旧 `email` 列作为可空兼容字段；已迁移数据库也可重复执行。

## 数据表

| 表 | 用途 |
|---|---|
| `teachers` | 教师手机号、姓名及密码哈希 |
| `teacher_sessions` | 教师登录会话，保存令牌哈希和过期时间 |
| `quizzes` | 教师创建的测验、课堂内容和发布状态 |
| `questions` | 题目、选项、答案、解析、知识点、分值和排列位置 |
| `submissions` | 学生提交、姓名、学号、得分、是否超时和提交时间 |
| `answers` | 每道题的学生答案、正误和得分 |
| `schema_migrations` | 已执行的初始化版本 |

关系：

```text
teachers → quizzes → questions
                  → submissions → answers
```

学生不创建账号。`submissions` 的 `(quiz_id, student_no)` 唯一索引用于阻止同一学号重复提交；MySQL 唯一索引允许多个 `NULL`，与当前学号选填的行为一致。

## 安全说明

- 初始化脚本不创建默认教师账号，避免公开默认密码；
- 教师密码只保存哈希，会话令牌只保存 SHA-256 哈希；
- root 空密码仅用于本机首次初始化，应用正式连接应使用独立数据库账号；
- 不应将 MySQL 的 3306 端口暴露到公网；
- 生产环境需要单独配置数据库密码和定期备份。

## 时间字段约定

应用统一以 **UTC** 写入 `published_at`、`submitted_at` 等时间字段。手工执行 SQL 构造或校验数据时，请使用 `UTC_TIMESTAMP(3)` 而不是 `NOW()`，否则会因数据库会话时区与 UTC 的差异导致限时判断不正确。

页面与 CSV 展示时统一使用 `Asia/Shanghai` 转换为北京时间，不依赖 Ubuntu 或 Mac 的系统时区设置。Navicat 中直接查看到的 UTC 时间比北京时间少 8 小时属于正常现象，不代表数据保存错误。

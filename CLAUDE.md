# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

汉字自动拆分系统 API — 基于 Cloudflare Worker 的 REST API，使用 D1（SQLite）和 KV 存储。

## 常用命令

```
bun start          # wrangler dev（本地开发）
bun run deploy     # wrangler deploy（部署）
bun run format     # prettier 格式化
```

## 架构

```
Request → router（路由定义）
        → controller（参数解析、JSON 序列化/反序列化、调用 model）
        → model（通过 env.CHAI 执行 D1 SQL 查询）
```

- **`src/router/`** — 基于 itty-router 的路由定义及中间件串联
- **`src/controller/`** — 请求处理：校验参数，将需要存为 JSON 文本的字段（如 `JSON.stringify(body.glyphs)`）序列化后传给 model
- **`src/model/`** — 数据库操作，通过 `env.CHAI.prepare(...).bind(...).first()/.all()/.run()` 执行 D1 查询
- **`src/dto/`** — 共享类型：`Env`、`Ctx`、`DataList<T>`、JWT claims、load 工具函数
- **`src/error/`** — `Err`、`ErrCode` 枚举、`Result<T> = T | Err`、`Ok()` 类型守卫
- **`src/middleware/`** — JWT 鉴权中间件：`authorizedUser`、`authorizedAdmin`、`authorizedSuper`

## 关键约定

- **错误处理**：函数返回 `Result<T>`（即 `T | Err` 联合类型）。调用方通过 `if (!Ok(result)) return result as Err` 检查
- **数据库**：`env.CHAI` 是 D1 绑定，`env.REFERENCE` 是 KV 命名空间
- **上下文**：`Ctx` 继承 `ExecutionContext`，由中间件注入 — `ctx.UserId` 由 JWT 鉴权设置，`ctx.unicode` 由 `validateUnicode` 设置
- **JSON 字段**：复杂字段（`glyphs`、`references`、`strokes`）在数据库中以 JSON 文本存储。Controller 在调用 model 前 `JSON.stringify()` 这些字段，API 客户端始终发送/接收已解析的对象
- **缩进**：整个项目使用 tab 缩进

## 数据库表

| 表            | 主键      | 用途                                                                                      |
| ------------- | --------- | ----------------------------------------------------------------------------------------- |
| `repertoire`  | `unicode` | 原始字符表（旧表）                                                                        |
| `characters`  | `unicode` | 新字符表：unicode, tygf, gb2312, glyphs (JSON), name, ambiguous                           |
| `glyphs`      | `id`      | 字形拆解数据：id, type, operator, references (JSON), strokes (JSON), gf0014_id, gf3001_id |
| `users`       | `id`      | 用户账户                                                                                  |
| `equivalence` | `id` 自增 | 用户提交的当量数据                                                                        |

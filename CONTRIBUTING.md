# 贡献指南

感谢你对 Inkwell 的贡献兴趣。本仓库以“高性能 Canvas UI 框架”为目标，提交前请确保变更可维护、可验证、可回滚。

## 开发环境

- Node.js：v22+
- 包管理器：pnpm

```bash
pnpm install
```

## 常用命令

```bash
# 启动 Vite 开发服务（演示/Playground）
pnpm dev

# 启动文档站（VitePress），Playground 入口：/docs/demo/
pnpm docs

# 代码检查
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm docs:build

# 格式化与格式校验
pnpm format
pnpm format:check
```

## 提交规范

- 语言：注释、测试描述、日志、文档等请使用中文（专有术语与 API 名称除外）
- 性能：避免在核心渲染路径（build/layout/paint）引入明显的额外分配与重复计算
- 兼容：遵循既有类型与约束，不引入破坏性改动（除非明确标注并说明迁移方式）

## 变更集（Changesets）

本仓库使用 Changesets 管理版本与变更记录。

- 当你的 PR 会影响使用者（新增能力/修复/行为变化）时，请添加变更集：

```bash
pnpm changeset
```

## 提交前自检

- `pnpm format:check` 通过
- `pnpm lint` / `pnpm typecheck` 通过
- `pnpm test` 通过（单测单例建议 < 1s）
- 若改动影响文档或示例：`pnpm docs:build` 通过

## PR 要求

- 标题清晰描述“做了什么”，正文说明“为什么做”和“如何验证”
- 尽量提供最小可复现（Bug）或明确的交互/视觉对比（UI）

# Widget Gallery Demo

这是一个展示 InkWell 框架核心组件库的画廊示例项目，涵盖了布局、文本、滚动等基础组件的用法。

## 1. 目录结构规范

本项目遵循统一的工程化结构标准：

```
widget-gallery/
├── __tests__/               # 测试用例目录
├── components/              # React 组件目录
├── widgets/                 # InkWell 组件目录
│   ├── demo-card/           # 示例卡片组件
│   │   └── index.tsx
│   ├── section/             # 章节组件
│   │   └── index.tsx
│   └── widget-gallery-demo/ # 主 Demo 组件
│       └── index.tsx
├── helpers/                 # 工具函数目录
├── constants/               # 常量定义（如 colors.ts）
├── hooks/                   # 自定义 Hooks
├── assets/                  # 静态资源
├── app.tsx                  # 应用入口逻辑
├── index.tsx                # 对外导出入口
├── index.module.less        # 样式文件
├── type.ts                  # 类型定义导出
└── README.md                # 项目文档
```

## 2. 命名规范

*   **文件夹命名**：使用 `kebab-case`（如 `demo-card`）。
*   **文件命名**：
    *   组件入口文件统一命名为 `index.tsx`。
    *   样式文件统一命名为 `index.module.less`。
*   **组件命名**：使用 `PascalCase`（如 `DemoCard`）。

## 3. 组件开发准则

*   **分类管理**：
    *   **React 组件**：必须放置在 `components/` 目录下。
    *   **InkWell 组件**：必须放置在 `widgets/` 目录下。
*   **独占目录**：每个组件必须拥有独立的文件夹，禁止在同一文件夹下放置多个组件。
*   **类型定义**：组件的 Props 和 State 类型应在组件文件中定义，通用类型在 `type.ts` 中导出。

## 4. 代码提交要求

*   **代码质量**：提交前请执行 `npm run lint` 确保无格式或风格错误。
*   **测试通过**：提交前请执行 `npm run test` 确保所有测试用例通过（通过率 100%）。
*   **国际化**：
    *   所有代码注释必须使用**中文**。
    *   测试描述（`describe`, `it`）和断言消息必须使用**中文**。
    *   用户界面显示的文本应支持国际化或使用中文。

---
title: FormItem
---

核心用途：表单项容器，提供标签、必填标记、帮助文案与校验状态展示。

## 如何引入

- 项目代码：`import { FormItem } from '@/comp'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 横向布局（label + control）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
<FormItem label="用户名" required={true} help="请输入 2-20 个字符" validateStatus="warning">
  <Container
    width={240}
    height={32}
    border={{ width: 1, color: getCurrentTheme().border.base }}
    borderRadius={6}
  />
</FormItem>
```

### 纵向布局（label 在上）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
<FormItem label="备注" layout="vertical" help="可选填写" validateStatus="success">
  <Container
    width={360}
    height={64}
    border={{ width: 1, color: getCurrentTheme().border.base }}
    borderRadius={6}
  />
</FormItem>
```

## 属性

| 属性名 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `label` | 标签文本 | `string` | 无 |
| `required` | 是否必填（显示 *） | `boolean` | `false` |
| `help` | 帮助/错误提示文案 | `string` | 无 |
| `validateStatus` | 校验状态 | `'success' \| 'warning' \| 'error' \| 'validating'` | 无 |
| `labelWidth` | 标签宽度（横向布局） | `number` | `96` |
| `colon` | 是否显示冒号 | `boolean` | `true` |
| `layout` | 布局方式 | `'horizontal' \| 'vertical'` | `'horizontal'` |
| `gap` | 标签与控件间距 | `number` | `8` |
| `theme` | 主题（可选） | `ThemePalette` | 当前主题模式 |

- children 支持类型：`Multiple`

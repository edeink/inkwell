---
title: Padding
---

核心用途：为单个子元素添加内边距；支持数字简写与对象形式。

## 如何引入
- 项目代码：`import { Padding, Text, Container } from '@/core'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 数字简写（四边等距）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={300} height={120} color={theme.background.surface}>
      <Padding padding={12}>
        <Text text="数字简写（四边等距）" color={theme.text.primary} />
      </Padding>
    </Container>
  );
})()
```

### 对象形式（分别控制四边）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={300} height={120} color={theme.background.surface}>
      <Padding padding={{ top: 32, right: 16, bottom: 8, left: 16 }}>
        <Text text="对象形式（分别控制四边）" color={theme.text.primary} />
      </Padding>
    </Container>
  );
})()
```

### 数组简写（CSS 风格）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={300} height={120} color={theme.background.surface}>
      <Padding padding={[16, 32]}>
        <Text text="数组简写 [16, 32]" color={theme.text.primary} />
      </Padding>
    </Container>
  );
})()
```

## 属性

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `padding` | `number \| object \| number[]` | 是 | 无 | 内边距，支持数字、对象与数组简写 ([all] \| [vertical, horizontal] 等) |
| `flex` | `{ flex?: number; fit?: 'tight' \| 'loose' }` | 否 | 无 | 放入上层容器时的扩展布局属性 |

- children 支持类型：`Single`

## Tips
- 内边距会影响子元素的可用空间；与 `Container.padding` 行为一致但语义更清晰。
- 使用统一间距变量可保持一致的视觉节奏；支持辅助函数 `symmetric/only/all`（见 `src/core/padding.ts:112-148`）。

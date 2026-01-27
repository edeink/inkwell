---
title: Stack
---

核心用途：堆叠多个子元素，支持对齐与尺寸策略，可与 `Positioned` 配合实现绝对定位。

## 如何引入
- 项目代码：`import { Stack, Positioned, Container, Text } from '@/core'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 叠放两个元素并对齐居中

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={260} height={160} color={theme.background.container}>
      <Stack alignment="center" fit="loose">
        <Container width={120} height={80} color={theme.state.selected} />
        <Container width={80} height={40} color={theme.background.surface} />
      </Stack>
    </Container>
  );
})()
```

### 与 Positioned 配合使用

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Stack>
      <Positioned left={12} top={12} width={80} height={40}>
        <Container color={theme.state.selected} />
      </Positioned>
      <Positioned right={12} bottom={12} width={80} height={40}>
        <Container color={theme.background.surface} />
      </Positioned>
    </Stack>
  );
})()
```

### 容器宽度
```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Stack>
      <Container color={theme.state.selected} width={80} height={80} />
      <Positioned left={40} top={40} width={80} height={40}>
        <Container color={theme.background.surface} />
      </Positioned>
    </Stack>
  );
})()
```

## 属性

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `alignment` | `'topLeft' \| 'topCenter' \| 'topRight' \| 'centerLeft' \| 'center' \| 'centerRight' \| 'bottomLeft' \| 'bottomCenter' \| 'bottomRight'` | 否 | `'topLeft'` | 子元素的整体对齐 |
| `fit` | `'loose' \| 'expand' \| 'passthrough'` | 否 | `'loose'` | Stack 尺寸策略：`expand` 填满约束；`loose` 取子元素最大；`passthrough` 传递约束 |
| `flex` | `{ flex?: number; fit?: 'tight' \| 'loose' }` | 否 | 无 | 放入上层容器时的扩展布局属性 |

- children 支持类型：`Single`

## Tips
- `fit='expand'` 会尝试填满父约束；在无界约束下将退化为使用子元素最大尺寸。
- 与 `Positioned` 联用实现绝对定位；未使用 `Positioned` 时按 `alignment` 对齐堆叠的子元素。

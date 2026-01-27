---
title: Row
---

核心用途：水平排列多个子元素，支持主轴/交叉轴对齐与间距控制。

## 如何引入
- 项目代码：`import { Row, Container, Text } from '@/core'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 基础水平排列

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={360} height={100} color={theme.background.container}>
      <Row
        spacing={8}
        mainAxisAlignment={MainAxisAlignment.Start}
        crossAxisAlignment={CrossAxisAlignment.Center}
      >
        <Container width={60} height={32} color={theme.state.focus} />
        <Container width={60} height={32} color={theme.state.focus} />
        <Container width={60} height={32} color={theme.state.focus} />
      </Row>
    </Container>
  );
})()
```

### 主轴对齐（spaceBetween）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={360} height={100} color={theme.background.container}>
      <Row mainAxisAlignment={MainAxisAlignment.SpaceBetween} spacing={8}>
        <Container width={60} height={32} color={theme.state.focus} />
        <Container width={60} height={32} color={theme.state.focus} />
        <Container width={60} height={32} color={theme.state.focus} />
      </Row>
    </Container>
  );
})()
```

### 交叉轴拉伸（stretch）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={360} height={80} color={theme.background.container}>
      <Row crossAxisAlignment={CrossAxisAlignment.Stretch} spacing={8}>
        <Container width={60} color={theme.state.focus} />
        <Container width={60} color={theme.state.focus} />
        <Container width={60} color={theme.state.focus} />
      </Row>
    </Container>
  );
})()
```

## 属性

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `mainAxisAlignment` | `'start' \| 'center' \| 'end' \| 'spaceBetween' \| 'spaceAround' \| 'spaceEvenly'` | 否 | `'start'` | 主轴（水平）对齐方式 |
| `crossAxisAlignment` | `'start' \| 'center' \| 'end' \| 'stretch'` | 否 | `'center'` | 交叉轴（垂直）对齐方式 |
| `mainAxisSize` | `'min' \| 'max'` | 否 | `'max'` | 主轴尺寸策略：`min` 收缩包裹内容；`max` 尝试占满可用宽度 |
| `spacing` | `number` | 否 | `0` | 子元素之间的固定间距 |
| `flex` | `{ flex?: number; fit?: 'tight' \| 'loose' }` | 否 | 无 | 放入上层 `Column` 等容器时的扩展布局属性 |

- children 支持类型：`Multiple`

## Tips
- 使用 `mainAxisSize="min"` 让 Row 宽度按内容收缩，便于居中或组合。
- 在固定父高度场景下，`crossAxisAlignment="stretch"` 可让子元素填满高度。
- `spaceBetween/spaceAround/spaceEvenly` 会分配剩余空间，`spacing` 不参与分隔。
- 当父容器宽度无界时，`mainAxisSize="max"` 不会强制拉伸，宽度仍由子元素决定。

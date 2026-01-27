---
title: SizedBox
---

核心用途：提供固定尺寸的包裹容器或占位，用于限制子元素尺寸或制造空白。

## 如何引入
- 项目代码：`import { SizedBox, Container, Text } from '@/core'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 固定尺寸包裹内容

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <SizedBox width={120} height={48}>
      <Container color={theme.state.selected} />
    </SizedBox>
  );
})()
```

### 用作间距（空盒）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={320} height={100} color={theme.background.container}>
      <Column spacing={0}>
        <Container height={20} color={theme.background.surface} />
        <SizedBox height={12} />
        <Container height={20} color={theme.state.selected} />
      </Column>
    </Container>
  );
})()
```

## 属性

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `width` | `number` | 否 | 无 | 固定宽度 |
| `height` | `number` | 否 | 无 | 固定高度 |
| `flex` | `{ flex?: number; fit?: 'tight' \| 'loose' }` | 否 | 无 | 放入上层容器时的扩展布局属性 |

- children 支持类型：`Single`

## Tips
- 未设置尺寸时，`SizedBox` 会根据子元素和约束计算尺寸；设置尺寸后将以固定值为准。
- 使用 `SizedBox` 作为间距更具语义性，避免在 `Container` 中硬编码空白。

---
title: Wrap
---

核心用途：横向排列子元素，超出父容器宽度自动换行；支持行内间距与行间距，行为对齐 HTML 的 `inline-block` 自动折行。

## 如何引入
- 项目代码：`import { Wrap, Container, Text } from '@/core'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 基础自动折行

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={360} height={160} color={theme.background.container}>
      <Wrap spacing={8} runSpacing={12}>
        <Container width={80} height={32} color={theme.state.selected} />
        <Container width={120} height={32} color={theme.state.selected} />
        <Container width={60} height={32} color={theme.state.selected} />
        <Container width={100} height={32} color={theme.state.selected} />
        <Container width={90} height={32} color={theme.state.selected} />
      </Wrap>
    </Container>
  );
})()
```

### 行内间距与行间距

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={360} height={160} color={theme.background.container}>
      <Wrap spacing={6} runSpacing={10}>
        {Array.from({ length: 10 }, (_, i) => (
          <Container
            key={i}
            padding={4}
            color={theme.background.surface}
            border={{ width: 1, color: theme.border.base }}
            borderRadius={8}
          >
            <Text text={`Item-${i}`} fontSize={12} color={theme.primary} />
          </Container>
        ))}
      </Wrap>
    </Container>
  );
})()
```

### 混合尺寸元素

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={360} height={200} color={theme.background.container}>
      <Wrap spacing={8} runSpacing={8}>
        <Container width={140} height={40} color={theme.background.surface} />
        <Container width={60} height={60} color={theme.state.hover} />
        <Container width={100} height={32} color={theme.state.selected} />
        <Container width={80} height={48} color={theme.background.surface} />
        <Container width={120} height={36} color={theme.state.active} />
      </Wrap>
    </Container>
  );
})()
```

## 属性

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `spacing` | `number` | 否 | `0` | 同一行子元素之间的水平间距 |
| `runSpacing` | `number` | 否 | `0` | 行与行之间的垂直间距 |
| `flex` | `{ flex?: number; fit?: 'tight' \| 'loose' }` | 否 | 无 | 放入上层容器时的扩展布局属性 |

- children 支持类型：`Multiple`

## 行为说明
- 折行规则：从左到右布局，若加入下一个子元素会超过父容器可用宽度，则换行；行高取该行中子元素的最大高度。
- 尺寸计算：容器高度为各行高度之和并加上行间距；容器宽度为各行内容宽度的最大值（受约束限制）。
- 对齐关系：Wrap 行为与 HTML `inline-block` 自动换行一致；可替代 `flex-wrap: wrap` 的常见场景。

## Tips
- 将不同宽度的元素混排时，建议设置适当的 `runSpacing` 以提升可读性。
- 若需要规则网格（统一列宽/行高、可滚动与虚拟化），更适合使用表格/网格类实现；Wrap 更适用于非规则宽度的自然折行场景。

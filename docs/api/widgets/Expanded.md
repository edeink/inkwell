---
title: Expanded
---

核心用途：通过在子元素上设置 `flex` 属性，使其在 `Row/Column` 中按权重分配剩余空间。

## 如何引入
- 项目代码：无需单独引入 `Expanded` 组件；在任意子元素上使用 `flex={{ flex: number, fit: 'tight' | 'loose' }}`。
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 在 Column 中按权重分配高度

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={360} height={180} border={{ width: 1, color: theme.border.base }}>
      <Column spacing={8} mainAxisSize="max">
        <Container
          color={theme.state.hover}
          border={{ width: 1, color: theme.primary }}
          flex={{ flex: 1, fit: 'tight' }}
        >
          <Text
            text="flex: 1"
            textAlign="center"
            textAlignVertical="center"
            color={theme.text.primary}
          />
        </Container>
        <Container
          color={theme.state.hover}
          border={{ width: 1, color: theme.primary }}
          flex={{ flex: 2, fit: 'tight' }}
        >
          <Text
            text="flex: 2"
            textAlign="center"
            textAlignVertical="center"
            color={theme.text.primary}
          />
        </Container>
      </Column>
    </Container>
  );
})()
```

### 在 Row 中按权重分配宽度（示意）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Container width={360} height={100} border={{ width: 1, color: theme.border.base }}>
      <Row spacing={8} mainAxisSize="max">
        <Container
          height={40}
          color={theme.state.hover}
          border={{ width: 1, color: theme.warning }}
          flex={{ flex: 1, fit: 'tight' }}
        >
          <Text text="1x" textAlign="center" textAlignVertical="center" color={theme.text.primary} />
        </Container>
        <Container
          height={40}
          color={theme.state.hover}
          border={{ width: 1, color: theme.warning }}
          flex={{ flex: 2, fit: 'tight' }}
        >
          <Text text="2x" textAlign="center" textAlignVertical="center" color={theme.text.primary} />
        </Container>
      </Row>
    </Container>
  );
})()
```

## 属性（子元素的 `flex`）

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `flex` | `number` | 否 | 无 | 权重，按比例分配剩余空间（>0 生效） |
| `fit` | `'tight' \| 'loose'` | 否 | `'tight'` | 适应方式：`tight` 强制占满分配空间；`loose` 可小于分配空间 |

- children 支持类型：`Single`

## Tips
- 在 `Column` 中，当父高度无界且存在 `flex` 子元素且 `mainAxisSize='max'` 时会触发错误（参考 `src/core/flex/column.ts:139-146`）；可改为 `mainAxisSize='min'` 或使用 `fit='loose'`。
- `flex` 行为由容器（`Row/Column`）负责分配；子元素需放置在支持 Flex 的容器中才生效。

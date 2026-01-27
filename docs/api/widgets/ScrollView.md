---
title: ScrollView
---

核心用途：`ScrollView` 是基于 `Viewport` 构建的通用滚动容器，增加了滚动条、溢出裁剪（Overflow Clipping）和弹性滚动（Bounce）效果，适用于常规的长列表或内容滚动场景。

## 如何引入

```typescript
import { ScrollView } from '@/core';
```

## 示例

### 1. 基础滚动视图 (Basic ScrollView)

使用 `ScrollView` 包裹超出尺寸的内容，实现自动裁剪和滚动。

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <ScrollView width={300} height={200} overflow="hidden" scrollBarColor={theme.text.secondary}>
      <Column>
        {Array.from({ length: 10 }).map((_, i) => (
          <Container
            key={i}
            width={280}
            height={40}
            margin={{ bottom: 10 }}
            color={theme.background.surface}
          >
            <Text text={`Item ${i + 1}`} color={theme.text.primary} />
          </Container>
        ))}
      </Column>
    </ScrollView>
  );
})()
```

### 2. 弹性滚动 (Bouncing ScrollView)

开启 `enableBounce` 实现类似 iOS 的阻尼回弹效果。

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <ScrollView
      width={300}
      height={200}
      enableBounce={true}
      bounceDamping={0.6}
      scrollBarColor={theme.text.secondary}
    >
      <Container width={300} height={200} color={theme.background.surface}>
        <Center>
          <Text text="Pull me down/up!" color={theme.text.primary} />
        </Center>
      </Container>
    </ScrollView>
  );
})()
```

### 3. 滚轮链式滚动与 DOM 互操作

默认情况下，`ScrollView` 的滚轮滚动在到达边界时不会继续“过卷”（overscroll），而是允许事件继续向外传播：
- 嵌套在外层 `ScrollView` 内时，可以把剩余滚动交给外层消费，实现链式滚动。
- 当整个 Canvas 内的滚动都到达边界时，可以把滚动交给 DOM（页面）继续滚动，实现 DOM/Canvas 无缝切换（自上而下与自下而上对称）。

如果你希望在滚轮上也启用回弹过卷（例如纯 Canvas 场景的触控板手感），可以打开 `enableWheelBounce`。

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <ScrollView width={360} height={240}>
      <Column>
        <Container width={360} height={120} color={theme.background.surface}>
          <Text text="外层：垂直滚动容器（向下滚动）" color={theme.text.primary} />
        </Container>

        <ScrollView width={360} height={120} scrollBarColor={theme.text.secondary}>
          <Row>
            {Array.from({ length: 12 }).map((_, i) => (
              <Container
                key={i}
                width={120}
                height={120}
                color={i % 2 === 0 ? theme.state.selected : theme.background.container}
              >
                <Center>
                  <Text text={`卡片 ${i + 1}`} color={theme.text.primary} />
                </Center>
              </Container>
            ))}
          </Row>
        </ScrollView>

        <Container width={360} height={240} color={theme.background.surface}>
          <Text text="继续向下滚动：外层会接管；到达边界后交给页面滚动" color={theme.text.primary} />
        </Container>
      </Column>
    </ScrollView>
  );
})()
```

## API 文档

### ScrollViewProps

`ScrollView` 继承自 `Viewport`，拥有其所有属性（如 `width`, `height`, `scale`, `tx`, `ty` 等），并增加了以下特有属性：

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `overflow` | `'hidden' \| 'visible'` | 否 | `'hidden'` | 控制超出视口的内容是否裁剪。 |
| `scrollBarColor` | `string` | 否 | - | 滚动条颜色。 |
| `scrollBarWidth` | `number` | 否 | - | 滚动条宽度。 |
| `enableBounce` | `boolean` | 否 | `false` | 是否开启弹性滚动（回弹效果）。 |
| `enableWheelBounce` | `boolean` | 否 | `false` | 是否允许滚轮在边界继续过卷（会阻断链式滚动与 DOM 交接）。 |
| `enableBounceVertical` | `boolean` | 否 | - | 是否开启垂直方向弹性（默认跟随 `enableBounce`）。 |
| `enableBounceHorizontal` | `boolean` | 否 | - | 是否开启水平方向弹性（默认跟随 `enableBounce`）。 |
| `maxBounceDistance` | `number` | 否 | - | 最大回弹距离。 |
| `bounceDamping` | `number` | 否 | - | 回弹阻尼系数 (0-1)，值越大回弹越快。 |
| `bounceSpeedThreshold` | `number` | 否 | `1` | 触发回弹的速度阈值。 |
| `onBounceStart` | `() => void` | 否 | - | 回弹动画开始时的回调。 |
| `onBounceComplete` | `() => void` | 否 | - | 回弹动画完成时的回调。 |

### 实例方法 (Methods)

可以通过组件实例调用以下方法来控制滚动。

| 方法名 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `scrollTo` | `(x: number, y: number)` | `void` | 滚动到指定位置。 |
| `scrollBy` | `(dx: number, dy: number)` | `void` | 相对当前位置滚动。 |

## 注意事项

### 1. 性能优化
- `ScrollView` 默认开启 `overflow: 'hidden'`，这会使用 Canvas 的 `clip()` 操作。虽然这对实现滚动视图是必须的，但在嵌套极深的结构中频繁使用 clip 可能会影响性能。
- 建议仅在需要裁剪的层级使用 `ScrollView`，避免不必要的嵌套。

### 2. 兼容性
- `ScrollView` 自动处理了子元素的变换矩阵，因此子元素无需关心视口的偏移，只需根据自身逻辑绘制即可。
- 如果在 `ScrollView` 内部使用了绝对定位 (`Positioned`)，它们是相对于 `ScrollView` 内容区域定位的，会跟随滚动移动。

### 3. 常见问题
- **无法滚动？** 请确保 `width` 和 `height` 已正确设置（或由父级约束决定），且内容尺寸 (`_contentSize`) 确实大于视口尺寸。
- **滚动条不显示？** 确保 `scrollBarColor` 已设置，并且内容确实溢出了视口。

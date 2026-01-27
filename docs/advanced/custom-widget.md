---
id: custom-widget
title: 自定义组件
sidebar_position: 2
---

# 自定义组件

Inkwell 提供了两种主要的方式来创建自定义 Widget：**组合 (Composition)** 和 **自定义渲染 (Custom Rendering)**。

## 1. 组合方式 (`render` 方法)

这是最常用也是推荐的方式。通过组合已有的基础组件（如 `Container`, `Row`, `Text`）来构建新的 UI。这种方式类似于 React 的组件开发。

### 适用场景
- 通用 UI 组件封装（按钮、卡片、表单项）。
- 业务页面构建。
- 不涉及复杂图形绘制的场景。

### 实现方式
继承 `StatefulWidget` (或 `StatelessWidget`) 并实现 `render` 方法。

### 代码示例：Button 组件

参考 `src/demo/interactive-counter/widgets/class-button/index.tsx`：

```tsx
/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

import {
  Container,
  MainAxisAlignment,
  Row,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

interface ButtonProps extends WidgetProps {
  onClick?: (e: InkwellEvent) => void;
  theme: ThemePalette;
}

export class Button extends StatefulWidget<ButtonProps> {
  render() {
    return (
      <Container
        key="counter-btn"
        width={180}
        height={48}
        color={this.props.theme.primary}
        borderRadius={8}
      >
        <Row mainAxisAlignment={MainAxisAlignment.Center}>
          <Text
            key="counter-btn-text-01"
            text="点击"
            fontSize={16}
            color={this.props.theme.text.inverse}
            textAlign={TextAlign.Center}
            textAlignVertical={TextAlignVertical.Center}
          />
          {this.props.children}
        </Row>
      </Container>
    );
  }
}
```

### 优势
- **开发效率高**：利用现有组件快速搭建。
- 自动布局：无需手动计算尺寸和位置，依赖 Flex 布局系统。

---

## 2. 函数式组件 (Functional Component)

这是最轻量级的组件定义方式，适用于无状态的纯展示型组件封装。

### 适用场景
- 简单的 UI 片段复用。
- 只有 Props 没有 State 的组件。
- 拆分大型 `render` 函数。

### 实现方式
定义一个接收 `props` 并返回 JSX 的函数。

### 代码示例：Section 组件

```tsx
const Section = ({ title, children }: { title: string; children: any }) => (
  <Column spacing={12}>
    <Text text={title} fontSize={20} fontWeight="bold" />
    <Container padding={16} color="#FFFFFF">
      {children}
    </Container>
  </Column>
);

// 使用
<Section title="Hello">
  <Text text="World" />
</Section>
```

**注意**：函数式组件在编译阶段会被展开为它返回的 Widget 树，因此在运行时它不会作为独立的 Widget 存在于树中（类似于内联展开）。

---

## 3. 自定义渲染方式 (`paintSelf` 方法)

当你需要完全控制绘制逻辑，或者需要绘制标准组件无法实现的图形（如图表、仪表盘、自定义形状）时，使用此方式。

### 适用场景
- 图表库 (Charts)。
- 游戏画面。
- 复杂的几何图形。
- 需要极致性能的原子组件。

### 实现方式
继承 `Widget` 类，并重写 `performLayout` 和 `paintSelf` 方法。

### 代码示例：Circle 组件

```tsx
import {
  Widget,
  type BoxConstraints,
  type BuildContext,
  type Size,
  type WidgetProps,
} from '@/core/base';

interface CircleProps extends WidgetProps {
  radius: number;
  color: string;
}

export class Circle extends Widget<CircleProps> {
  constructor(props: CircleProps) {
    super(props);
  }

  // 1. 必须实现布局逻辑，告诉父组件自己多大
  protected performLayout(constraints: BoxConstraints, _childrenSizes: Size[]): Size {
    const diameter = this.props.radius * 2;
    // 确保尺寸不超过父组件约束
    return {
      width: Math.min(diameter, constraints.maxWidth),
      height: Math.min(diameter, constraints.maxHeight),
    };
  }

  // 2. 实现绘制逻辑
  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const { width, height } = this.renderObject.size;
    const radius = Math.min(width, height) / 2;
    const ctx = renderer.getRawInstance() as CanvasRenderingContext2D | null;
    if (!ctx) {
      return;
    }

    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = this.props.color;
    ctx.fill();
  }
}
```

### 性能注意事项
- **paintSelf 调用频繁**：每一帧都可能调用，避免在 `paintSelf` 中创建对象或进行复杂计算。
- **坐标系**：`paintSelf` 中的坐标是相对于组件左上角的（局部坐标），`renderer` 会自动处理全局变换。

---

## 4. 实战案例：Interactive Counter 组件对比

在 `src/demo/interactive-counter` 示例中，展示了三种不同的组件实现方式来构建同一个按钮功能。这有助于理解不同方式的特性和适用场景。

### 4.1 Class Component (`ClassButton`)
- **路径**: `widgets/class-button/index.tsx`
- **特点**: 标准的 `StatefulWidget`。
- **优势**: 完整的生命周期支持，可以使用 `setState` 管理内部状态（如 hover 态）。
- **实现**: `render()` 方法返回 `Container` 和 `Text` 的组合。

### 4.2 Functional Component (`FunctionalButton`)
- **路径**: `widgets/functional-button/index.tsx`
- **特点**: 无状态函数。
- **优势**: 写法极其简洁，无 `this` 上下文负担。
- **实现**: 仅仅是一个返回 JSX 的函数。

### 4.3 Raw Widget (`RawButton`)
- **路径**: `widgets/raw-button/index.ts`
- **特点**: 直接继承 `Widget`，无 `render` 方法。
- **优势**: 极致的性能控制，直接操作 Canvas 指令，无子组件树开销。
- **实现**: 实现了 `performLayout` (计算尺寸) 和 `paintSelf` (绘制矩形和文字)。

---

## 5. 注意事项：事件绑定的双重触发

在开发自定义组件（尤其是“外层是复合组件、内层用基础组件组合”的场景）时，需要注意事件绑定位置，否则可能出现同一个回调被触发多次。

### 现象
如果外层组件绑定了 `onClick`，同时又把同一个 `onClick` 继续传给内部可命中的子组件（例如 `Container`），在冒泡阶段可能会触发两次：先命中内层，再冒泡到外层。

### 原因
Inkwell 的事件系统支持捕获/冒泡。一次点击命中目标节点后，会沿着祖先链路继续分发（冒泡阶段）。当同一回调同时绑定在多层节点上时，就会出现重复调用。

同时也需要注意：事件分发时“类方法优先”。如果你在组件实例上实现了 `onClick/onClickCapture` 等同名方法，那么通过 JSX 属性注册到事件系统的处理器会被忽略；此时若你仍希望外部传入的 `props.onClick` 生效，需要在类方法中自行转发。

### 示例代码

```typescript
export class RawButton extends Widget<RawButtonProps> {
  // ...

  // ✅ 类方法优先：如果你实现了 onClick，JSX 属性注册的处理器将被忽略
  onClick(e: InkwellEvent) {
    // 可以在这里执行内部逻辑
    // 如果你希望外部传入的 onClick 生效，需要手动转发
    this.props.onClick?.(e);
  }
}
```

### 最佳实践建议

1.  **一个回调只绑定一层**
    - 外层组件需要响应点击时，不要再把同一个 `onClick` 继续传给内部 `Container`/`Row` 等子节点。
    - 如果确实需要内层节点处理事件，则外层避免再绑定相同回调，或在外层根据 event.target 做过滤。

2.  **明确类方法与 JSX 属性的优先级**
    - 你实现了 `onClick` 类方法时，JSX 属性注册的处理器会被忽略。
    - 因此“外部回调是否触发”由你的类方法决定：需要则转发，不需要则不转发。

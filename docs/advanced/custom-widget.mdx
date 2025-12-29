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

参考 `src/test/components/counter-tab/button.tsx`：

```tsx
import { StatefulWidget, WidgetProps } from '@/core/base';
import { Container, Row, Text } from '@/core';
import { EventHandler } from '@/core/events';
import { TextAlign, TextAlignVertical } from '@/core/text';

interface ButtonProps extends WidgetProps {
  onClick?: EventHandler;
  label?: string;
}

export class Button extends StatefulWidget<ButtonProps> {
  render() {
    return (
      <Container
        key="btn"
        width={180}
        height={48}
        color={'#1677ff'}
        borderRadius={8}
        onClick={this.props.onClick}
      >
        <Row>
          <Text
            text={this.props.label || "点击"}
            fontSize={16}
            color="#ffffff"
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
import { Widget, type WidgetProps, type BuildContext, type BoxConstraints, type Size } from '@/core/base';

interface CircleProps extends WidgetProps {
  radius: number;
  color: string;
}

export class Circle extends Widget<CircleProps> {
  constructor(props: CircleProps) {
    super(props);
  }

  // 1. 必须实现布局逻辑，告诉父组件自己多大
  protected performLayout(constraints: BoxConstraints): Size {
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
    
    // 使用 Canvas2D 接口绘制
    renderer.drawCircle({
      x: width / 2, // 相对坐标中心
      y: height / 2,
      radius: radius,
      fill: this.props.color,
    });
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

在开发自定义 `Raw Widget`（直接继承 `Widget`）时，需要特别注意事件处理的实现方式，否则可能导致事件回调被重复执行。

### 现象
如果在组件类中定义了 `onClick` 等事件处理方法，并且在该方法中手动调用了 `this.props.onClick`，会导致回调函数被执行两次。

### 原因
Inkwell 的事件分发机制 (`dispatcher`) 和自动绑定机制 (`bindEventsIfNeeded`) 会协同工作，导致潜在的冲突：

1.  **自动绑定**：基类 `Widget` 会自动扫描 `props` 中的 `on[Event]` 属性（如 `onClick`），并将其注册到事件系统 (`EventRegistry`)。
2.  **方法优先**：事件分发时，系统会优先查找并调用组件实例上定义的同名方法（如 `onClick(e)`）。
3.  **双重执行**：
    *   第一步：系统调用实例方法 `onClick(e)`。如果该方法内手动调用了 `this.props.onClick(e)`，则回调第一次执行。
    *   第二步：系统继续处理注册表中的监听器，自动注册的 `this.props.onClick` 会被再次调用，导致回调第二次执行。

### 示例代码

```typescript
export class RawButton extends Widget<RawButtonProps> {
  // ...

  // ❌ 错误示范：会导致双重触发
  onClick(e: InkwellEvent) {
    // 可以在这里执行内部逻辑
    console.log('Internal logic');
    
    // 警告：手动调用 props 回调会导致重复！
    // 因为基类已经自动为你注册了这个回调
    this.props.onClick?.(e); 
  }
  
  // 结果：this.props.onClick 被执行了两次
}
```

### 最佳实践建议

1.  **推荐：完全依赖自动绑定**
    *   不要在组件类中定义 `onClick` 等事件方法。
    *   直接依靠基类的自动机制，将 `props.onClick` 注册为事件处理函数。
    
    ```typescript
    // ✅ 推荐做法
    export class RawButton extends Widget<RawButtonProps> {
      // 不定义 onClick 方法
    }
    ```

2.  **仅处理内部逻辑**
    *   如果确实需要定义 `onClick` 来执行组件内部逻辑（如改变内部状态），请勿调用 `this.props.onClick`。
    
    ```typescript
    // ✅ 仅处理内部逻辑
    onClick(e: InkwellEvent) {
       this._active = true;
       this.markNeedsPaint();
       // 不要调用 this.props.onClick，让事件系统自动去调用它
    }
    ```

3.  **添加开发警告**
    *   如果在开发底层组件时担心误用，可以参考 `RawButton` 的实现，添加检测逻辑：

    ```typescript
    onClick(e: InkwellEvent) {
      if (this.props.onClick) {
        console.warn('检测到双重事件绑定，建议仅保留一种实现方式');
      }
      this.props.onClick?.(e);
    }
    ```

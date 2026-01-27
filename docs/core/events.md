---
id: events
title: 事件系统
sidebar_position: 3
---

# 事件系统

Inkwell 实现了一套参考 DOM 事件流的事件传播机制，支持从 Canvas 接收原生事件并将其分发到 Widget 树中的目标节点。

## 事件类型分类

Inkwell 支持多种交互事件，涵盖鼠标、触控和指针交互。

### 1. 鼠标事件 (Mouse Events)
| 事件名 | 描述 |
|--------|------|
| `click` | 单击 |
| `dblclick` | 双击 (兼容 `doubleclick`) |
| `contextmenu` | 右键菜单 |
| `mousedown` / `mouseup` | 按下 / 抬起 |
| `mousemove` | 移动 |
| `mouseenter` / `mouseleave` | 进入 / 离开 (不冒泡) |
| `mouseover` / `mouseout` | 进入 / 离开 (冒泡) |
| `wheel` | 滚轮滚动 |

### 2. 指针事件 (Pointer Events)
推荐使用 Pointer 事件以同时支持鼠标和触控。
| 事件名 | 描述 |
|--------|------|
| `pointerdown` | 指针按下 |
| `pointermove` | 指针移动 |
| `pointerup` | 指针抬起 |
| `pointerover` / `pointerout` | 指针进入 / 离开（冒泡） |
| `pointerenter` / `pointerleave` | 指针进入 / 离开（不冒泡） |

### 3. 触控事件 (Touch Events)
| 事件名 | 描述 |
|--------|------|
| `touchstart` | 触摸开始 |
| `touchmove` | 触摸移动 |
| `touchend` | 触摸结束 |
| `touchcancel` | 触摸取消 |

### 4. 键盘事件 (Keyboard Events)
| 事件名 | 描述 |
|--------|------|
| `keydown` | 键按下 |
| `keyup` | 键抬起 |
| `keypress` | 字符输入 |

> **注意**：
> 1. 键盘事件通常分发给**根节点 (Root Widget)** 或当前的**焦点节点**（如果实现了焦点管理）。
> 2. 键盘事件的接收依赖于 Canvas 的焦点状态。框架会为 Canvas 设置可聚焦能力（例如 `tabIndex=0`），但在某些场景下仍可能需要先点击一次画布区域才能激活快捷键。

### 5. 焦点事件 (Focus Events)
| 事件名 | 描述 |
|--------|------|
| `focus` | 获得焦点 |
| `blur` | 失去焦点 |

## 事件传播机制

事件传播分为三个阶段，与 DOM 事件流一致：

1.  **捕获阶段 (Capture Phase)**：事件从根节点 (Root) 向下传播到目标节点 (Target)。
2.  **目标阶段 (Target Phase)**：事件到达目标节点。
3.  **冒泡阶段 (Bubble Phase)**：事件从目标节点向上回传到根节点。

### 绑定方式

在 JSX 中，通过 `on[EventName]` 绑定冒泡阶段事件，通过 `on[EventName]Capture` 绑定捕获阶段事件。

```tsx
class MyButton extends StatefulWidget {
  render() {
    return (
      <Container
        // 冒泡阶段触发
        onClick={(e) => console.log('按钮点击', e)}
        // 捕获阶段触发
        onClickCapture={(e) => console.log('捕获阶段', e)}
      >
        <Text text="Click Me" />
      </Container>
    );
  }
}
```

### 阻止传播

在事件处理函数中调用 `e.stopPropagation()` 可阻止事件继续传播（包括捕获和冒泡的后续节点）。
此外，处理器返回 `false` 也会终止后续传播。

```typescript
const handleEvent = (e: InkwellEvent) => {
  console.log('Handled');
  e.stopPropagation(); // 父组件将不会收到此事件
};
```

## 自定义事件开发规范

### 1. 命中测试 (Hit Test)
事件系统依赖 `Hit Test` 算法来确定事件的目标节点。
- **自定义 Widget**：如果实现了 `paintSelf`，通常需要确保组件有明确的尺寸 (`performLayout`)。事件系统会根据 `renderObject` 的 `offset` 和 `size` 进行矩形碰撞检测。
- **透明区域**：默认情况下，透明区域也能响应点击，只要该点在组件的布局范围内。

### 2. 类方法处理
除了 JSX 属性，组件类也可以直接定义方法来处理事件，这种方式在性能上略优（避免闭包创建）。

```typescript
class MyComponent extends Widget {
  // 自动绑定到 click 事件
  onClick(e: InkwellEvent) {
    console.log('通过类方法收到点击', e);
  }
  
  // 自动绑定到 capture 阶段
  onClickCapture(e: InkwellEvent) {
    console.log('通过类方法收到捕获阶段事件', e);
  }
}
```

事件系统中涉及的常见字符串（事件类型、阶段、后缀等）集中定义在 [constants.ts](file:///Users/edeink/Documents/inkwell/src/core/events/constants.ts)，以保持一致性与可维护性。

## 常见问题排查指南

### Q: 为什么 `onClick` 不触发？
1.  **检查尺寸**：使用 DevTools 查看组件的 `width` 和 `height` 是否为 0。如果是 0，点击无法命中。
2.  **检查层级 (z-index)**：可能有其他透明组件覆盖在目标组件之上。
3.  **检查 pointerEvent**：确认组件或父组件没有设置 `pointerEvent: 'none'`。

### Q: 如何处理 Canvas 之外的点击？
Inkwell 的事件系统仅托管 Canvas 内部的事件。如果需要处理 Canvas 外部（如整个 Window）的点击（例如点击空白处关闭弹窗），请使用浏览器原生的 `document.addEventListener`。

### Q: `mouseenter` 和 `mouseover` 的区别？
- `mouseover` 会冒泡。当鼠标移入子组件时，父组件也会收到 `mouseover`。
- `mouseenter` 不冒泡。只有鼠标真正移入组件自身边界时触发，移入子组件不会再次触发父组件的 `mouseenter`。

### Q: 事件对象 `e` 中的坐标？
- `e.x`, `e.y`: 相对于 Canvas 左上角的坐标。
- `e.clientX`, `e.clientY`: 相对于浏览器视口的坐标。
- `e.target`: 实际被点击的最深层节点。
- `e.currentTarget`: 当前绑定事件处理函数的节点。

---
id: devtools
title: 开发者工具
sidebar_position: 4
---

# 开发者工具

Inkwell 配备了开发者工具 (DevTools)，用于实时检查 Widget 树、拾取高亮节点、查看与修改属性，帮助快速定位布局与交互问题。

## 启动与集成

DevTools 作为一个独立的浮层组件集成在你的应用中。

### 安装

在应用的根组件中引入并渲染 `DevTools`：

```tsx
import { DevTools } from '@/devtools';
import { MindMap } from './mindmap'; // 你的应用组件

function App() {
  return (
    <>
      {/* 你的业务组件 */}
      <MindMap />
      
      {/* 调试工具组件 */}
      <DevTools /> 
    </>
  );
}
```

### 快捷键
- **切换显示/隐藏**：`CmdOrCtrl + Shift + D`。
- **自定义快捷键**：可通过 `localStorage.setItem('INKWELL_DEVTOOLS_HOTKEY', 'CmdOrCtrl+Shift+D')` 覆盖默认组合键。
- **指定快捷键动作**：可将快捷键用于切换拾取模式（不传 `action` 默认用于显示/隐藏面板）。
  ```tsx
  <DevTools shortcut={{ combo: 'CmdOrCtrl+Shift+D', action: 'inspect' }} />
  ```

### 尝试一下
```tsx mode:render
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  const height = 32;

  const cardBg = theme.background.surface;
  const titleColor = theme.primary;
  const accentA = theme.state.selected;
  const accentB = theme.state.focus;

  return (
    <Container color={cardBg} borderRadius={12} padding={16}>
      <Column spacing={12}>
        <Text text="DevTools 调试入口" fontSize={18} color={titleColor} />

        <Row spacing={12} mainAxisSize="min">
          <Button
            theme={theme}
            btnType="primary"
            onClick={() => window.dispatchEvent(new Event('INKWELL_DEVTOOLS_TOGGLE'))}
          >
            <Text
              text="打开/关闭 DevTools"
              fontSize={14}
              lineHeight={height}
              color={theme.text.inverse}
              textAlignVertical={TextAlignVertical.Center}
              pointerEvent="none"
            />
          </Button>
        </Row>

        <Row spacing={12}>
          <Container width={160} height={96} color={accentA} borderRadius={12}>
            <Center>
              <Text text="示例 A" fontSize={16} color={theme.text.primary} />
            </Center>
          </Container>
          <Container width={160} height={96} color={accentB} borderRadius={12}>
            <Center>
              <Text text="示例 B" fontSize={16} color={theme.text.primary} />
            </Center>
          </Container>
        </Row>
      </Column>
    </Container>
  );
})()
```

## 核心功能

### 1. Widget 树检视 (Tree Inspector)

左侧面板展示了当前运行时的 Widget 树结构。
- **层级结构**：清晰展示父子关系。
- **组件类型**：显示 Widget 的类名（如 `Container`, `Text`, `Row`）。
- **Key**：显示组件的 Key，便于区分同类组件。

### 2. 属性编辑器 (Props Editor)

当在树中选中一个 Widget，或通过 Inspect 模式点击画布上的元素时，右侧面板会显示该组件的详细信息：
- **Props**：实时查看和修改组件属性（如 `width`, `height`, `color`）。修改后画布会立即刷新。
- **State**：对于 `StatefulWidget`，可以查看当前状态。
- **Layout**：显示组件的盒模型数据（Position, Size, Padding, Margin）。

### 3. 元素选取 (Inspect Mode)

拾取模式用于在画布上直接点选节点并联动到树视图与属性面板：

- 点击面板左上角的「拾取」按钮进入拾取模式。
- 鼠标悬浮在画布上时，会高亮当前指针下命中的节点。
- 点击后会选中该节点，并自动：
  - 在树视图中展开到该节点路径；
  - 将树滚动到可见区域；
  - 在右侧面板展示该节点的 Props / State / Layout 信息。

## 机制说明（便于排查问题）

- **命中测试**：拾取依赖运行时的命中测试结果（等价于对根节点做递归命中测试），因此会受到节点尺寸、位移/缩放等世界矩阵以及 `pointerEvent` 等属性影响。
- **高亮覆盖层**：高亮框通过一个 DOM Overlay 覆盖在 Canvas 之上绘制，不会拦截你的业务交互（仅用于提示）。
- **树数据构建**：面板展示的树由运行时 Widget 树转换得到；在面板可见且页面处于激活状态时，会按节流策略刷新以降低开销。

## 快捷键补充

- 默认快捷键为 `CmdOrCtrl + Shift + D`。
- 通过 `localStorage.setItem('INKWELL_DEVTOOLS_HOTKEY', '...')` 可以覆盖当前组合键（按下后立即生效）。
- 若你在集成时将 `DevTools` 的 `shortcut` 配置为 `{ combo, action: 'inspect' }`，同一组合键将用于切换拾取模式；否则默认用于切换面板显示/隐藏。

# 可编辑文本重构：Input 与 TextArea

本文档概述了新的 `Input` 和 `TextArea` 组件的设计与实现，旨在替代 demo 中旧有的 `EditableText`。

## 1. 设计概览

目标是提供类似 Flutter 的强大文本编辑能力，支持精确的布局控制、选区管理和滚动行为。

### 架构
- **框架**: InkWell (基于 Canvas 的 UI)。
- **基类**: `StatefulWidget`。
- **文本渲染**: 使用核心 `Text` 组件和 `TextLayout`。
- **滚动**: 使用核心 `ScrollView` 组件。
- **输入处理**: 使用隐藏的 DOM `<input>` (用于 `Input`) 或 `<textarea>` (用于 `TextArea`) 来捕获键盘事件和输入法合成。

### 组件

#### `Input` (单行输入)
- **滚动**: 仅水平滚动 (`enableBounceHorizontal: true`)。
- **布局**: 单行，不换行。
- **DOM**: `<input type="text">`。

#### `TextArea` (多行输入)
- **滚动**: 仅垂直滚动 (`enableBounceVertical: true`)。
- **布局**: 多行，自动换行 (`maxLines: Infinity`)。
- **DOM**: `<textarea>`。

## 2. 核心功能

### 2.1 文本定位与布局
- **点击测试**: 将指针坐标（相对于组件）转换为文本索引，利用 `TextLayout` 逻辑。
- **光标定位**:
  - `ArrowLeft` / `ArrowRight`: 按字符移动。
  - `ArrowUp` / `ArrowDown`: 按行移动（视觉垂直移动）。
  - `Home` / `End`: 移动到行首/行尾。
  - `Ctrl/Cmd + Home/End`: 移动到文档开头/结尾。

### 2.2 选区功能
- **视觉效果**: 在文本*下方*绘制彩色矩形。
- **交互**:
  - **鼠标拖拽**: 根据指针位置更新选区起点和终点。
  - **键盘**: `Shift + 方向键` 扩展或收缩选区。
  - **全选**: `Ctrl/Cmd + A`。

### 2.3 滚动与视口
- **自动滚动**: 当光标移动到可视视口之外时，`ScrollView` 自动滚动以确保光标可见。
- **输入同步**: 保持隐藏 DOM 元素与光标位置同步，以确保输入法候选窗口出现在正确位置（需要坐标映射）。

## 3. 实现细节

### 状态管理
```typescript
interface EditableState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  focused: boolean;
  cursorVisible: boolean; // 用于闪烁
  // ...
}
```

### 渲染结构
```tsx
<ScrollView>
  <Stack>
    {/* 1. 选区层 */}
    <CustomPaint painter={SelectionPainter} />
    
    {/* 2. 文本层 */}
    <Text ref={this.textRef} />
    
    {/* 3. 光标层 */}
    <Positioned >
       <Container color={cursorColor} />
    </Positioned>
  </Stack>
</ScrollView>
```

### 事件处理
- **指针事件**: 由组件处理（down, move, up）以管理焦点和选区。
- **键盘事件**: 由隐藏 DOM 元素处理。组件监听隐藏元素的 `input`, `keydown` 等事件。

## 4. 测试策略

测试文件位于 `__tests__` 目录，覆盖以下内容：

1.  **渲染**:
    - Input 渲染初始值。
    - TextArea 渲染初始值。

2.  **交互**:
    - 聚焦/失焦更新状态。
    - 输入更新文本。
    - 方向键移动光标。
    - Shift + 方向键更新选区。

3.  **滚动**:
    - 长文本触发滚动能力。
    - 光标移动触发自动滚动。

4.  **边界情况**:
    - 空文本。
    - 快速输入。

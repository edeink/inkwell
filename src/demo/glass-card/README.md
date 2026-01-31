# glass-card 示例说明

本目录是一个“磨砂玻璃卡片”示例（Canvas2D 自绘），核心组件为 `FrostedGlassCard`，并通过 `GlassCardComposite` 组合出“底层磨砂 + 上层文本内容”的完整卡片。

## 目录结构

- `index.tsx`：React 宿主入口，挂载 `InkwellCanvas`，在初始化/resize/主题变化时调用 `runApp` 触发重渲染。
- `app.tsx`：demo 的 Widget 树入口，包含页面布局、两张示例卡片与文案。
- `widgets/`
  - `frosted-glass-card/index.ts`：核心绘制组件（磨砂层 + 清晰窗口 + 底图缓存 + 文本采样回调）。
  - `glass-card-composite/index.tsx`：组合示例组件（底层 `FrostedGlassCard` + 上层文本内容），并使用采样结果更新文字样式。
  - `glass-button/index.tsx`：玻璃按钮组件（交互状态 + 特效调度），特效实现拆分在 `glass-button/effects/`。
- `helpers/`
  - `canvas.ts`：少量 Canvas 相关工具（圆角路径、可复现伪随机）。
  - `color-sampling.ts`：颜色采样与推荐文字样式（fast 1x1 缩放采样 + getImageData 回退）。
  - `frosted-glass-card-paint.ts`：从 `FrostedGlassCard` 抽出的绘制函数（底图层渲染、磨砂覆盖、清晰窗口与边框）。
- `__tests__/frosted-glass-card.spec.ts`：核心行为测试（缓存复用、key 刷新、layout/paint 更新策略等）。
- `assets/`：示例图片资源。

## 运行入口与渲染链路

1. React 侧渲染 `index.tsx`，内部挂载 `InkwellCanvas`。
2. `InkwellCanvas` 初始化完成后提供 `Runtime` 实例，触发 `runApp(runtime, width, height, theme)`。
3. `runApp` 在 `app.tsx` 中构建 `GlassCardDemoApp`，最终渲染两张 `GlassCardComposite`。
4. `GlassCardComposite` 内部将 `FrostedGlassCard` 作为底层，文本内容（`Text`）作为上层叠加，从而避免文本被磨砂层二次模糊。

## 组件关系与职责划分

### GlassCardComposite（组合层）

- 负责把“磨砂底层”和“上层内容”组合在一起。
- 负责计算 `textSampleRect`（文本区域的采样矩形），并把它传给 `FrostedGlassCard`。
- 通过 `onSuggestedTextStyleChange` 接收 `FrostedGlassCard` 的推荐文字样式（`fill/stroke`），并用 `setState` 更新上层文本渲染参数。

对应实现：[index.tsx](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/glass-card-composite/index.tsx)

### FrostedGlassCard（渲染层）

目标：在一个 Widget 内完成以下绘制效果：

- 卡片圆角裁剪
- “窗口外区域”磨砂模糊
- “窗口区域”保持清晰
- 可选扫光动画（60fps）
- 可选对指定区域做一次颜色采样，并回调推荐文字样式

对应实现：[index.ts](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/frosted-glass-card/index.ts)

### GlassButton（交互 + 特效调度）

`GlassButton` 是同一套磨砂玻璃视觉语言下的“按钮组件”，支持 hover/press 动画，并把特效实现拆成独立模块统一调度：

- 入口：[index.tsx](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/glass-button/index.tsx)
- 特效目录：[effects](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/glass-button/effects)
- 测试文件：[glass-button.effects.test.ts](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/glass-button/__tests__/glass-button.effects.test.ts)

内置特效（`activeVariant`）：

- `rim`：边缘光晕与高光描边
- `wave`：指针锚点的扩散波纹
- `prism`：棱镜折射的彩色带状高光
- `rhythm`：音律闪烁 + 可选音乐频谱柱（支持 `musicSpectrum`/`musicConfig`）
- `pulse`：呼吸/心跳式脉冲高光
- `glitch`：数字噪声/切片错位的故障感
- `frost`：霜雾凝结的颗粒纹理

#### 新增一种特效（5 步内）

1. 在 `widgets/glass-button/effects/` 新建 `<name>-effect.ts`，导出 `create<Name>Effect(): GlassButtonEffect`。
2. 在 [effect-types.ts](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/glass-button/effects/effect-types.ts) 的 `GlassButtonEffectName` 中加入新名称字面量。
3. 在 [effects/index.ts](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/glass-button/effects/index.ts) 里导出新文件。
4. 在 [glass-button/index.tsx](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/glass-button/index.tsx) 更新 `GlassButtonActiveVariant` 与 `ensureEffects()` 映射。
5. 在 [glass-button.effects.test.ts](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/glass-button/__tests__/glass-button.effects.test.ts) 补一条覆盖用例（至少覆盖 `paint`）。

## 底图缓存（baseLayer）

`FrostedGlassCard` 内部维护 `baseLayer`（离屏 canvas + ctx + key），用于缓存“静态底图内容”：

- 背景图（可选，cover 铺满、居中裁剪）
- 无背景图时的渐变 + 装饰斑点
- 清晰窗口底色与渐变

当 `baseLayer.key` 不变时，`canvas/context` 会被复用，从而避免重复分配与重复绘制静态内容。

key 的构成要点（高层描述）：

- 尺寸与 dpr（像素尺寸变化必须重绘）
- 窗口布局（windowX/Y/W/H/R 变化必须重绘）
- 背景图相关（src/version 变化必须重绘）
- 主题色（primary/secondary/background 变化必须重绘）

底图绘制函数抽在：[frosted-glass-card-paint.ts](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/helpers/frosted-glass-card-paint.ts)

## 磨砂绘制策略

磨砂只作用在“窗口外区域”，实现方式：

1. 用 `evenodd` 裁剪把窗口区域“挖洞”，得到窗口外区域的剪裁区域。
2. 对 baseLayer 做模糊绘制：
   - 优先：`ctx.filter = blur(px)`（性能更好）
   - 回退：多次小偏移采样近似模糊（兼容不支持 filter 的环境）
3. 叠加 `glassAlpha` 半透明覆盖层，增强“玻璃雾化”效果。
4. 可选：`animate=true` 时绘制扫光高光。

实现位置：[paintFrostedOverlay](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/helpers/frosted-glass-card-paint.ts#L97-L167)

## 清晰窗口绘制

清晰窗口的实现是“再绘制一遍 baseLayer，但只裁剪窗口区域”，保证窗口内不受模糊影响。

实现位置：[paintClearWindow](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/helpers/frosted-glass-card-paint.ts#L170-L191)

## 文本样式采样（只在必要时执行）

为了让上层文字在不同背景下更易读，`FrostedGlassCard` 支持对 `textSampleRect` 指定的区域采样平均颜色，并推荐 `fill/stroke`：

- fast 路径：把区域缩放绘制到 1x1 采样器，再读 1 个像素（低开销）
- 回退路径：`getImageData` 读取并稀疏采样做加权平均（控制采样点数量）

重要约束：

- 采样不会在 `performLayout` 或 `paint` 中执行（避免每帧读像素）。
- 采样只会在两类时机触发：
  - 背景图 `image.onload`（底图已更新，尺寸有效时采样一次）
  - `didUpdateWidget` 检测到与采样有关的属性变化时（主题/窗口/背景图/采样区域/回调变化）

相关实现：

- 采样函数：[color-sampling.ts](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/helpers/color-sampling.ts)
- 触发逻辑：[didUpdateWidget](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/widgets/frosted-glass-card/index.ts#L275-L336)

## 测试覆盖点

测试文件：[frosted-glass-card.spec.ts](file:///Users/edeink/Documents/inkwell/src/demo/glass-card/__tests__/frosted-glass-card.spec.ts)

- 基础绘制路径存在（底图 + 磨砂层 + 清晰窗口）
- 离屏底图缓存复用（避免重复创建 canvas）
- `windowRatio` 变化会刷新 `baseLayer.key` 但复用 canvas
- 约束不变时，绘制相关属性更新不应触发 `updateStaticCaches`
- 约束变化/尺寸属性变化会触发布局并更新静态缓存

## 常见改动点

- 调整磨砂强度：`blurPx`
- 调整玻璃雾化：`glassAlpha`
- 调整窗口布局：`windowRect` 或 `windowRatio`
- 接入业务文本：优先通过 `GlassCardComposite` 在上层叠加，避免文本被磨砂影响

/**
 * Flutter风格的布局错误类型
 */

export class FlutterLayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlutterLayoutError';
  }
}

export class RenderFlexError extends FlutterLayoutError {
  constructor(message: string) {
    super(`RenderFlex Error: ${message}`);
    this.name = 'RenderFlexError';
  }
}

/**
 * 创建Flutter风格的RenderFlex错误信息
 */
export function createRenderFlexUnboundedError(
  direction: 'vertical' | 'horizontal',
): RenderFlexError {
  const axis = direction === 'vertical' ? 'height' : 'width';
  const flexWidget = direction === 'vertical' ? 'column' : 'row';
  const scrollableType = direction === 'vertical' ? 'vertical scrollable' : 'horizontal scrollable';

  return new RenderFlexError(
    `RenderFlex 子组件具有非零的 flex 值，但传入的 ${axis} 约束是无界的。\n\n` +
      `当 ${flexWidget} 处于不提供有限 ${axis} 约束的父组件中时，` +
      `例如它在一个 ${scrollableType} 中，它将尝试沿 ${direction} 轴紧缩包裹其子组件。` +
      `在子组件上设置 flex（例如使用 Expanded）表示该子组件将扩展以填充 ${direction} 方向上的剩余空间。\n\n` +
      `这两个指令是互斥的。如果父组件要紧缩包裹其子组件，` +
      `子组件就不能同时扩展以适应其父组件。\n\n` +
      `请考虑将 mainAxisSize 设置为 MainAxisSize.min，并为灵活的子组件使用 FlexFit.loose 适配` +
      `（使用 Flexible 而不是 Expanded）。这将允许灵活的子组件将其大小调整为小于它们原本被迫占据的无限剩余空间，` +
      `从而使 RenderFlex 能够紧缩包裹子组件，而不是扩展以适应父组件提供的最大约束。`,
  );
}

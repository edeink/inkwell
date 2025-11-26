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
    `RenderFlex children have non-zero flex but incoming ${axis} constraints are unbounded.\n\n` +
      `When a ${flexWidget} is in a parent that does not provide a finite ${axis} constraint, for example if it is ` +
      `in a ${scrollableType}, it will try to shrink-wrap its children along the ${direction} axis. Setting a ` +
      `flex on a child (e.g. using Expanded) indicates that the child is to expand to fill the remaining ` +
      `space in the ${direction} direction.\n\n` +
      `These two directives are mutually exclusive. If a parent is to shrink-wrap its child, the child ` +
      `cannot simultaneously expand to fit its parent.\n\n` +
      `Consider setting mainAxisSize to MainAxisSize.min and using FlexFit.loose fits for the flexible ` +
      `children (using Flexible rather than Expanded). This will allow the flexible children to size ` +
      `themselves to less than the infinite remaining space they would otherwise be forced to take, and ` +
      `then will cause the RenderFlex to shrink-wrap the children rather than expanding to fit the maximum ` +
      `constraints provided by the parent.`,
  );
}

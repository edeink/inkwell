export const enum MainAxisAlignment {
  Start = 'start',
  Center = 'center',
  End = 'end',
  SpaceBetween = 'spaceBetween',
  SpaceAround = 'spaceAround',
  SpaceEvenly = 'spaceEvenly',
}

export const enum CrossAxisAlignment {
  Start = 'start',
  Center = 'center',
  End = 'end',
  Stretch = 'stretch',
}

/**
 * 主轴尺寸类型
 */
export const enum MainAxisSize {
  Min = 'min',
  Max = 'max',
}

/**
 * Flex扩展属性，类似Flutter的Flexible和Expanded
 */
export interface FlexProperties {
  flex?: number; // flex权重，类似Flutter的flex参数
  fit?: FlexFit; // 适应方式
}

/**
 * Flex适应方式
 */
export const enum FlexFit {
  Tight = 'tight', // 类似Expanded，强制占满可用空间
  Loose = 'loose', // 类似Flexible，可以小于可用空间
}

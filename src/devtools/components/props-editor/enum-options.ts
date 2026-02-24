/**
 * 属性编辑器枚举选项
 *
 * 提供常见属性名与可选值的映射。
 * 注意事项：用于对象编辑器的下拉选项。
 * 潜在副作用：无。
 */
import { AlignmentGeometry, StackFit } from '@/core';

const textAlignOptions = ['left', 'center', 'right'] as const;
const borderStyleOptions = ['solid', 'dashed', 'dotted'] as const;
const mainAxisAlignmentOptions = [
  'start',
  'center',
  'end',
  'spaceBetween',
  'spaceAround',
  'spaceEvenly',
] as const;
const crossAxisAlignmentOptions = ['start', 'center', 'end', 'stretch'] as const;
const mainAxisSizeOptions = ['min', 'max'] as const;
const alignmentGeometryOptions = Object.values(AlignmentGeometry);
const stackFitOptions = Object.values(StackFit);

/**
 * 枚举选项映射表
 *
 * 注意事项：键名需与属性名一致。
 * 潜在副作用：无。
 */
export const enumOptionsMap: Record<string, readonly string[]> = {
  cursor: [
    'auto',
    'default',
    'pointer',
    'move',
    'text',
    'not-allowed',
    'grab',
    'grabbing',
    'crosshair',
    'zoom-in',
    'zoom-out',
  ],
  display: ['block', 'inline', 'inline-block', 'flex', 'grid', 'none'],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  overflow: ['visible', 'hidden', 'scroll', 'auto'],
  textAlign: textAlignOptions,
  flexDirection: ['row', 'row-reverse', 'column', 'column-reverse'],
  justifyContent: [
    'flex-start',
    'center',
    'flex-end',
    'space-between',
    'space-around',
    'space-evenly',
  ],
  alignItems: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
  borderStyle: borderStyleOptions,
  style: borderStyleOptions,
  mainAxisAlignment: mainAxisAlignmentOptions,
  crossAxisAlignment: crossAxisAlignmentOptions,
  mainAxisSize: mainAxisSizeOptions,
  alignment: alignmentGeometryOptions,
  fit: stackFitOptions,
};

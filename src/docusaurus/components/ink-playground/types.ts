/**
 * InkPlayground 渲染模式
 * - render：仅渲染画布，不显示编辑器（原 readonly）
 * - edit：包含编辑器、预览与运行按钮
 * - code：纯代码展示，提供复制按钮，不进行渲染
 * - readonly: 包含编辑器、预览
 */
export type InkPlaygroundMode = 'render' | 'edit' | 'code' | 'readonly';

/**
 * InkPlayground 组件属性
 *
 * @property code 传入的源代码（ESX/TSX/JSX）
 * @property width 画布宽度，默认 600
 * @property height 画布高度，默认 300
 * @property mode 渲染模式（见 InkPlaygroundMode）
 */
export interface InkPlaygroundProps {
  code: string;
  width?: number;
  height?: number;
  mode?: InkPlaygroundMode;
}

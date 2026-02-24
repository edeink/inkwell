/**
 * Devtools 调整尺寸拖拽柄
 *
 * 提供统一的拖拽区域用于调整面板尺寸。
 * 注意事项：需传入鼠标按下回调以处理拖拽逻辑。
 * 潜在副作用：阻止鼠标事件冒泡。
 */
import type { CSSProperties, MouseEvent } from 'react';

/**
 * LayoutResizeHandle
 *
 * @param props 拖拽柄参数
 * @returns React 元素
 * @remarks
 * 注意事项：onResizeMouseDown 需处理拖拽。
 * 潜在副作用：会阻止鼠标事件冒泡。
 */
export function LayoutResizeHandle({
  className,
  cursor,
  onResizeMouseDown,
}: {
  className: string;
  cursor: CSSProperties['cursor'];
  onResizeMouseDown: (e: MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        onResizeMouseDown(e);
      }}
      className={className}
      style={{ cursor }}
    />
  );
}

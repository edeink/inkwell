import type { BoxConstraints, BuildContext, InkwellEvent, Size, WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

import { Widget } from '@/core';

export interface RawButtonProps extends WidgetProps {
  onClick?: (e: InkwellEvent) => void;
  width?: number;
  height?: number;
  theme: ThemePalette;
}

/**
 * RawButton - 直接实现 build/layout/paint 的原生组件
 * 不依赖 JSX 组合，展示最底层的 Widget 实现方式
 */
export class RawButton extends Widget<RawButtonProps> {
  private _width: number = 180;
  private _height: number = 48;

  constructor(data: RawButtonProps) {
    super(data);
    this._width = data.width ?? 180;
    this._height = data.height ?? 48;
  }

  // 4. 事件处理: 显式定义事件处理方法
  // 注意：这会导致双重触发，因为基类也会自动绑定 props 中的 onClick
  onClick(e: InkwellEvent) {
    // 检测到双重绑定风险时发出警告
    if (this.props.onClick) {
      console.warn('检测到双重事件绑定，建议仅保留一种实现方式');
    }

    this.props.onClick?.(e);
  }

  // 1. Build: 原生组件通常返回自身或 null，不进行子树组合
  build(_context: BuildContext): Widget {
    return this;
  }

  // 2. Layout: 计算自身尺寸
  protected performLayout(constraints: BoxConstraints): Size {
    // 简单的布局逻辑：尝试使用固定尺寸，但遵守父容器约束
    const width = Math.min(Math.max(this._width, constraints.minWidth), constraints.maxWidth);
    const height = Math.min(Math.max(this._height, constraints.minHeight), constraints.maxHeight);

    return { width, height };
  }

  // 3. Paint: 直接调用渲染器指令
  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const { size } = this.renderObject;
    const { theme } = this.props;

    // 绘制背景 (圆角矩形)
    renderer.drawRect({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      fill: theme.primary,
      borderRadius: 8,
    });

    // 绘制文字 (居中)
    // 简单计算居中位置
    const fontSize = 16;
    const text = 'Raw Btn';
    const textX = size.width / 2;
    const textY = (size.height - fontSize) / 2;

    renderer.drawText({
      text,
      x: textX,
      y: textY,
      color: '#ffffff',
      fontSize,
      textAlign: 'center',
      textBaseline: 'top',
    });
  }
}

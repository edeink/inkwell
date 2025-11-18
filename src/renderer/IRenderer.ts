/**
 * 渲染器配置接口
 */
export interface RendererOptions {
  /** 是否开启抗锯齿 */
  antialias?: boolean;
  /** 分辨率 */
  resolution?: number;
  /** 背景色 */
  background?: string | number;
  /** 背景透明度 */
  backgroundAlpha?: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}

/**
 * 渲染器接口
 * 所有渲染引擎实现都需要遵循此接口
 */
export interface IRenderer {
  /**
   * 初始化渲染器
   * @param container 容器元素
   * @param options 渲染器配置
   */
  initialize(
    container: HTMLElement,
    options: RendererOptions
  ): void | Promise<void>;

  /**
   * 调整渲染器大小
   * @param width 宽度
   * @param height 高度
   */
  resize(width: number, height: number): void;

  /**
   * 渲染一帧
   */
  render(): void;

  /**
   * 销毁渲染器，释放资源
   */
  destroy(): void;

  /**
   * 获取原始渲染器实例
   * 用于访问特定渲染引擎的高级功能
   * @returns 原始渲染器实例
   */
  getRawInstance(): unknown;

  /**
   * 保存当前绘图状态
   * 类似于Canvas 2D Context的save方法
   */
  save(): void;

  /**
   * 恢复之前保存的绘图状态
   * 类似于Canvas 2D Context的restore方法
   */
  restore(): void;

  /**
   * 平移坐标系
   * @param x X轴偏移量
   * @param y Y轴偏移量
   */
  translate(x: number, y: number): void;

  /**
   * 绘制文本
   * @param options 文本绘制选项
   */
  drawText(options: {
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    color?: string;
    lineHeight?: number;
    textAlign?: "left" | "center" | "right";
    textBaseline?: "top" | "middle" | "bottom";
    lines?: string[];
  }): void;

  /**
   * 绘制矩形
   * @param options 矩形绘制选项
   */
  drawRect(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }): void;

  /**
   * 绘制图片
   * @param options 图片绘制选项
   */
  drawImage(options: {
    image: HTMLImageElement;
    x: number;
    y: number;
    width: number;
    height: number;
    sx?: number; // 源图片裁剪起始X坐标
    sy?: number; // 源图片裁剪起始Y坐标
    sWidth?: number; // 源图片裁剪宽度
    sHeight?: number; // 源图片裁剪高度
  }): void;
}

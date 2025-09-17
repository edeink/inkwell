/**
 * 渲染器配置接口
 */
export interface RendererOptions {
  /** 是否开启抗锯齿 */
  antialias?: boolean;
  /** 分辨率 */
  resolution?: number;
  /** 背景色 */
  background?: string;
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
  initialize(container: HTMLElement, options: RendererOptions): void;
  
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
  getRawInstance(): any;
}
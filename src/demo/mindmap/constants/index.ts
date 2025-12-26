/**
 * 思维导图缩放配置常量
 * 用途：统一管理缩放功能的最小与最大倍数，避免各处硬编码
 */
export interface ScaleConfig {
  MIN_SCALE: number;
  MAX_SCALE: number;
}

export const SCALE_CONFIG: ScaleConfig = {
  MIN_SCALE: 0.2,
  MAX_SCALE: 8,
};

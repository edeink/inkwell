import type { GlassButtonEffectConfigMap } from './effects';
import type { GlassButtonActiveVariant } from './glass-button';

export * from './effects';
export { GlassButton } from './glass-button';
export type { GlassButtonActiveVariant, GlassButtonProps } from './glass-button';

type GlassButtonAnyEffectConfig = Partial<
  GlassButtonEffectConfigMap[keyof GlassButtonEffectConfigMap]
>;

export type GlassButtonVariantConfig =
  | GlassButtonAnyEffectConfig
  | { hover?: GlassButtonAnyEffectConfig; active?: GlassButtonAnyEffectConfig };

export interface GlassButtonVariant {
  /** 按钮文案（建议直接使用特效名，便于 demo 对照） */
  text: string;
  /** 左侧符号/字形（演示用途，不影响特效） */
  glyph: string;
  /** 特效主色（会作为按钮的 tint 注入到特效上下文） */
  tint: string;
  /** 当前按钮启用的特效名 */
  activeVariant: GlassButtonActiveVariant;
  /** 特效配置（由 activeVariant 对应特效解析） */
  config?: GlassButtonVariantConfig;
}

export const buttonVariants: GlassButtonVariant[] = [
  {
    text: '光环',
    glyph: '◉',
    tint: '#ffd45a',
    activeVariant: 'rim',
    config: {
      hover: {
        /** 外圈带宽（像素） */
        bandWidth: 2,
        /** 模糊半径（暗色主题） */
        blurDark: 3,
        /** 模糊半径（亮色主题） */
        blurLight: 4,
      },
      active: {
        /** 外圈带宽（像素） */
        bandWidth: 4,
        /** 模糊半径（暗色主题） */
        blurDark: 6,
        /** 模糊半径（亮色主题） */
        blurLight: 6,
      },
    },
  },
  {
    text: '浪潮',
    glyph: '≈',
    tint: '#2ec5ff',
    activeVariant: 'wave',
    config: {
      hover: {
        /** 模糊半径（暗色主题） */
        blurDark: 16,
        /** 模糊半径（亮色主题） */
        blurLight: 18,
        /** 浪峰高度（像素）：越大越“拍岸” */
        crestHeight: 16,
        /** 波长（像素）：越小波纹越密 */
        wavelength: 140,
        /** 速度（相位/秒）：越大越快 */
        speed: 1.25,
        /** 上岸距离比例（0..1）：strength=1 时浪能爬多高 */
        runupRatio: 0.62,
        /** 泡沫数量（越大越绵密） */
        foamCount: 30,
        /** 泡沫大小（像素） */
        foamSize: 3,
        /** 泡沫抖动（像素） */
        foamJitter: 10,
      },
      active: {
        /** 模糊半径（暗色主题） */
        blurDark: 16,
        /** 模糊半径（亮色主题） */
        blurLight: 18,
        /** 浪峰高度（像素）：越大越“拍岸” */
        crestHeight: 20,
        /** 波长（像素）：越小波纹越密 */
        wavelength: 140,
        /** 速度（相位/秒）：越大越快 */
        speed: 1.25,
        /** 上岸距离比例（0..1）：strength=1 时浪能爬多高 */
        runupRatio: 0.62,
        /** 泡沫数量（越大越绵密） */
        foamCount: 30,
        /** 泡沫大小（像素） */
        foamSize: 3,
        /** 泡沫抖动（像素） */
        foamJitter: 10,
      },
    },
  },
  {
    text: '音律',
    glyph: '⌁',
    tint: '#8f6bff',
    activeVariant: 'rhythm',
    config: {
      hover: {
        /** 频谱柱数量 */
        barCount: 18,
        /** 柱之间的间距（px） */
        barGap: 1,
        /** 内边距（px）：[top, right, bottom, left] */
        padding: [8, 18, 12, 72],
        /** 最小柱高占可用高度的比例（0..1） */
        minHeightRatio: 0.05,
        /** 最大柱高占可用高度的比例（0..1） */
        maxHeightRatio: 0.62,
        /** 上升速度（越大越“跟手”） */
        rise: 26,
        /** 衰减速度（越大越快回落） */
        fall: 16,
        /** 高度慢化系数（越大越平滑、越慢抖动） */
        heightSlowdown: 2.6,
        /** 频谱能量的幂次映射（>1 更集中，<1 更均匀） */
        spectrumPower: 0.92,
        /** 柱高缓动曲线（专有术语保留英文） */
        easing: 'quintOut',
        /** 底部光晕 blur（暗色主题） */
        glowBlurDark: 16,
        /** 底部光晕 blur（亮色主题） */
        glowBlurLight: 18,
        /** 柱体 blur（暗色主题） */
        barsBlurDark: 4,
        /** 柱体 blur（亮色主题） */
        barsBlurLight: 6,
        /** 是否启用粒子（此 demo 关闭，避免过嘈杂） */
        particles: false,
        /** 柱体渐变停靠点（pos: 0..1，从底到顶） */
        barGradientStops: [
          { pos: 0, color: 'rgba(255,255,255,0.92)' },
          { pos: 0.55, color: 'rgba(255,255,255,0.6)' },
          { pos: 1, color: 'rgba(143,107,255,0.42)' },
        ],
      },
      active: {
        /** 频谱柱数量 */
        barCount: 18,
        /** 柱之间的间距（px） */
        barGap: 1,
        /** 内边距（px）：[top, right, bottom, left] */
        padding: [8, 18, 12, 64],
        /** 最小柱高占可用高度的比例（0..1） */
        minHeightRatio: 0.05,
        /** 最大柱高占可用高度的比例（0..1） */
        maxHeightRatio: 0.82,
        /** 上升速度（越大越“跟手”） */
        rise: 26,
        /** 衰减速度（越大越快回落） */
        fall: 16,
        /** 高度慢化系数（越大越平滑、越慢抖动） */
        heightSlowdown: 2.6,
        /** 频谱能量的幂次映射（>1 更集中，<1 更均匀） */
        spectrumPower: 0.92,
        /** 柱高缓动曲线（专有术语保留英文） */
        easing: 'quintOut',
        /** 底部光晕 blur（暗色主题） */
        glowBlurDark: 16,
        /** 底部光晕 blur（亮色主题） */
        glowBlurLight: 18,
        /** 柱体 blur（暗色主题） */
        barsBlurDark: 4,
        /** 柱体 blur（亮色主题） */
        barsBlurLight: 6,
        /** 是否启用粒子（此 demo 关闭，避免过嘈杂） */
        particles: false,
        /** 柱体渐变停靠点（pos: 0..1，从底到顶） */
        barGradientStops: [
          { pos: 0, color: 'rgba(255,255,255,0.92)' },
          { pos: 0.55, color: 'rgba(255,255,255,0.6)' },
          { pos: 1, color: 'rgba(143,107,255,0.42)' },
        ],
      },
    },
  },
  {
    text: '棱镜',
    glyph: '▤',
    tint: '#59d9cf',
    activeVariant: 'prism',
    config: {
      hover: {
        /** 轮廓模糊半径（暗色主题） */
        outlineBlurDark: 2.2,
        /** 轮廓模糊半径（亮色主题） */
        outlineBlurLight: 2.6,
        /** 光带模糊半径（暗色主题） */
        bandBlurDark: 12,
        /** 光带模糊半径（亮色主题） */
        bandBlurLight: 14,
      },
      active: {
        /** 轮廓模糊半径（暗色主题） */
        outlineBlurDark: 2.2,
        /** 轮廓模糊半径（亮色主题） */
        outlineBlurLight: 2.6,
        /** 光带模糊半径（暗色主题） */
        bandBlurDark: 12,
        /** 光带模糊半径（亮色主题） */
        bandBlurLight: 14,
      },
    },
  },
  {
    text: '朋克',
    glyph: '⌗',
    tint: '#ff4bd9',
    activeVariant: 'cyberpunk',
    config: {
      hover: {
        /** 扫描线数量 */
        slices: 8,
        /** 扫描线宽度（像素） */
        sliceLineWidth: 1.2,
        /** 最大水平偏移（像素） */
        maxShift: 6,
        /** 雪花点数量 */
        dotCount: 20,
        /** 扫描线指示条宽度（像素） */
        scanLineWidth: 1,
        /** 模糊半径（暗色主题） */
        blurDark: 1.2,
        /** 模糊半径（亮色主题） */
        blurLight: 1,
      },
      active: {
        /** 扫描线数量 */
        slices: 12,
        /** 扫描线宽度（像素） */
        sliceLineWidth: 1.4,
        /** 最大水平偏移（像素） */
        maxShift: 8,
        /** 雪花点数量 */
        dotCount: 40,
        /** 扫描线指示条宽度（像素） */
        scanLineWidth: 1,
        /** 模糊半径（暗色主题） */
        blurDark: 2.2,
        /** 模糊半径（亮色主题） */
        blurLight: 2,
      },
    },
  },
  {
    text: '霜冻',
    glyph: '❄',
    tint: '#b6d5ff',
    activeVariant: 'frost',
    config: {
      hover: {
        /** 冰晶数量 */
        crystalCount: 24,
        /** 冰晶最大半径（像素） */
        maxCrystalRadius: 12,
        /** 边缘霜冻强度（0..1） */
        edgeStrength: 0.8,
        /** 模糊半径（暗色主题） */
        blurDark: 10,
        /** 模糊半径（亮色主题） */
        blurLight: 12,
      },
      active: {
        /** 冰晶数量 */
        crystalCount: 24,
        /** 冰晶最大半径（像素） */
        maxCrystalRadius: 12,
        /** 边缘霜冻强度（0..1） */
        edgeStrength: 0.8,
        /** 模糊半径（暗色主题） */
        blurDark: 10,
        /** 模糊半径（亮色主题） */
        blurLight: 12,
      },
    },
  },
];

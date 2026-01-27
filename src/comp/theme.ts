import { getCurrentTheme, type ThemePalette } from '@/styles/theme';

export type CompSize = 'small' | 'middle' | 'large';

export type CompStatus = 'default' | 'error' | 'warning';

export interface CompTokens {
  fontSize: number;
  lineHeight: number;
  borderRadius: number;
  borderWidth: number;
  controlHeight: Record<CompSize, number>;
  controlPaddingX: Record<CompSize, number>;
  controlFontSize: Record<CompSize, number>;
  shadow: {
    sm: { color: string; blur: number; offset: { x: number; y: number } };
    md: { color: string; blur: number; offset: { x: number; y: number } };
  };
}

export function getDefaultTheme(theme?: ThemePalette): ThemePalette {
  if (theme) {
    return theme;
  }
  return getCurrentTheme();
}

export function getDefaultTokens(theme?: ThemePalette): CompTokens {
  const resolvedTheme = getDefaultTheme(theme);
  return {
    fontSize: 14,
    lineHeight: 22,
    borderRadius: 6,
    borderWidth: 1,
    controlHeight: { small: 24, middle: 32, large: 40 },
    controlPaddingX: { small: 8, middle: 12, large: 16 },
    controlFontSize: { small: 12, middle: 14, large: 16 },
    shadow: {
      sm: { color: resolvedTheme.shadow.sm, blur: 8, offset: { x: 0, y: 2 } },
      md: { color: resolvedTheme.shadow.md, blur: 16, offset: { x: 0, y: 6 } },
    },
  };
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

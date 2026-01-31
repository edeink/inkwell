import type { WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

export enum WeatherKind {
  Sunny = 'sunny',
  Rainy = 'rainy',
  Snowy = 'snowy',
  Cloudy = 'cloudy',
  Stormy = 'stormy',
  Foggy = 'foggy',
}

export enum TimeOfDay {
  Day = 'day',
  Night = 'night',
}

export enum AtmosphereKind {
  DaySunny = 'day_sunny',
  DayCloudy = 'day_cloudy',
  DayRainy = 'day_rainy',
  DayStormy = 'day_stormy',
  DaySnowy = 'day_snowy',
  DayFoggy = 'day_foggy',
  NightSunny = 'night_sunny',
  NightCloudy = 'night_cloudy',
  NightRainy = 'night_rainy',
  NightStormy = 'night_stormy',
  NightSnowy = 'night_snowy',
  NightFoggy = 'night_foggy',
}

export type WeatherThemePalette = {
  bgTop: string;
  bgBottom: string;
  highlight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  iconStroke: string;
};

export interface GlassCalendarCardProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
  currentTime?: number;
  timelineStartTime?: number;
  timelineSelectedIndex?: number;
  timelineSegmentCount?: number;
  atmosphereFrom?: AtmosphereKind;
  atmosphereTo?: AtmosphereKind;
  atmosphereT?: number;
}

export interface GlassCalendarProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
  timelineSegmentCount?: number;
  initialWeatherMix?: number;
}

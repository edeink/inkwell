import { AtmosphereKind, TimeOfDay, WeatherKind, type WeatherThemePalette } from './calendar-types';

export const ATMOSPHERE_THEMES: Record<AtmosphereKind, WeatherThemePalette> = {
  [AtmosphereKind.DaySunny]: {
    bgTop: '#9dddf9',
    bgBottom: '#5aa7d9',
    highlight: '#e8fbff',
    textPrimary: '#ffffff',
    textSecondary: '#e3f5ff',
    textMuted: '#cfe9f6',
    accent: '#7ed0ff',
    iconStroke: '#2f4a5a',
  },
  [AtmosphereKind.DayRainy]: {
    bgTop: '#c9cdd2',
    bgBottom: '#8e949b',
    highlight: '#f1f3f5',
    textPrimary: '#1f2a33',
    textSecondary: '#2d3742',
    textMuted: '#6a747d',
    accent: '#9aa1a8',
    iconStroke: '#2c3136',
  },
  [AtmosphereKind.DaySnowy]: {
    bgTop: '#e6f2ff',
    bgBottom: '#89a4c8',
    highlight: '#f6fbff',
    textPrimary: '#ffffff',
    textSecondary: '#edf6ff',
    textMuted: '#d5e5f3',
    accent: '#c8e7ff',
    iconStroke: '#283a49',
  },
  [AtmosphereKind.DayCloudy]: {
    bgTop: '#d7e3ee',
    bgBottom: '#7ea0bf',
    highlight: '#f6fbff',
    textPrimary: '#ffffff',
    textSecondary: '#e9f2ff',
    textMuted: '#d0deeb',
    accent: '#a7c4dd',
    iconStroke: '#2b3b48',
  },
  [AtmosphereKind.DayStormy]: {
    bgTop: '#b8c1cc',
    bgBottom: '#4f5a66',
    highlight: '#f3f6fb',
    textPrimary: '#ffffff',
    textSecondary: '#e6edf7',
    textMuted: '#c9d3df',
    accent: '#9c8cff',
    iconStroke: '#1f2830',
  },
  [AtmosphereKind.DayFoggy]: {
    bgTop: '#edf2f7',
    bgBottom: '#a7b8c9',
    highlight: '#ffffff',
    textPrimary: '#1f2a33',
    textSecondary: '#2d3742',
    textMuted: '#6a747d',
    accent: '#d5dee8',
    iconStroke: '#27313a',
  },
  [AtmosphereKind.NightSunny]: {
    bgTop: '#142a4f',
    bgBottom: '#07152c',
    highlight: '#eaf2ff',
    textPrimary: '#ffffff',
    textSecondary: '#e3eeff',
    textMuted: '#b9cbe4',
    accent: '#7ea7ff',
    iconStroke: '#d8e8ff',
  },
  [AtmosphereKind.NightCloudy]: {
    bgTop: '#17263a',
    bgBottom: '#0b1220',
    highlight: '#eaf2ff',
    textPrimary: '#ffffff',
    textSecondary: '#e1edff',
    textMuted: '#b7c7de',
    accent: '#7ea7ff',
    iconStroke: '#d8e8ff',
  },
  [AtmosphereKind.NightRainy]: {
    bgTop: '#1b2a33',
    bgBottom: '#0b151b',
    highlight: '#e9f3ff',
    textPrimary: '#ffffff',
    textSecondary: '#e3eeff',
    textMuted: '#b9cbe4',
    accent: '#6b8aa6',
    iconStroke: '#d8e8ff',
  },
  [AtmosphereKind.NightStormy]: {
    bgTop: '#1d1d3a',
    bgBottom: '#0b0b1e',
    highlight: '#f1f1ff',
    textPrimary: '#ffffff',
    textSecondary: '#e8e8ff',
    textMuted: '#c5c5f0',
    accent: '#a48cff',
    iconStroke: '#f2edff',
  },
  [AtmosphereKind.NightSnowy]: {
    bgTop: '#12223a',
    bgBottom: '#071527',
    highlight: '#eff6ff',
    textPrimary: '#ffffff',
    textSecondary: '#e3eeff',
    textMuted: '#b9cbe4',
    accent: '#b9ddff',
    iconStroke: '#d8e8ff',
  },
  [AtmosphereKind.NightFoggy]: {
    bgTop: '#1a2430',
    bgBottom: '#0a111a',
    highlight: '#eef5ff',
    textPrimary: '#ffffff',
    textSecondary: '#e3eeff',
    textMuted: '#b9cbe4',
    accent: '#c2ceda',
    iconStroke: '#d8e8ff',
  },
};

export const WEATHER_KIND_ORDER: WeatherKind[] = [
  WeatherKind.Sunny,
  WeatherKind.Cloudy,
  WeatherKind.Rainy,
  WeatherKind.Stormy,
  WeatherKind.Snowy,
  WeatherKind.Foggy,
];

export const ATMOSPHERE_MAP: Record<TimeOfDay, Record<WeatherKind, AtmosphereKind>> = {
  [TimeOfDay.Day]: {
    [WeatherKind.Sunny]: AtmosphereKind.DaySunny,
    [WeatherKind.Cloudy]: AtmosphereKind.DayCloudy,
    [WeatherKind.Rainy]: AtmosphereKind.DayRainy,
    [WeatherKind.Stormy]: AtmosphereKind.DayStormy,
    [WeatherKind.Snowy]: AtmosphereKind.DaySnowy,
    [WeatherKind.Foggy]: AtmosphereKind.DayFoggy,
  },
  [TimeOfDay.Night]: {
    [WeatherKind.Sunny]: AtmosphereKind.NightSunny,
    [WeatherKind.Cloudy]: AtmosphereKind.NightCloudy,
    [WeatherKind.Rainy]: AtmosphereKind.NightRainy,
    [WeatherKind.Stormy]: AtmosphereKind.NightStormy,
    [WeatherKind.Snowy]: AtmosphereKind.NightSnowy,
    [WeatherKind.Foggy]: AtmosphereKind.NightFoggy,
  },
};

export const ATMOSPHERE_TO_TIME: Record<AtmosphereKind, TimeOfDay> = {
  [AtmosphereKind.DaySunny]: TimeOfDay.Day,
  [AtmosphereKind.DayCloudy]: TimeOfDay.Day,
  [AtmosphereKind.DayRainy]: TimeOfDay.Day,
  [AtmosphereKind.DayStormy]: TimeOfDay.Day,
  [AtmosphereKind.DaySnowy]: TimeOfDay.Day,
  [AtmosphereKind.DayFoggy]: TimeOfDay.Day,
  [AtmosphereKind.NightSunny]: TimeOfDay.Night,
  [AtmosphereKind.NightCloudy]: TimeOfDay.Night,
  [AtmosphereKind.NightRainy]: TimeOfDay.Night,
  [AtmosphereKind.NightStormy]: TimeOfDay.Night,
  [AtmosphereKind.NightSnowy]: TimeOfDay.Night,
  [AtmosphereKind.NightFoggy]: TimeOfDay.Night,
};

export const ATMOSPHERE_TO_WEATHER: Record<AtmosphereKind, WeatherKind> = {
  [AtmosphereKind.DaySunny]: WeatherKind.Sunny,
  [AtmosphereKind.DayCloudy]: WeatherKind.Cloudy,
  [AtmosphereKind.DayRainy]: WeatherKind.Rainy,
  [AtmosphereKind.DayStormy]: WeatherKind.Stormy,
  [AtmosphereKind.DaySnowy]: WeatherKind.Snowy,
  [AtmosphereKind.DayFoggy]: WeatherKind.Foggy,
  [AtmosphereKind.NightSunny]: WeatherKind.Sunny,
  [AtmosphereKind.NightCloudy]: WeatherKind.Cloudy,
  [AtmosphereKind.NightRainy]: WeatherKind.Rainy,
  [AtmosphereKind.NightStormy]: WeatherKind.Stormy,
  [AtmosphereKind.NightSnowy]: WeatherKind.Snowy,
  [AtmosphereKind.NightFoggy]: WeatherKind.Foggy,
};

const ATMOSPHERE_THRESHOLDS: Array<{ max: number; kind: AtmosphereKind }> = [
  { max: 0.2, kind: AtmosphereKind.DaySunny },
  { max: 0.4, kind: AtmosphereKind.DayRainy },
  { max: 0.6, kind: AtmosphereKind.DaySnowy },
  { max: 0.8, kind: AtmosphereKind.NightSunny },
  { max: 1, kind: AtmosphereKind.NightRainy },
];

export function initialAtmosphereFromMix(mix: number): AtmosphereKind {
  const t = Math.max(0, Math.min(1, mix));
  for (const item of ATMOSPHERE_THRESHOLDS) {
    if (t < item.max) {
      return item.kind;
    }
  }
  return AtmosphereKind.NightSunny;
}

export function toAtmosphereKind(timeOfDay: TimeOfDay, weather: WeatherKind): AtmosphereKind {
  return ATMOSPHERE_MAP[timeOfDay]?.[weather] ?? ATMOSPHERE_MAP[TimeOfDay.Day][WeatherKind.Sunny];
}

export function toggleTimeOfDay(timeOfDay: TimeOfDay): TimeOfDay {
  return timeOfDay === TimeOfDay.Day ? TimeOfDay.Night : TimeOfDay.Day;
}

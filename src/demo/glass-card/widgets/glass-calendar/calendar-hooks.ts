import {
  ATMOSPHERE_TO_TIME,
  ATMOSPHERE_TO_WEATHER,
  initialAtmosphereFromMix,
} from './atmosphere-themes';
import { addDays, clamp, startOfDay } from './calendar-utils';

import type { AtmosphereKind, GlassCalendarProps, TimeOfDay, WeatherKind } from './calendar-types';

export type GlassCalendarState = {
  timelineSegmentCount: number;
  timelineStartTime: number;
  timelineSelectedIndex: number;
  timeOfDay: TimeOfDay;
  weatherKind: WeatherKind;
  atmosphereFrom: AtmosphereKind;
  atmosphereTo: AtmosphereKind;
  atmosphereT: number;
  navHover: 'prev' | 'next' | null;
  actionHover: 'timeOfDay' | 'weather' | null;
  actionDown: 'timeOfDay' | 'weather' | null;
};

export function initGlassCalendarState(
  data: GlassCalendarProps,
  base: GlassCalendarState,
): GlassCalendarState {
  const segmentCount =
    typeof data.timelineSegmentCount === 'number' && Number.isFinite(data.timelineSegmentCount)
      ? Math.max(7, Math.floor(data.timelineSegmentCount))
      : base.timelineSegmentCount;
  const centerIndex = Math.floor(segmentCount / 2);
  const today = startOfDay(new Date());
  const startTime = addDays(today, -centerIndex).getTime();
  const weatherMix =
    typeof data.initialWeatherMix === 'number' && Number.isFinite(data.initialWeatherMix)
      ? clamp(data.initialWeatherMix, 0, 1)
      : 0;
  const initialAtmosphere = initialAtmosphereFromMix(weatherMix);
  const initialTimeOfDay = ATMOSPHERE_TO_TIME[initialAtmosphere] ?? base.timeOfDay;
  const initialWeather = ATMOSPHERE_TO_WEATHER[initialAtmosphere] ?? base.weatherKind;
  return {
    ...base,
    timelineSegmentCount: segmentCount,
    timelineStartTime: startTime,
    timelineSelectedIndex: centerIndex,
    timeOfDay: initialTimeOfDay,
    weatherKind: initialWeather,
    atmosphereFrom: initialAtmosphere,
    atmosphereTo: initialAtmosphere,
    atmosphereT: 0,
    navHover: null,
    actionHover: null,
    actionDown: null,
  };
}

export function computeNextTimelineSelection(
  input: { timelineSegmentCount: number; timelineStartTime: number; timelineSelectedIndex: number },
  delta: number,
): { timelineStartTime: number; timelineSelectedIndex: number } {
  const segmentCount = input.timelineSegmentCount;
  const edge = Math.min(3, Math.max(0, Math.floor(segmentCount / 2) - 1));
  let nextStartTime = input.timelineStartTime;
  let nextSelectedIndex = input.timelineSelectedIndex + delta;

  if (nextSelectedIndex < 0) {
    nextStartTime = addDays(new Date(nextStartTime), -1).getTime();
    nextSelectedIndex = 0;
  } else if (nextSelectedIndex > segmentCount - 1) {
    nextStartTime = addDays(new Date(nextStartTime), 1).getTime();
    nextSelectedIndex = segmentCount - 1;
  }

  if (segmentCount > edge * 2 + 1) {
    while (nextSelectedIndex < edge) {
      nextStartTime = addDays(new Date(nextStartTime), -1).getTime();
      nextSelectedIndex += 1;
    }
    while (nextSelectedIndex > segmentCount - 1 - edge) {
      nextStartTime = addDays(new Date(nextStartTime), 1).getTime();
      nextSelectedIndex -= 1;
    }
  }

  return { timelineStartTime: nextStartTime, timelineSelectedIndex: nextSelectedIndex };
}

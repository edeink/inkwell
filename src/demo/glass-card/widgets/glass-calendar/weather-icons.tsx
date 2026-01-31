/** @jsxImportSource @/utils/compiler */
import { TimeOfDay, WeatherKind } from './calendar-types';

import type { Widget } from '@/core';

import { Container, Icon } from '@/core';

export const SunnyWeatherSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="2"/>',
  '<path d="M12 2.8V5.2M12 18.8V21.2M2.8 12H5.2M18.8 12H21.2M4.6 4.6L6.3 6.3M17.7 17.7L19.4 19.4',
  'M19.4 4.6L17.7 6.3M6.3 17.7L4.6 19.4" stroke="currentColor" stroke-width="2"',
  ' stroke-linecap="round"/></svg>',
].join('');

export const RainyWeatherSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M7.6 12.6C6.2 12.6 5 11.5 5 10.1c0-1.2.8-2.2 1.9-2.5',
  ' .3-2.3 2.3-4.1 4.8-4.1 2 0 3.7 1.1 4.5 2.7 .2 0 .4-.1',
  ' .7-.1 1.8 0 3.2 1.4 3.2 3.2 0 1.8-1.4 3.2-3.2 3.2H7.6Z"',
  ' fill="currentColor"/>',
  '<path d="M9 14.6L7.8 17.2M13 14.6L11.8 17.2M17 14.6L15.8 17.2"',
  ' stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
].join('');

export const NightTimeSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M15.6 13.9c-3.2 0-5.8-2.6-5.8-5.8 0-1.5.6-2.9 1.5-4',
  ' -3.6.9-6.3 4.1-6.3 8 0 4.6 3.7 8.3 8.3 8.3 3.9 0 7.1-2.7 8-6.3',
  ' -1.1.9-2.5 1.5-4 1.5Z" fill="currentColor"/>',
  '<path d="M18.8 5.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z"',
  ' fill="currentColor" opacity="0.9"/>',
  '</svg>',
].join('');

export const CloudyWeatherSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M7.2 14.4C5.4 14.4 4 13 4 11.2c0-1.5 1-2.7 2.4-3.1',
  ' .5-2.8 2.9-4.9 5.9-4.9 2.3 0 4.4 1.2 5.4 3.1 .2 0 .5-.1 .8-.1',
  ' 2.2 0 4 1.8 4 4s-1.8 4-4 4H7.2Z" fill="currentColor"/>',
  '</svg>',
].join('');

export const StormyWeatherSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M7.2 12.8C5.4 12.8 4 11.4 4 9.6c0-1.5 1-2.7 2.4-3.1',
  ' .5-2.8 2.9-4.9 5.9-4.9 2.3 0 4.4 1.2 5.4 3.1 .2 0 .5-.1 .8-.1',
  ' 2.2 0 4 1.8 4 4 0 2.2-1.8 4-4 4H7.2Z" fill="currentColor"/>',
  '<path d="M12.3 13.6l-2.2 4.2h2.4l-1.3 3.2 4.7-5.9h-2.6l1-1.5"',
  ' fill="currentColor" opacity="0.95"/>',
  '</svg>',
].join('');

export const FoggyWeatherSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M5 8.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  '<path d="M3.8 12h16.4" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" opacity="0.9"/>',
  '<path d="M5.6 15.5h12.8" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" opacity="0.8"/>',
  '</svg>',
].join('');

export const DayTimeSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<circle cx="12" cy="12" r="4.2" fill="currentColor" opacity="0.95"/>',
  '<path d="M12 2.6V5.1M12 18.9V21.4M2.6 12H5.1M18.9 12H21.4M4.6 4.6L6.4 6.4',
  'M17.6 17.6L19.4 19.4M19.4 4.6L17.6 6.4M6.4 17.6L4.6 19.4"',
  ' stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>',
  '</svg>',
].join('');

export const SnowyWeatherSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M12 3.2v17.6M5 7l14 10M19 7L5 17" stroke="currentColor" stroke-width="2"',
  ' stroke-linecap="round" stroke-linejoin="round"/>',
  '<path d="M12 6.2l-1.3 1.3M12 6.2l1.3 1.3M8.2 9.4l-1.7.1M8.2 9.4l-.7-1.6"',
  ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>',
  '<path d="M15.8 9.4l1.7.1M15.8 9.4l.7-1.6" stroke="currentColor" stroke-width="1.6"',
  ' stroke-linecap="round" opacity="0.9"/>',
  '<path d="M12 17.8l-1.3-1.3M12 17.8l1.3-1.3M8.2 14.6l-1.7-.1M8.2 14.6l-.7 1.6"',
  ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>',
  '<path d="M15.8 14.6l1.7-.1M15.8 14.6l.7 1.6" stroke="currentColor" stroke-width="1.6"',
  ' stroke-linecap="round" opacity="0.9"/>',
  '</svg>',
].join('');

export const ChevronLeftSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M14.5 6.5L9.5 12L14.5 17.5" stroke="currentColor" stroke-width="2.5"',
  ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
].join('');

export const ChevronRightSvg = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M9.5 6.5L14.5 12L9.5 17.5" stroke="currentColor" stroke-width="2.5"',
  ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
].join('');

export const WeatherIconSvgs: Record<WeatherKind, string> = {
  [WeatherKind.Sunny]: SunnyWeatherSvg,
  [WeatherKind.Cloudy]: CloudyWeatherSvg,
  [WeatherKind.Rainy]: RainyWeatherSvg,
  [WeatherKind.Stormy]: StormyWeatherSvg,
  [WeatherKind.Snowy]: SnowyWeatherSvg,
  [WeatherKind.Foggy]: FoggyWeatherSvg,
};

export const TimeOfDayIconSvgs: Record<TimeOfDay, string> = {
  [TimeOfDay.Day]: DayTimeSvg,
  [TimeOfDay.Night]: NightTimeSvg,
};

export function WeatherIcon(props: {
  kind: WeatherKind;
  size: number;
  color: string;
  boxSize?: number;
}): Widget {
  const box = typeof props.boxSize === 'number' ? props.boxSize : 24;
  return (
    <Container width={box} height={box} alignment="center" pointerEvent="none">
      <Icon svg={WeatherIconSvgs[props.kind]} size={props.size} color={props.color} />
    </Container>
  );
}

export function TimeOfDayIcon(props: {
  kind: TimeOfDay;
  size: number;
  color: string;
  boxSize?: number;
}): Widget {
  const box = typeof props.boxSize === 'number' ? props.boxSize : 24;
  return (
    <Container width={box} height={box} alignment="center" pointerEvent="none">
      <Icon svg={TimeOfDayIconSvgs[props.kind]} size={props.size} color={props.color} />
    </Container>
  );
}

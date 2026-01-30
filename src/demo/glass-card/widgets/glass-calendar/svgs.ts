import { WeatherKind } from '../glass-calendar-card';

/*
 * 统一存放玻璃日历 demo 的内联 SVG。
 * 这些字符串在 UI 渲染中会被频繁引用，抽离到模块级避免每次 render 重新拼接与分配。
 */

export const SUNNY_SVG = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="2"/>',
  '<path d="M12 2.8V5.2M12 18.8V21.2M2.8 12H5.2M18.8 12H21.2M4.6 4.6L6.3 6.3M17.7 17.7L19.4 19.4',
  'M19.4 4.6L17.7 6.3M6.3 17.7L4.6 19.4" stroke="currentColor" stroke-width="2"',
  ' stroke-linecap="round"/></svg>',
].join('');

export const RAINY_SVG = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M7.6 12.6C6.2 12.6 5 11.5 5 10.1c0-1.2.8-2.2 1.9-2.5',
  ' .3-2.3 2.3-4.1 4.8-4.1 2 0 3.7 1.1 4.5 2.7 .2 0 .4-.1',
  ' .7-.1 1.8 0 3.2 1.4 3.2 3.2 0 1.8-1.4 3.2-3.2 3.2H7.6Z"',
  ' fill="currentColor"/>',
  '<path d="M9 14.6L7.8 17.2M13 14.6L11.8 17.2M17 14.6L15.8 17.2"',
  ' stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
].join('');

export const NIGHT_SVG = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M15.6 13.9c-3.2 0-5.8-2.6-5.8-5.8 0-1.5.6-2.9 1.5-4',
  ' -3.6.9-6.3 4.1-6.3 8 0 4.6 3.7 8.3 8.3 8.3 3.9 0 7.1-2.7 8-6.3',
  ' -1.1.9-2.5 1.5-4 1.5Z" fill="currentColor"/>',
  '<path d="M18.8 5.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z"',
  ' fill="currentColor" opacity="0.9"/>',
  '</svg>',
].join('');

export const SNOWY_SVG = [
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

export const WEATHER_ICON_SVGS: Record<WeatherKind, string> = {
  [WeatherKind.Sunny]: SUNNY_SVG,
  [WeatherKind.Rainy]: RAINY_SVG,
  [WeatherKind.Snowy]: SNOWY_SVG,
  [WeatherKind.Night]: NIGHT_SVG,
};

export const CHEVRON_LEFT_SVG = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M14.5 6.5L9.5 12L14.5 17.5" stroke="currentColor" stroke-width="2.5"',
  ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
].join('');

export const CHEVRON_RIGHT_SVG = [
  '<svg width="24" height="24" viewBox="0 0 24 24"',
  ' fill="none" xmlns="http://www.w3.org/2000/svg">',
  '<path d="M9.5 6.5L14.5 12L9.5 17.5" stroke="currentColor" stroke-width="2.5"',
  ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
].join('');

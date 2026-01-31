import {
  ChevronLeftSvg,
  ChevronRightSvg,
  TimeOfDayIconSvgs,
  WeatherIconSvgs,
} from './weather-icons';

/*
 * 统一存放玻璃日历 demo 的内联 SVG。
 * 这些字符串在 UI 渲染中会被频繁引用，抽离到模块级避免每次 render 重新拼接与分配。
 */

export const WEATHER_ICON_SVGS = WeatherIconSvgs;

export const TIME_OF_DAY_ICON_SVGS = TimeOfDayIconSvgs;

export const CHEVRON_LEFT_SVG = ChevronLeftSvg;

export const CHEVRON_RIGHT_SVG = ChevronRightSvg;

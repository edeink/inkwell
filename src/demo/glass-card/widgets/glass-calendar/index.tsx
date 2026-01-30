/** @jsxImportSource @/utils/compiler */
import { GlassCalendarCard, WEATHER_THEMES, WeatherKind } from '../glass-calendar-card';

import { CHEVRON_LEFT_SVG, CHEVRON_RIGHT_SVG, WEATHER_ICON_SVGS } from './svgs';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  Icon,
  MainAxisSize,
  Positioned,
  Row,
  Stack,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type Widget,
  type WidgetProps,
} from '@/core';
import { applyAlpha } from '@/core/helper/color';
import { Themes } from '@/styles/theme';

export interface GlassCalendarProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
  timelineSegmentCount?: number;
  initialWeatherMix?: number;
}

enum NavDir {
  Prev = 'prev',
  Next = 'next',
}

type NavHover = NavDir | null;

/*
 * GlassCalendar：负责交互与状态（日期滚动、天气切换），并组合内容层 + GlassCalendarCard 特效层。
 * render 属于高频路径：把 SVG/颜色表/顺序表等常量上移到模块级，避免每次 render 重新分配对象与字符串。
 */

const DEFAULT_WIDTH = 520;
const DEFAULT_HEIGHT = 320;
const TODAY_LABEL = 'Today';
const TODAY_CHIP_COLOR = '#ffffff';
const WEATHER_ICON_SIZE = 20;
const WEATHER_RADIUS = 18;

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// 天气轮播顺序：点击右上角天气按钮时按该顺序切换
const WEATHER_KIND_ORDER: WeatherKind[] = [
  WeatherKind.Sunny,
  WeatherKind.Rainy,
  WeatherKind.Snowy,
  WeatherKind.Night,
];

// 初始天气：根据 mix（0~1）映射到离散天气类型
const WEATHER_KIND_THRESHOLDS: Array<{ max: number; kind: WeatherKind }> = [
  { max: 0.25, kind: WeatherKind.Sunny },
  { max: 0.5, kind: WeatherKind.Rainy },
  { max: 0.75, kind: WeatherKind.Snowy },
  { max: 1, kind: WeatherKind.Night },
];

// 天气图标颜色：用于 Icon 的 rgba 混合
const WEATHER_COLORS: Record<WeatherKind, string> = {
  [WeatherKind.Sunny]: '#ffe79a',
  [WeatherKind.Rainy]: '#dfe7ee',
  [WeatherKind.Snowy]: '#eaf7ff',
  [WeatherKind.Night]: '#ffe9a6',
};

function startOfDay(d: Date): Date {
  const nd = new Date(d.getTime());
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function addDays(d: Date, delta: number): Date {
  const nd = startOfDay(d);
  nd.setDate(nd.getDate() + delta);
  return nd;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function easeOutCubic(t: number): number {
  const p = 1 - t;
  return 1 - p * p * p;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '').trim();
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    return { r, g, b };
  }
  const num = parseInt(raw, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixColor(a: string, b: string, t: number): string {
  const c1 = parseHex(a);
  const c2 = parseHex(b);
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b2 = Math.round(lerp(c1.b, c2.b, t));
  return `rgb(${r}, ${g}, ${b2})`;
}

function rgba(hex: string, alpha: number): string {
  const raw = hex.trim();
  if (raw.startsWith('rgba(')) {
    return raw;
  }
  if (raw.startsWith('rgb(')) {
    const m = raw.match(/rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/);
    if (!m) {
      return raw;
    }
    return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
  }
  const c = parseHex(raw);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

function initialKindFromMix(mix: number): WeatherKind {
  const t = clamp(mix, 0, 1);
  for (const item of WEATHER_KIND_THRESHOLDS) {
    if (t < item.max) {
      return item.kind;
    }
  }
  return WeatherKind.Night;
}

export class GlassCalendar extends StatefulWidget<
  GlassCalendarProps,
  {
    timelineSegmentCount: number;
    timelineStartTime: number;
    timelineSelectedIndex: number;
    weatherKind: WeatherKind;
    weatherFromKind: WeatherKind;
    weatherToKind: WeatherKind;
    weatherT: number;
    navHover: NavHover;
  }
> {
  protected state = {
    timelineSegmentCount: 21,
    timelineStartTime: addDays(new Date(), -10).getTime(),
    timelineSelectedIndex: 10,
    weatherKind: WeatherKind.Sunny,
    weatherFromKind: WeatherKind.Sunny,
    weatherToKind: WeatherKind.Sunny,
    weatherT: 0,
    navHover: null,
  };

  private weatherRaf: number | null = null;
  private weatherFromT: number = 0;
  private weatherToT: number = 0;
  private weatherStartTime: number = 0;

  protected initWidget(data: GlassCalendarProps): void {
    const segmentCount =
      typeof data.timelineSegmentCount === 'number' && Number.isFinite(data.timelineSegmentCount)
        ? Math.max(7, Math.floor(data.timelineSegmentCount))
        : this.state.timelineSegmentCount;
    const centerIndex = Math.floor(segmentCount / 2);
    const today = startOfDay(new Date());
    const startTime = addDays(today, -centerIndex).getTime();
    const weatherMix =
      typeof data.initialWeatherMix === 'number' && Number.isFinite(data.initialWeatherMix)
        ? clamp(data.initialWeatherMix, 0, 1)
        : 0;
    const initialKind = initialKindFromMix(weatherMix);
    this.state = {
      ...this.state,
      timelineSegmentCount: segmentCount,
      timelineStartTime: startTime,
      timelineSelectedIndex: centerIndex,
      weatherKind: initialKind,
      weatherFromKind: initialKind,
      weatherToKind: initialKind,
      weatherT: 0,
      navHover: null,
    };
  }

  private animateWeatherTo(targetKind: WeatherKind) {
    // 天气切换是短动画，使用 RAF 在 state 上插值，最终落到离散的 WeatherKind
    if (this.weatherRaf != null) {
      cancelAnimationFrame(this.weatherRaf);
      this.weatherRaf = null;
    }
    const fromKind = this.state.weatherToKind;
    this.setState({ weatherFromKind: fromKind, weatherToKind: targetKind, weatherT: 0 });
    this.weatherFromT = 0;
    this.weatherToT = 1;
    this.weatherStartTime = Date.now();
    const duration = 360;
    const loop = () => {
      const t = clamp((Date.now() - this.weatherStartTime) / duration, 0, 1);
      const eased = easeOutCubic(t);
      const nextT = this.weatherFromT + (this.weatherToT - this.weatherFromT) * eased;
      if (t < 1) {
        this.setState({ weatherT: nextT });
      } else {
        this.setState({
          weatherKind: targetKind,
          weatherFromKind: targetKind,
          weatherToKind: targetKind,
          weatherT: 0,
        });
      }
      if (t < 1) {
        this.weatherRaf = requestAnimationFrame(loop);
      } else {
        this.weatherRaf = null;
      }
    };
    this.weatherRaf = requestAnimationFrame(loop);
  }

  private moveSelection(delta: number) {
    // 日期选择左右移动：通过滑动时间轴起点，让选中日期尽量保持在中间窗口范围
    const segmentCount = this.state.timelineSegmentCount;
    const edge = Math.min(3, Math.max(0, Math.floor(segmentCount / 2) - 1));
    let nextStartTime = this.state.timelineStartTime;
    let nextSelectedIndex = this.state.timelineSelectedIndex + delta;

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

    this.setState({
      timelineStartTime: nextStartTime,
      timelineSelectedIndex: nextSelectedIndex,
    });
  }

  private handlePrevClick = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.moveSelection(-1);
  };

  private handleNextClick = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.moveSelection(1);
  };

  private handleWeatherClick = (e: InkwellEvent) => {
    e.stopPropagation?.();
    if (this.weatherRaf != null) {
      return;
    }
    const idx = WEATHER_KIND_ORDER.indexOf(this.state.weatherKind);
    const next =
      WEATHER_KIND_ORDER[(idx + 1 + WEATHER_KIND_ORDER.length) % WEATHER_KIND_ORDER.length] ??
      WeatherKind.Sunny;
    this.animateWeatherTo(next);
  };

  private handleNavEnter = (dir: NavDir) => {
    if (this.state.navHover !== dir) {
      this.setState({ navHover: dir });
    }
  };

  private handleNavLeave = () => {
    if (this.state.navHover !== null) {
      this.setState({ navHover: null });
    }
  };

  render(): Widget {
    const theme = this.props.theme ?? Themes.light;
    const width = typeof this.props.width === 'number' ? this.props.width : DEFAULT_WIDTH;
    const height = typeof this.props.height === 'number' ? this.props.height : DEFAULT_HEIGHT;

    const weatherFrom = this.state.weatherFromKind;
    const weatherTo = this.state.weatherToKind;
    const weatherT = clamp(this.state.weatherT, 0, 1);
    const fromTheme = WEATHER_THEMES[weatherFrom] ?? WEATHER_THEMES[WeatherKind.Sunny];
    const toTheme = WEATHER_THEMES[weatherTo] ?? WEATHER_THEMES[WeatherKind.Sunny];
    // 颜色在 render 中随 weatherT 插值，其他静态映射表已上移到模块级避免重复分配
    const textPrimary = mixColor(fromTheme.textPrimary, toTheme.textPrimary, weatherT);
    const accent = mixColor(fromTheme.accent, toTheme.accent, weatherT);

    const pad = Math.max(18, Math.min(26, Math.min(width, height) * 0.08));
    const titleTopY = pad * 0.45;

    const weatherR = WEATHER_RADIUS;
    const weatherX = width - pad - weatherR * 2 - 4;
    const weatherY = pad * 0.65 - 4;

    const bandThickness = clamp(height * 0.18, 52, 74);
    const navW = clamp(width * 0.14, 64, 92);
    const navIconSize = clamp(height * 0.09, 18, 24);
    const navH = Math.max(bandThickness * 1.2, navIconSize + clamp(height * 0.1, 26, 42));
    const navY = (height - navH) / 2;

    const selectedDate = addDays(
      new Date(this.state.timelineStartTime),
      this.state.timelineSelectedIndex,
    );
    const monthLabel = MONTH_LABELS[selectedDate.getMonth()] ?? `${selectedDate.getMonth() + 1}`;
    const dayLabel = selectedDate.getDate();
    const now = new Date();
    const isToday =
      now.getFullYear() === selectedDate.getFullYear() &&
      now.getMonth() === selectedDate.getMonth() &&
      now.getDate() === selectedDate.getDate();

    const monthFontSize = clamp(height * 0.07, 16, 26);
    const dayFontSize = clamp(height * 0.2, 52, 94);
    const chipFontSize = clamp(height * 0.04, 12, 16);
    const chipPadX = Math.max(6, height * 0.02);
    const chipPadY = Math.max(4, height * 0.015);
    const chipH = chipFontSize + chipPadY * 2;

    const navHovered = this.state.navHover;
    const prevAlpha = navHovered === NavDir.Prev ? 0.75 : 0.28;
    const nextAlpha = navHovered === NavDir.Next ? 0.75 : 0.28;

    return (
      <Container key="glass-calendar" width={width} height={height} color="transparent">
        <Stack key="glass-calendar-stack">
          <GlassCalendarCard
            key="glass-calendar-effects"
            width={width}
            height={height}
            theme={theme}
            timelineStartTime={this.state.timelineStartTime}
            timelineSegmentCount={this.state.timelineSegmentCount}
            timelineSelectedIndex={this.state.timelineSelectedIndex}
            weatherThemeFrom={weatherFrom}
            weatherThemeTo={weatherTo}
            weatherThemeT={weatherT}
          />

          <Positioned key="glass-calendar-title" left={pad} top={titleTopY}>
            <Column
              spacing={Math.max(6, height * 0.02)}
              mainAxisSize={MainAxisSize.Min}
              crossAxisAlignment={CrossAxisAlignment.Start}
            >
              <Text
                text={monthLabel}
                fontSize={monthFontSize}
                fontWeight={700}
                color={textPrimary}
              />
              <Row
                spacing={Math.max(8, height * 0.02)}
                mainAxisSize={MainAxisSize.Min}
                crossAxisAlignment={CrossAxisAlignment.Center}
              >
                <Text
                  text={String(dayLabel)}
                  fontSize={dayFontSize}
                  fontWeight={700}
                  color={textPrimary}
                />
                {isToday ? (
                  <Container
                    padding={{
                      left: chipPadX,
                      right: chipPadX,
                      top: chipPadY,
                      bottom: chipPadY,
                    }}
                    height={chipH}
                    color={applyAlpha(TODAY_CHIP_COLOR, 0.18)}
                    border={{ width: 1, color: applyAlpha(TODAY_CHIP_COLOR, 0.42) }}
                    borderRadius={999}
                  >
                    <Text
                      text={TODAY_LABEL}
                      fontSize={chipFontSize}
                      fontWeight={700}
                      color={applyAlpha(textPrimary, 0.92)}
                      textAlignVertical={TextAlignVertical.Center}
                      pointerEvent="none"
                    />
                  </Container>
                ) : null}
              </Row>
            </Column>
          </Positioned>

          <Positioned
            key="glass-calendar-weather"
            left={weatherX}
            top={weatherY}
            width={weatherR * 2}
            height={weatherR * 2}
          >
            <Container
              width={weatherR * 2}
              height={weatherR * 2}
              borderRadius={weatherR}
              color={applyAlpha(accent, 0.18)}
              border={{ width: 1, color: applyAlpha(accent, 0.34) }}
              cursor="pointer"
              onClick={this.handleWeatherClick}
            >
              <Stack key="weather-icon-stack">
                <Positioned left={0} top={0} width={weatherR * 2} height={weatherR * 2}>
                  <Container
                    width={weatherR * 2}
                    height={weatherR * 2}
                    alignment="center"
                    pointerEvent="none"
                  >
                    <Icon
                      svg={WEATHER_ICON_SVGS[weatherFrom]}
                      size={WEATHER_ICON_SIZE}
                      color={rgba(WEATHER_COLORS[weatherFrom], 1 - weatherT)}
                    />
                  </Container>
                </Positioned>
                <Positioned left={0} top={0} width={weatherR * 2} height={weatherR * 2}>
                  <Container
                    width={weatherR * 2}
                    height={weatherR * 2}
                    alignment="center"
                    pointerEvent="none"
                  >
                    <Icon
                      svg={WEATHER_ICON_SVGS[weatherTo]}
                      size={WEATHER_ICON_SIZE}
                      color={rgba(WEATHER_COLORS[weatherTo], weatherT)}
                    />
                  </Container>
                </Positioned>
              </Stack>
            </Container>
          </Positioned>

          <Positioned key="glass-calendar-prev" left={0} top={navY} width={navW} height={navH}>
            <Container
              width={navW}
              height={navH}
              color="transparent"
              cursor="pointer"
              alignment="center"
              onPointerEnter={() => this.handleNavEnter(NavDir.Prev)}
              onPointerLeave={this.handleNavLeave}
              onClick={this.handlePrevClick}
            >
              <Icon
                svg={CHEVRON_LEFT_SVG}
                size={navIconSize}
                color={applyAlpha(textPrimary, prevAlpha)}
                pointerEvent="none"
              />
            </Container>
          </Positioned>

          <Positioned
            key="glass-calendar-next"
            left={width - navW}
            top={navY}
            width={navW}
            height={navH}
          >
            <Container
              width={navW}
              height={navH}
              color="transparent"
              cursor="pointer"
              alignment="center"
              onPointerEnter={() => this.handleNavEnter(NavDir.Next)}
              onPointerLeave={this.handleNavLeave}
              onClick={this.handleNextClick}
            >
              <Icon
                svg={CHEVRON_RIGHT_SVG}
                size={navIconSize}
                color={applyAlpha(textPrimary, nextAlpha)}
                pointerEvent="none"
              />
            </Container>
          </Positioned>
        </Stack>
      </Container>
    );
  }

  dispose(): void {
    if (this.weatherRaf != null) {
      cancelAnimationFrame(this.weatherRaf);
      this.weatherRaf = null;
    }
    super.dispose();
  }
}

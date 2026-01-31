/** @jsxImportSource @/utils/compiler */
import {
  ATMOSPHERE_THEMES,
  ATMOSPHERE_TO_TIME,
  ATMOSPHERE_TO_WEATHER,
  WEATHER_KIND_ORDER,
  initialAtmosphereFromMix,
  toAtmosphereKind,
  toggleTimeOfDay,
} from './atmosphere-themes';
import { AtmosphereKind, TimeOfDay, WeatherKind, type GlassCalendarProps } from './calendar-types';
import {
  MONTH_LABELS,
  addDays,
  clamp,
  easeOutCubic,
  mixRgb,
  rgba,
  startOfDay,
} from './calendar-utils';
import { GlassCalendarCard } from './glass-calendar-card';
import { CHEVRON_LEFT_SVG, CHEVRON_RIGHT_SVG } from './svgs';
import { TimeOfDayIcon, WeatherIcon } from './weather-icons';

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
} from '@/core';
import { applyAlpha } from '@/core/helper/color';
import { Themes } from '@/styles/theme';

enum NavDir {
  Prev = 'prev',
  Next = 'next',
}

type NavHover = NavDir | null;

type ActionKey = 'timeOfDay' | 'weather';

/*
 * GlassCalendar：负责交互与状态（日期滚动、天气切换），并组合内容层 + GlassCalendarCard 特效层。
 * render 属于高频路径：把 SVG/颜色表/顺序表等常量上移到模块级，避免每次 render 重新分配对象与字符串。
 */

const DEFAULT_WIDTH = 520;
const DEFAULT_HEIGHT = 320;
const TODAY_LABEL = 'Today';
const TODAY_CHIP_COLOR = '#ffffff';

const WEATHER_COLORS: Record<WeatherKind, string> = {
  [WeatherKind.Sunny]: '#ffe79a',
  [WeatherKind.Cloudy]: '#e8eef4',
  [WeatherKind.Rainy]: '#dfe7ee',
  [WeatherKind.Stormy]: '#d8cfff',
  [WeatherKind.Snowy]: '#eaf7ff',
  [WeatherKind.Foggy]: '#f1f5f9',
};

const TIME_OF_DAY_COLORS: Record<TimeOfDay, string> = {
  [TimeOfDay.Day]: '#ffe79a',
  [TimeOfDay.Night]: '#ffe9a6',
};

export class GlassCalendar extends StatefulWidget<
  GlassCalendarProps,
  {
    timelineSegmentCount: number;
    timelineStartTime: number;
    timelineSelectedIndex: number;
    timeOfDay: TimeOfDay;
    weatherKind: WeatherKind;
    atmosphereFrom: AtmosphereKind;
    atmosphereTo: AtmosphereKind;
    atmosphereT: number;
    navHover: NavHover;
    actionHover: ActionKey | null;
    actionDown: ActionKey | null;
  }
> {
  protected state = {
    timelineSegmentCount: 21,
    timelineStartTime: addDays(new Date(), -10).getTime(),
    timelineSelectedIndex: 10,
    timeOfDay: TimeOfDay.Day,
    weatherKind: WeatherKind.Sunny,
    atmosphereFrom: AtmosphereKind.DaySunny,
    atmosphereTo: AtmosphereKind.DaySunny,
    atmosphereT: 0,
    navHover: null,
    actionHover: null,
    actionDown: null,
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
    const initialAtmosphere = initialAtmosphereFromMix(weatherMix);
    const initialTimeOfDay = ATMOSPHERE_TO_TIME[initialAtmosphere] ?? TimeOfDay.Day;
    const initialWeather = ATMOSPHERE_TO_WEATHER[initialAtmosphere] ?? WeatherKind.Sunny;
    this.state = {
      ...this.state,
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

  private animateAtmosphereTo(targetKind: AtmosphereKind) {
    if (this.weatherRaf != null) {
      cancelAnimationFrame(this.weatherRaf);
      this.weatherRaf = null;
    }
    const fromKind = this.state.atmosphereTo;
    this.setState({ atmosphereFrom: fromKind, atmosphereTo: targetKind, atmosphereT: 0 });
    this.weatherFromT = 0;
    this.weatherToT = 1;
    this.weatherStartTime = Date.now();
    const duration = 360;
    const loop = () => {
      const t = clamp((Date.now() - this.weatherStartTime) / duration, 0, 1);
      const eased = easeOutCubic(t);
      const nextT = this.weatherFromT + (this.weatherToT - this.weatherFromT) * eased;
      if (t < 1) {
        this.setState({ atmosphereT: nextT });
      } else {
        const nextTimeOfDay = ATMOSPHERE_TO_TIME[targetKind] ?? this.state.timeOfDay;
        const nextWeather = ATMOSPHERE_TO_WEATHER[targetKind] ?? this.state.weatherKind;
        this.setState({
          timeOfDay: nextTimeOfDay,
          weatherKind: nextWeather,
          atmosphereFrom: targetKind,
          atmosphereTo: targetKind,
          atmosphereT: 0,
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
    const nextWeather =
      WEATHER_KIND_ORDER[(idx + 1 + WEATHER_KIND_ORDER.length) % WEATHER_KIND_ORDER.length] ??
      WeatherKind.Sunny;
    const nextAtmosphere = toAtmosphereKind(this.state.timeOfDay, nextWeather);
    this.animateAtmosphereTo(nextAtmosphere);
  };

  private handleTimeOfDayClick = (e: InkwellEvent) => {
    e.stopPropagation?.();
    if (this.weatherRaf != null) {
      return;
    }
    const nextTimeOfDay = toggleTimeOfDay(this.state.timeOfDay);
    const nextAtmosphere = toAtmosphereKind(nextTimeOfDay, this.state.weatherKind);
    this.animateAtmosphereTo(nextAtmosphere);
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

  private handleActionEnter = (key: ActionKey) => {
    if (this.state.actionHover !== key) {
      this.setState({ actionHover: key });
    }
  };

  private handleActionLeave = (key: ActionKey) => {
    if (this.state.actionHover === key || this.state.actionDown === key) {
      this.setState({
        actionHover: this.state.actionHover === key ? null : this.state.actionHover,
        actionDown: this.state.actionDown === key ? null : this.state.actionDown,
      });
    }
  };

  private handleActionDown = (key: ActionKey) => {
    if (this.state.actionDown !== key) {
      this.setState({ actionDown: key });
    }
  };

  private handleActionUp = (key: ActionKey) => {
    if (this.state.actionDown === key) {
      this.setState({ actionDown: null });
    }
  };

  render(): Widget {
    const theme = this.props.theme ?? Themes.light;
    const width = typeof this.props.width === 'number' ? this.props.width : DEFAULT_WIDTH;
    const height = typeof this.props.height === 'number' ? this.props.height : DEFAULT_HEIGHT;

    const atmosphereFrom = this.state.atmosphereFrom;
    const atmosphereTo = this.state.atmosphereTo;
    const atmosphereT = clamp(this.state.atmosphereT, 0, 1);
    const fromTheme =
      ATMOSPHERE_THEMES[atmosphereFrom] ?? ATMOSPHERE_THEMES[AtmosphereKind.DaySunny];
    const toTheme = ATMOSPHERE_THEMES[atmosphereTo] ?? ATMOSPHERE_THEMES[AtmosphereKind.DaySunny];
    const textPrimary = mixRgb(fromTheme.textPrimary, toTheme.textPrimary, atmosphereT);
    const accent = mixRgb(fromTheme.accent, toTheme.accent, atmosphereT);

    const inset = clamp(Math.min(width, height) * 0.06, 16, 24);
    const headerTop = inset;
    const titleTopY = headerTop;
    const actionSize = clamp(height * 0.12, 34, 42);
    const actionR = actionSize / 2;
    const actionGap = clamp(inset * 0.4, 8, 12);
    const actionsW = actionSize * 2 + actionGap;
    const actionsX = width - inset - actionsW;
    const actionsY = headerTop;
    const actionIconSize = clamp(actionSize * 0.56, 18, 24);

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
    const chipPadX = clamp(height * 0.02, 8, 12);
    const chipPadY = clamp(height * 0.015, 6, 10);
    const chipH = chipFontSize + chipPadY * 2;
    const titleGapY = clamp(height * 0.02, 6, 10);
    const titleRowGapX = clamp(height * 0.02, 8, 12);

    const navHovered = this.state.navHover;
    const prevAlpha = navHovered === NavDir.Prev ? 0.75 : 0.28;
    const nextAlpha = navHovered === NavDir.Next ? 0.75 : 0.28;

    const actionHover = this.state.actionHover;
    const actionDown = this.state.actionDown;
    const getActionBgAlpha = (key: ActionKey) =>
      actionDown === key ? 0.28 : actionHover === key ? 0.22 : 0.18;
    const getActionBorderAlpha = (key: ActionKey) =>
      actionDown === key ? 0.5 : actionHover === key ? 0.42 : 0.34;

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
            atmosphereFrom={atmosphereFrom}
            atmosphereTo={atmosphereTo}
            atmosphereT={atmosphereT}
          />

          <Positioned key="glass-calendar-title" left={inset} top={titleTopY}>
            <Column
              spacing={titleGapY}
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
                spacing={titleRowGapX}
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
                    padding={{ left: chipPadX, right: chipPadX, top: chipPadY, bottom: chipPadY }}
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
            key="glass-calendar-actions"
            left={actionsX}
            top={actionsY}
            width={actionsW}
            height={actionSize}
          >
            <Row
              spacing={actionGap}
              mainAxisSize={MainAxisSize.Min}
              crossAxisAlignment={CrossAxisAlignment.Center}
            >
              <Container
                width={actionSize}
                height={actionSize}
                borderRadius={actionR}
                color={applyAlpha(accent, getActionBgAlpha('timeOfDay'))}
                border={{ width: 1, color: applyAlpha(accent, getActionBorderAlpha('timeOfDay')) }}
                cursor="pointer"
                onPointerEnter={() => this.handleActionEnter('timeOfDay')}
                onPointerLeave={() => this.handleActionLeave('timeOfDay')}
                onPointerDown={(e) => {
                  e.stopPropagation?.();
                  this.handleActionDown('timeOfDay');
                  this.handleTimeOfDayClick(e);
                }}
                onPointerUp={() => this.handleActionUp('timeOfDay')}
              >
                <Stack key="time-icon-stack">
                  <Positioned left={0} top={0} width={actionSize} height={actionSize}>
                    <Container
                      width={actionSize}
                      height={actionSize}
                      alignment="center"
                      pointerEvent="none"
                    >
                      <TimeOfDayIcon
                        kind={ATMOSPHERE_TO_TIME[atmosphereFrom]}
                        size={actionIconSize}
                        color={rgba(
                          TIME_OF_DAY_COLORS[ATMOSPHERE_TO_TIME[atmosphereFrom]],
                          1 - atmosphereT,
                        )}
                      />
                    </Container>
                  </Positioned>
                  <Positioned left={0} top={0} width={actionSize} height={actionSize}>
                    <Container
                      width={actionSize}
                      height={actionSize}
                      alignment="center"
                      pointerEvent="none"
                    >
                      <TimeOfDayIcon
                        kind={ATMOSPHERE_TO_TIME[atmosphereTo]}
                        size={actionIconSize}
                        color={rgba(
                          TIME_OF_DAY_COLORS[ATMOSPHERE_TO_TIME[atmosphereTo]],
                          atmosphereT,
                        )}
                      />
                    </Container>
                  </Positioned>
                </Stack>
              </Container>

              <Container
                width={actionSize}
                height={actionSize}
                borderRadius={actionR}
                color={applyAlpha(accent, getActionBgAlpha('weather'))}
                border={{ width: 1, color: applyAlpha(accent, getActionBorderAlpha('weather')) }}
                cursor="pointer"
                onPointerEnter={() => this.handleActionEnter('weather')}
                onPointerLeave={() => this.handleActionLeave('weather')}
                onPointerDown={(e) => {
                  e.stopPropagation?.();
                  this.handleActionDown('weather');
                  this.handleWeatherClick(e);
                }}
                onPointerUp={() => this.handleActionUp('weather')}
              >
                <Stack key="weather-icon-stack">
                  <Positioned left={0} top={0} width={actionSize} height={actionSize}>
                    <Container
                      width={actionSize}
                      height={actionSize}
                      alignment="center"
                      pointerEvent="none"
                    >
                      <WeatherIcon
                        kind={ATMOSPHERE_TO_WEATHER[atmosphereFrom]}
                        size={actionIconSize}
                        color={rgba(
                          WEATHER_COLORS[ATMOSPHERE_TO_WEATHER[atmosphereFrom]],
                          1 - atmosphereT,
                        )}
                      />
                    </Container>
                  </Positioned>
                  <Positioned left={0} top={0} width={actionSize} height={actionSize}>
                    <Container
                      width={actionSize}
                      height={actionSize}
                      alignment="center"
                      pointerEvent="none"
                    >
                      <WeatherIcon
                        kind={ATMOSPHERE_TO_WEATHER[atmosphereTo]}
                        size={actionIconSize}
                        color={rgba(
                          WEATHER_COLORS[ATMOSPHERE_TO_WEATHER[atmosphereTo]],
                          atmosphereT,
                        )}
                      />
                    </Container>
                  </Positioned>
                </Stack>
              </Container>
            </Row>
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

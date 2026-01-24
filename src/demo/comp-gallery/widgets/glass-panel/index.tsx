/** @jsxImportSource @/utils/compiler */
import type { WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

import {
  ClipRect,
  Column,
  Container,
  MainAxisSize,
  Positioned,
  SizedBox,
  Stack,
  Text,
  TextAlign,
} from '@/core';
import { FrostedGlassCard } from '@/demo/glass-card/widgets/frosted-glass-card';
import { Themes } from '@/styles/theme';

export const GlassPanel = ({
  title,
  theme,
  width,
  height,
  children,
}: {
  title: string;
  theme: ThemePalette;
  width: number;
  height: number;
  children?: WidgetProps[];
}) => {
  const blurPx = theme === Themes.dark ? 18 : 16;
  const glassAlpha = theme === Themes.dark ? 0.16 : 0.14;
  const basePadding = 16;
  const cardRadius = Math.min(24, height * 0.12);

  return (
    <Column key={`glass-card-${title}`} spacing={8} mainAxisSize={MainAxisSize.Min}>
      <SizedBox width={width} height={height}>
        <Stack allowOverflowPositioned={true}>
          <ClipRect borderRadius={cardRadius}>
            <FrostedGlassCard
              width={width}
              height={height}
              theme={theme}
              blurPx={blurPx}
              glassAlpha={glassAlpha}
              animate={false}
              windowRect={false}
            />
          </ClipRect>
          <Positioned left={0} top={0}>
            <Container
              width={width}
              height={height}
              color="transparent"
              padding={{
                left: basePadding,
                right: basePadding,
                top: basePadding,
                bottom: basePadding,
              }}
              children={children}
            />
          </Positioned>
        </Stack>
      </SizedBox>
      <Text text={title} fontSize={13} color={theme.text.secondary} textAlign={TextAlign.Center} />
    </Column>
  );
};

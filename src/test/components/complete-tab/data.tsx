/** @jsxImportSource @/utils/compiler */
import {
  Center,
  ClipRect,
  Column,
  Container,
  Expanded,
  Padding,
  Positioned,
  Row,
  Stack,
  Text,
  TextAlign,
} from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';
import { ScrollView } from '@/core/viewport/scroll-view';

// 统一配色方案
const Colors = {
  Primary: '#1890FF', // 主色
  Secondary: '#52C41A', // 成功色
  Warning: '#FAAD14', // 警告色
  Error: '#FF4D4F', // 错误色
  Text: {
    Title: '#262626', // 标题文字
    Body: '#595959', // 正文文字
    Light: '#8C8C8C', // 浅色文字
    White: '#FFFFFF', // 白色文字
  },
  Background: {
    Base: '#F0F2F5', // 基础背景
    Card: '#FFFFFF', // 卡片背景
  },
  Border: '#D9D9D9', // 边框颜色
};

/**
 * 演示页面的主入口
 * 展示了核心组件的组合使用方式，包括布局、定位、交互等
 */
export const getTestTemplate = (width?: number, height?: number) => (
  <ScrollView key="root-scroll-view" width={width} height={height}>
    <Container minWidth={width} alignment="center">
      <Column
        key="complete-demo-root"
        mainAxisAlignment={MainAxisAlignment.Center}
        crossAxisAlignment={CrossAxisAlignment.Start}
        spacing={24}
        mainAxisSize={MainAxisSize.Max}
        padding={24}
      >
        {/* 标题区域 */}
        <Column key="header-section" spacing={8} mainAxisSize={MainAxisSize.Min}>
          <Text
            key="demo-title"
            text="Inkwell 组件库展示"
            fontSize={32}
            height={40}
            lineHeight={40}
            color={Colors.Text.Title}
            fontWeight="bold"
          />
          <Text
            key="demo-subtitle"
            text="基于 Canvas 的高性能 UI 渲染框架演示"
            fontSize={16}
            color={Colors.Text.Light}
          />
        </Column>

        {/* 1. 基础布局组件 (Container & Padding) */}
        <Section title="1. 基础容器 (Container & Padding)">
          <Row key="container-examples" spacing={20} mainAxisSize={MainAxisSize.Min}>
            {/* 基础容器 */}
            <DemoCard title="基础样式">
              <Container
                key="basic-container"
                width={120}
                height={80}
                color={Colors.Primary}
                padding={12}
              >
                <Center>
                  <Text
                    key="basic-text"
                    text="Box"
                    fontSize={16}
                    color={Colors.Text.White}
                    fontWeight="bold"
                  />
                </Center>
              </Container>
            </DemoCard>

            {/* 圆角容器 */}
            <DemoCard title="圆角与边框">
              <Container
                key="rounded-container"
                width={120}
                height={80}
                color={Colors.Background.Card}
                borderRadius={12}
                padding={12}
                border={{ width: 2, color: Colors.Primary }}
              >
                <Center>
                  <Text
                    key="rounded-text"
                    text="Rounded"
                    fontSize={16}
                    color={Colors.Primary}
                    fontWeight="bold"
                  />
                </Center>
              </Container>
            </DemoCard>

            {/* Padding 示例 */}
            <DemoCard title="内边距 (Padding)">
              <Container
                key="padding-container"
                color={Colors.Background.Base}
                border={{ width: 1, color: Colors.Border }}
              >
                <Padding key="padding-inner" padding={16}>
                  <Container color={Colors.Secondary} width={80} height={40}>
                    <Center>
                      <Text text="Content" fontSize={12} color={Colors.Text.White} />
                    </Center>
                  </Container>
                </Padding>
              </Container>
            </DemoCard>
          </Row>
        </Section>

        {/* 2. 弹性布局 (Flex Row/Column & Expanded) */}
        <Section title="2. 弹性布局 (Flex Row/Column)">
          <Container
            key="flex-demo-container"
            width={400}
            padding={16}
            color={Colors.Background.Base}
            borderRadius={8}
          >
            <Row
              key="flex-row"
              spacing={12}
              mainAxisAlignment={MainAxisAlignment.Center}
              crossAxisAlignment={CrossAxisAlignment.Center}
            >
              <Container
                key="fixed-left"
                width={60}
                height={60}
                color={Colors.Primary}
                borderRadius={4}
              >
                <Center>
                  <Text text="Fixed" color={Colors.Text.White} fontSize={12} />
                </Center>
              </Container>

              <Expanded flex={{ flex: 1 }}>
                <Container
                  key="flex-middle"
                  height={60}
                  color={Colors.Warning}
                  borderRadius={4}
                  alignment="center"
                >
                  <Center>
                    <Text
                      text="Expanded (Flex: 1)"
                      color={Colors.Text.White}
                      fontSize={14}
                      fontWeight="bold"
                      textAlign={TextAlign.Center}
                    />
                  </Center>
                </Container>
              </Expanded>

              <Container
                key="fixed-right"
                width={60}
                height={60}
                color={Colors.Primary}
                borderRadius={4}
              >
                <Center>
                  <Text text="Fixed" color={Colors.Text.White} fontSize={12} />
                </Center>
              </Container>
            </Row>
          </Container>
        </Section>

        {/* 3. 层叠布局 (Stack & Positioned) */}
        <Section title="3. 层叠布局 (Stack & Positioned)">
          <Container
            key="stack-demo-container"
            width={300}
            height={160}
            color={Colors.Background.Base}
            borderRadius={8}
            border={{ width: 1, color: Colors.Border }}
          >
            <Stack key="stack-layout" alignment="center">
              {/* 背景层 */}
              <Text
                text="Stack Background"
                fontSize={20}
                color={Colors.Text.Light}
                fontWeight="bold"
              />

              {/* 左上角标签 */}
              <Positioned key="pos-tl" left={12} top={12}>
                <Badge text="Left-Top" color={Colors.Error} />
              </Positioned>

              {/* 右下角标签 */}
              <Positioned key="pos-br" right={12} bottom={12}>
                <Badge text="Right-Bottom" color={Colors.Secondary} />
              </Positioned>
            </Stack>
          </Container>
        </Section>

        {/* 4. 事件交互 (Event Handling) */}
        <Section title="4. 事件交互 (Event Handling)">
          <Container
            key="event-root"
            width={300}
            padding={20}
            color={Colors.Background.Card}
            border={{ width: 1, color: Colors.Primary }}
            borderRadius={8}
            onClick={() => console.log('Container Clicked')}
          >
            <Column spacing={12}>
              <Text text="点击下方按钮测试事件冒泡" fontSize={14} color={Colors.Text.Body} />
              <Container
                key="event-btn"
                width={120}
                height={40}
                color={Colors.Primary}
                borderRadius={20}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Button Clicked (Stopped Propagation)');
                }}
              >
                <Center>
                  <Text
                    text="Click Me"
                    cursor="pointer"
                    color={Colors.Text.White}
                    fontWeight="bold"
                  />
                </Center>
              </Container>
            </Column>
          </Container>
        </Section>

        {/* 5. 滚动视图 (Scroll View & Bounce) */}
        <Section title="5. 滚动视图 (Scroll View & Bounce)">
          <Container
            key="scroll-demo-wrapper"
            width={300}
            height={200}
            border={{ width: 1, color: Colors.Border }}
            borderRadius={8}
          >
            <ClipRect key="scroll-clip">
              <ScrollView
                key="inner-scroll-view"
                enableBounce={false}
                scrollBarColor={Colors.Primary}
                scrollBarWidth={6}
              >
                <Column key="scroll-content" spacing={12} padding={16}>
                  <Text text="尝试拖拽或滚动查看回弹效果" fontSize={14} color={Colors.Text.Light} />
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Container
                      key={`scroll-item-${i}`}
                      height={40}
                      color={i % 2 === 0 ? Colors.Background.Base : Colors.Background.Card}
                      borderRadius={4}
                    >
                      <Center>
                        <Text
                          text={`Scroll Item ${i + 1}`}
                          fontSize={14}
                          color={Colors.Text.Body}
                        />
                      </Center>
                    </Container>
                  ))}
                </Column>
              </ScrollView>
            </ClipRect>
          </Container>
        </Section>

        <Text
          key="footer"
          text="End of Demo"
          fontSize={14}
          color={Colors.Text.Light}
          mainAxisAlignment={MainAxisAlignment.Center}
        />
      </Column>
    </Container>
  </ScrollView>
);

/**
 * 辅助组件：章节标题容器
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Section = ({ title, children }: { title: string; children: any }) => (
  <Column key={`section-${title}`} spacing={12} mainAxisSize={MainAxisSize.Min}>
    <Text
      key={`title-${title}`}
      text={title}
      fontSize={20}
      color={Colors.Text.Title}
      fontWeight="bold"
    />
    <Container
      key={`content-${title}`}
      padding={16}
      color={Colors.Background.Card}
      borderRadius={8}
      border={{ width: 1, color: Colors.Border }}
    >
      {/* 确保 children 被正确渲染 */}
      {children}
    </Container>
  </Column>
);

/**
 * 辅助组件：演示卡片
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DemoCard = ({ title, children }: { title: string; children: any }) => (
  <Column key={`card-${title}`} spacing={8} mainAxisSize={MainAxisSize.Min}>
    {children}
    <Text text={title} fontSize={12} color={Colors.Text.Body} />
  </Column>
);

/**
 * 辅助组件：徽标
 */
const Badge = ({ text, color }: { text: string; color: string }) => (
  <Container key={`badge-${text}`} padding={6} color={color} borderRadius={4}>
    <Text text={text} fontSize={10} color={Colors.Text.White} fontWeight="bold" />
  </Container>
);

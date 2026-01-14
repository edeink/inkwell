/** @jsxImportSource @/utils/compiler */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RawButton } from '../widgets/raw-button';

import { createBoxConstraints } from '@/core/base';
import { EventRegistry, dispatchToTree, type InkwellEvent } from '@/core/events';
import { WidgetRegistry } from '@/core/registry';
import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

// 注册组件以供 JSX 编译器识别
WidgetRegistry.registerType('RawButton', RawButton);

afterEach(() => {
  EventRegistry.clearAll();
  vi.restoreAllMocks();
});

describe('RawButton 事件双重绑定问题验证', () => {
  it('点击事件应触发两次并发出警告（预期行为）', () => {
    const onClick = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 使用 JSX 编译方式创建组件
    const element = (
      // @ts-ignore: 忽略 JSX 类型检查，RawButton 是自定义底层 Widget
      <RawButton
        key="test-raw-btn"
        onClick={onClick}
        width={100}
        height={50}
        theme={Themes.light}
      />
    );

    const data = compileElement(element);
    const button = WidgetRegistry.createWidget(data as unknown as any) as RawButton;
    // 确保创建成功
    expect(button).toBeTruthy();

    button.createElement(data as unknown as any);
    button.layout(createBoxConstraints());

    // 模拟点击事件
    const pos = { dx: 0, dy: 0 };
    dispatchToTree(button, button, 'click', pos.dx + 10, pos.dy + 10);

    // 验证调用次数 - 预期触发 2 次：
    // 1. RawButton.onClick 方法被调用 (调用 props.onClick)
    // 2. EventRegistry 注册的 props.onClick 处理器被调用
    expect(onClick).toHaveBeenCalledTimes(2);

    // 验证是否输出了警告信息
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('检测到双重事件绑定，建议仅保留一种实现方式'),
    );
  });

  it('无回调函数时不应报错', () => {
    const element = (
      // @ts-ignore
      <RawButton key="test-raw-btn-no-callback" width={100} height={50} theme={Themes.light} />
    );

    const data = compileElement(element);
    const button = WidgetRegistry.createWidget(data as unknown as any) as RawButton;
    button.createElement(data as unknown as any);
    button.layout(createBoxConstraints());

    const pos = { dx: 0, dy: 0 };
    expect(() => {
      dispatchToTree(button, button, 'click', pos.dx + 10, pos.dy + 10);
    }).not.toThrow();
  });

  it('事件对象应正确传递', () => {
    // 即使触发两次，事件对象也应该被传递
    let capturedEvent: InkwellEvent | undefined;
    const onClick = vi.fn((e: InkwellEvent) => {
      capturedEvent = e;
    });

    const element = (
      // @ts-ignore
      <RawButton
        key="test-raw-btn-event"
        onClick={onClick}
        width={100}
        height={50}
        theme={Themes.light}
      />
    );

    const data = compileElement(element);
    const button = WidgetRegistry.createWidget(data as unknown as any) as RawButton;
    button.createElement(data as unknown as any);
    button.layout(createBoxConstraints());

    const clickX = 15;
    const clickY = 25;
    dispatchToTree(button, button, 'click', clickX, clickY);

    expect(capturedEvent).toBeDefined();
    expect(capturedEvent?.type).toBe('click');
    expect(capturedEvent?.x).toBe(clickX);
    expect(capturedEvent?.y).toBe(clickY);
    expect(capturedEvent?.target).toBe(button);
  });
});

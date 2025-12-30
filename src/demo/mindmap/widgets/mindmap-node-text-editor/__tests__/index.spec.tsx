/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MindMapNodeTextEditor } from '../index';

import { Text } from '@/core';
import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';

// Mock Canvas API globally before imports might use it
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = ((type: string) => {
    if (type === '2d') {
      return {
        font: '',
        measureText: (text: string) => ({ width: text.length * 10 }),
        fillText: () => {},
        strokeText: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        closePath: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        clearRect: () => {},
        setTransform: () => {},
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        rect: () => {},
        clip: () => {},
        canvas: document.createElement('canvas'),
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  }) as any;
}

describe('MindMapNodeTextEditor', () => {
  let container: HTMLElement;
  let runtime: Runtime;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'editor-test-container';
    document.body.appendChild(container);
    runtime = await Runtime.create(container.id);
  });

  afterEach(() => {
    if (runtime) {
      runtime.destroy();
    }
    document.body.innerHTML = '';
  });

  it('Text 组件应该在没有 key 变化时也能正确更新', async () => {
    // 1. 初始渲染
    const props = {
      text: 'Initial',
      fontSize: 14,
      onChange: () => {},
    };

    // 手动创建 Widget 树
    // 移除 key="editor" 以允许 runtime 自动处理，或者保持它但测试内部 Text 组件
    const el = <MindMapNodeTextEditor key="editor" {...props} />;
    await runtime.renderFromJSX(el);

    const editor = runtime.getRootWidget() as MindMapNodeTextEditor;
    expect(editor).toBeInstanceOf(MindMapNodeTextEditor);

    // 获取 Text 组件
    const textWidget = findWidget(editor, 'Text') as Text | null;
    expect(textWidget).not.toBeNull();
    const firstKey = textWidget?.key;

    // 2. 更新状态 (模拟输入)
    // 直接调用 setState 触发更新
    editor.setState({ text: 'Updated' });

    // 手动触发一次更新周期
    runtime.tick();

    // 等待异步更新
    await new Promise((resolve) => setTimeout(resolve, 0));

    const newTextWidget = findWidget(editor, 'Text') as Text | null;
    expect(newTextWidget).not.toBeNull();

    // 验证 Key 保持不变（说明复用了组件）
    // 注意：如果 MindMapNodeTextEditor 的 render 方法中 Text 组件没有 key，
    // 或者是固定 key，或者是自动生成的稳定 key，这里都应该相等。
    // 之前的测试验证了“稳定 key”，现在我们要验证“即使 key 不变，内容也变了”
    expect(newTextWidget?.key).toBe(firstKey);

    // 验证属性是否更新
    // 如果 Text 组件没有正确实现 update 逻辑，这里可能会失败
    // 或者 Text 组件的实例属性没有被 Runtime 正确更新
    expect(newTextWidget?.text).toBe('Updated');

    // 验证 RenderObject 的状态
    // 确保 performLayout 被调用，从而更新了 textMetrics
    // 如果没有 markNeedsLayout，performLayout 不会被调用，lines 将保持为 "Initial"
    // 注意：我们通过检查私有属性或公开的 getter (如果有) 来验证
    // Text 组件公开了 lines getter
    expect(newTextWidget?.lines[0].text).toBe('Updated');
  });
});

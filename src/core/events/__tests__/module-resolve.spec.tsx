/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Container, Text } from '@/core';
import { Widget, createBoxConstraints } from '@/core/base';
import { EventRegistry, dispatchToTree } from '@/core/events';
import '@/core/registry';
import Runtime from '@/runtime';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('模块解析与事件系统（路径别名验证）', () => {
  it('通过 @/core 与 @/runtime 成功导入并运行基本流程', () => {
    const rt = new Runtime();
    expect(rt).toBeInstanceOf(Runtime);

    const el = (
      <Container key="root" width={200} height={100} onClick={() => {}}>
        <Text key="leaf" text="Hello" fontSize={16} onClick={() => {}} />
      </Container>
    );
    const data = compileElement(el);
    expect(data.type).toBe('Container');

    const root = Widget.createWidget(data)!;
    root.layout(createBoxConstraints());
    const leaf = root.children[0];

    const calls: string[] = [];
    // 通过 JSX 注册的 onClick 已由编译器写入注册表，此处额外验证注册调用也可用
    EventRegistry.register('root', 'click', () => calls.push('root'));
    EventRegistry.register('leaf', 'click', () => calls.push('leaf'));

    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['leaf', 'root']);
  });
});

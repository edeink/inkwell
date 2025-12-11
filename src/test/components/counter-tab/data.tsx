/** @jsxImportSource @/utils/compiler */

import type { InkwellEvent } from '@/core/events';

import { Center, Container, Row, Text, Widget } from '@/core';

function findByKey(w: Widget | null, key: string): Widget | null {
  if (!w) {
    return null;
  }
  if (w.key === key) {
    return w;
  }
  for (const c of w.children) {
    const r = findByKey(c, key);
    if (r) {
      return r;
    }
  }
  return null;
}

export const getTestTemplate = (theme: string) => {
  let count = 0;
  const onInc = (e: InkwellEvent): void => {
    count += 1;
    const rootPath: Widget[] = [];
    let cur = e.currentTarget as Widget;
    while (cur) {
      rootPath.push(cur);
      if (!cur.parent) {
        break;
      }
      cur = cur.parent as Widget;
    }
    const root = rootPath[rootPath.length - 1] ?? (e.currentTarget as Widget);
    const text = findByKey(root, 'counter-value');
    if (text) {
      const data = { ...(text.data ?? {}), text: String(count) } as any;
      text.data = data;
      text.createElement(data);
      text.markNeedsLayout();
    }
  };
  return (
    <Row key="counter-root" spacing={16} mainAxisSize="min">
      <Container
        key="counter-btn"
        width={180}
        height={48}
        color={theme === 'dark' ? '#1677ff' : '#1890ff'}
        borderRadius={8}
        onClick={onInc}
      >
        <Center>
          <Text
            key="counter-btn-text"
            text="点击 +1"
            fontSize={16}
            color="#ffffff"
            textAlign="center"
            textAlignVertical="center"
          />
        </Center>
      </Container>
      <Text
        key="counter-value"
        text={String(count)}
        fontSize={28}
        color={theme === 'dark' ? '#e6f7ff' : '#2c3e50'}
      />
    </Row>
  );
};

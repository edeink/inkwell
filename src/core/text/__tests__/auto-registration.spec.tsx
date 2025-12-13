/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Text } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Text auto-registration via JSX compiler', () => {
  it('registers and instantiates Text without manual registration', () => {
    const el = <Text key="t-auto" text="hello" />;
    const json = compileElement(el);
    const w = WidgetRegistry.createWidget(json);
    expect(w).toBeTruthy();
    expect(WidgetRegistry.hasRegisteredType('Text')).toBe(true);
    expect(w?.type).toBe('Text');
  });
});

/** @jsxImportSource @/utils/compiler */
import { afterEach, describe, expect, it } from 'vitest';

import { TextArea } from '../textarea';

import { createBoxConstraints, Widget } from '@/core/base';
import { ScrollView } from '@/core/viewport/scroll-view';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('TextArea 布局', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('应在根容器上撑满父约束宽度', () => {
    const ta = new TextArea({ type: 'TextArea', value: 'a' });
    try {
      const json = compileElement(ta.render());
      expect(json.type).toBe('Container');
      expect((json as any).alignment).toBe('topLeft');

      const scroll = (json.children?.[0] as any) || null;
      expect(scroll?.type).toBe('ScrollView');
      expect(scroll?.alwaysShowScrollbarY).toBe(false);
    } finally {
      ta.dispose();
    }
  });

  it('内容高度超出视口时应显示垂直滚动条', () => {
    class FixedSize extends Widget {
      constructor(
        public w: number,
        public h: number,
      ) {
        super({ type: 'FixedSize' });
      }
      protected performLayout(): { width: number; height: number } {
        return { width: this.w, height: this.h };
      }
    }

    class TestScrollView extends ScrollView {
      public get showScrollbarY() {
        return this._showScrollbarY;
      }
      public get scrollBarYWidth() {
        return this._scrollBarY.renderObject.size.width;
      }
    }

    const child = new FixedSize(100, 300);
    const sv = new TestScrollView({ type: 'ScrollView', alwaysShowScrollbarY: false });
    (sv as any).children = [child];
    child.parent = sv;
    (sv as any)._isBuilt = true;
    (child as any)._isBuilt = true;

    sv.layout(
      createBoxConstraints({ minWidth: 100, maxWidth: 100, minHeight: 100, maxHeight: 100 }),
    );

    expect(sv.showScrollbarY).toBe(true);
    expect(sv.scrollBarYWidth).toBeGreaterThan(0);
  });
});

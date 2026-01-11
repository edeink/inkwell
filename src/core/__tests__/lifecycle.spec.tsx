/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { Container } from '@/core/container';
import { WidgetRegistry } from '@/core/registry';
import { StatefulWidget } from '@/core/state/stateful';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('StatefulWidget Lifecycle', () => {
  it('didUpdateWidget should be called when props change', () => {
    const didUpdateSpy = vi.fn();
    const renderSpy = vi.fn();

    class LifecycleTestWidget extends StatefulWidget<{ value: number }> {
      state = {
        value: 0,
      };

      constructor(props: { value: number }) {
        super(props);
        this.state = { value: props.value };
      }

      protected didUpdateWidget(oldProps: { value: number }) {
        didUpdateSpy(oldProps, this.props);
        if (oldProps.value !== this.props.value) {
          this.setState({ value: this.props.value });
        }
        super.didUpdateWidget(oldProps);
      }

      render() {
        renderSpy(this.state.value);
        return <Container />;
      }
    }

    // 1. Initial mount
    const el = <LifecycleTestWidget value={1} />;
    const widget = WidgetRegistry.createWidget(
      compileElement(el),
    ) as unknown as LifecycleTestWidget;
    widget.createElement(widget.data); // mount

    expect(widget.state.value).toBe(1);
    expect(renderSpy).toHaveBeenLastCalledWith(1);
    expect(didUpdateSpy).not.toHaveBeenCalled();

    // 2. Update props
    // We manually simulate what BaseWidget.createElement logic does when reusing:
    // It updates data, then calls createElement.
    // In our case, we just call createElement with new data on the same instance.
    const newData = { ...widget.data, value: 2 };
    widget.createElement(newData);

    // Verify didUpdateWidget called with old props
    expect(didUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ value: 1 }),
      expect.objectContaining({ value: 2 }),
    );

    // Verify render called with NEW state
    expect(renderSpy).toHaveBeenLastCalledWith(2);
    expect(widget.state.value).toBe(2);
  });
});

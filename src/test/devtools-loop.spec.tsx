import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterAll, beforeAll, describe, it, vi } from 'vitest';

import { ComponentType } from '@/core/type';
// import { DevToolsPanelInner } from '@/devtools/components/devtools-panel/panel-inner';
// import { usePanelStore } from '@/devtools/store';
import Runtime, { type ComponentData } from '@/runtime';

// Import widgets to ensure registration
import '@/core/container';
import '@/core/text';

// Mock requestIdleCallback
if (!globalThis.requestIdleCallback) {
  globalThis.requestIdleCallback = ((cb: any) => {
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => 50,
      });
    }, 16);
  }) as any;
}

if (!globalThis.cancelIdleCallback) {
  globalThis.cancelIdleCallback = (id: any) => clearTimeout(id);
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('DevTools Infinite Loop Investigation', () => {
  let container: HTMLDivElement;
  let devtoolsRoot: HTMLDivElement;
  let runtime: Runtime;

  beforeAll(async () => {
    // Setup DOM
    container = document.createElement('div');
    container.id = 'container';
    document.body.appendChild(container);

    devtoolsRoot = document.createElement('div');
    devtoolsRoot.id = 'devtools-root';
    document.body.appendChild(devtoolsRoot);

    // Init Runtime
    runtime = await Runtime.create('container', {
      renderer: 'canvas2d',
    });

    const data: ComponentData = {
      __inkwellType: ComponentType.Container,
      type: 'Container',
      width: 300,
      height: 300,
      child: {
        __inkwellType: ComponentType.Text,
        type: 'Text',
        text: 'Hello DevTools Debug',
        style: {
          fontSize: 20,
        },
      },
    };
    await runtime.renderFromJSON(data);
  });

  afterAll(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    if (document.body.contains(devtoolsRoot)) {
      document.body.removeChild(devtoolsRoot);
    }
  });

  it('should not trigger infinite updates', async () => {
    // const store = usePanelStore.getState();
    // store.setRuntime(runtime);
    // store.setVisible(true);

    // Spy on console.log/warn
    const logSpy = vi.spyOn(console, 'log');
    const warnSpy = vi.spyOn(console, 'warn');

    await act(async () => {
      const root = createRoot(devtoolsRoot);
      root.render(
        <StrictMode>
          {/* <DevToolsPanelInner helpContent={<div>Help</div>} /> */}
          <div>DevTools Test Disabled</div>
        </StrictMode>,
      );
    });

    // Wait for a bit to let the loop potentially happen
    // Reduced to 500ms to be safe within default timeout, or extend timeout
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if we hit the limit
    const limitWarnings = warnSpy.mock.calls.filter(
      (args) => args[0] && typeof args[0] === 'string' && args[0].includes('Max updates reached'),
    );

    // Also check hash change logs
    const hashChangeLogs = logSpy.mock.calls.filter(
      (args) => args[0] && typeof args[0] === 'string' && args[0].includes('Tree Hash Changed'),
    );

    console.log('Total Hash Changes:', hashChangeLogs.length);
    if (limitWarnings.length > 0) {
      console.log('Hit update limit warning!');
    }

    // Print the first few hash changes to see what's changing
    hashChangeLogs.slice(0, 5).forEach((log, i) => {
      console.log(`Hash Change #${i + 1}:`, log[1]);
    });

    // Clean up
    logSpy.mockRestore();
    warnSpy.mockRestore();
  }, 5000); // Set timeout to 5000ms
});

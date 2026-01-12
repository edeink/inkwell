/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { Container, Positioned, SizedBox, Stack } from '../';
import Runtime from '../../runtime';

function setupCanvasMock() {
  const mockContext = {
    canvas: { width: 800, height: 600, style: {}, dataset: {} },
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
  };

  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = () => mockContext;
  return mockContext;
}

describe('Positioned Behavior', () => {
  it('should apply translation to child', async () => {
    const ctx = setupCanvasMock();

    // Create container element
    const div = document.createElement('div');
    div.id = 'test-stage';
    document.body.appendChild(div);

    const runtime = await Runtime.create('test-stage');

    await runtime.render(
      <SizedBox width={800} height={600}>
        <Stack>
          <Positioned left={100} top={50}>
            <Container width={50} height={50} color="red" />
          </Positioned>
        </Stack>
      </SizedBox>,
    );

    // Check if translate was called with 100, 50
    // The exact call sequence depends on implementation
    // But we expect some translation
    const calls = ctx.translate.mock.calls;
    console.log('Translate calls:', calls);

    // We expect at least one translate with 100, 50
    const hasTranslate = calls.some((call) => call[0] === 100 && call[1] === 50);

    // If Positioned works, this should be true.
    // If not, it means Positioned is broken or implementation is different.
    expect(hasTranslate).toBe(true);
  });
});

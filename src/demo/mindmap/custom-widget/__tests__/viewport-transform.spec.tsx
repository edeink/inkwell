import { describe, expect, it } from 'vitest';

import { MindMapViewport } from '../mindmap-viewport';
import { CustomComponentType } from '../type';

describe('MindMapViewport Transform', () => {
  it('应当正确生成变换步骤 (Translate -> Scale)', () => {
    const viewport = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      key: 'viewport-1',
    });

    // 模拟设置 transform
    // 使用 any 访问 protected 方法或属性进行验证
    (viewport as any).setTransform(2, 100, 200);

    // 获取变换步骤
    const steps = (viewport as any).getSelfTransformSteps();

    // 验证步骤
    // 1. super.getSelfTransformSteps() 返回 translate(0,0) (默认 offset)
    // 2. translate(tx, ty)
    // 3. scale(s, s)

    expect(steps.length).toBeGreaterThanOrEqual(3);

    const translateStep = steps.find((s: any) => s.t === 'translate' && s.x === 100 && s.y === 200);
    const scaleStep = steps.find((s: any) => s.t === 'scale' && s.sx === 2 && s.sy === 2);

    expect(translateStep).toBeDefined();
    expect(scaleStep).toBeDefined();

    // 验证顺序：Translate 必须在 Scale 之前（基于我们在代码中的 push 顺序）
    const tIndex = steps.indexOf(translateStep);
    const sIndex = steps.indexOf(scaleStep);
    expect(tIndex).toBeLessThan(sIndex);
  });
});

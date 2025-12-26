import { describe, expect, it } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapViewport } from '../widgets/mindmap-viewport';

describe('MindMapViewport 变换测试', () => {
  it('应当正确生成变换步骤 (Translate -> Scale)', () => {
    const viewport = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      key: 'viewport-1',
    });

    // 模拟设置 transform
    // 使用 any 访问 protected 方法或属性进行验证
    (viewport as any).setTransform(2, 100, 200);

    // 验证属性已正确设置
    expect(viewport.scale).toBe(2);
    expect(viewport.tx).toBe(100);
    expect(viewport.ty).toBe(200);

    // 验证 getSelfTransformSteps 不再包含 scale/translate (它们作为 View Transform 在 paint 中应用)
    const steps = (viewport as any).getSelfTransformSteps();
    expect(steps.length).toBeLessThan(3);

    const translateStep = steps.find((s: any) => s.t === 'translate' && s.x === 100 && s.y === 200);
    const scaleStep = steps.find((s: any) => s.t === 'scale' && s.sx === 2 && s.sy === 2);

    expect(translateStep).toBeUndefined();
    expect(scaleStep).toBeUndefined();
  });
});

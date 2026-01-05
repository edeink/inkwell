---
id: testing
title: 测试指南
sidebar_position: 6
---

# 测试指南

Inkwell 使用 Vitest 进行单元测试。确保你的代码具有高可测试性是维护大型 Canvas 应用的关键。

## 基本测试流程

1.  **运行测试**
    ```bash
    pnpm test
    ```

2.  **测试 Widget**
    由于 Widget 只是配置对象，你可以直接实例化它们并检查属性。
    对于更复杂的渲染测试，建议使用 `test-utils` 模拟 Runtime 环境。

## 示例

```typescript
import { describe, it, expect } from 'vitest';
import { Container } from '@/core';

describe('Container', () => {
  it('should initialize with correct color', () => {
    const container = new Container({ color: 'red' });
    expect(container.props.color).toBe('red');
  });
});
```

## 日志输出规范

为了保持测试输出的整洁，我们制定了严格的日志输出规范：

1.  **禁止直接使用 console**：在测试文件中，禁止直接调用 `console.log`、`console.warn` 或 `console.error`。
2.  **使用 testLogger**：如果需要打印调试信息，请使用 `@/utils/test-logger` 提供的 `testLogger` 工具。
3.  **调试模式**：默认情况下 `testLogger` 不会输出任何内容。如需查看调试信息，请在运行测试时设置环境变量 `TEST_DEBUG=1`。

    ```bash
    TEST_DEBUG=1 pnpm test
    ```

    示例：

    ```typescript
    import { testLogger } from '@/utils/test-logger';

    it('should log debug info', () => {
      testLogger.log('This will only show when TEST_DEBUG=1');
    });
    ```

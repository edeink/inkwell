/**
 * 测试专用日志工具
 * 用于替代 console.log，仅在显式开启调试模式时输出
 *
 * 使用方法：
 * import { testLogger } from '../../../utils/test-logger';
 * testLogger.log('message');
 *
 * 开启输出：
 * TEST_DEBUG=1 pnpm run test
 */
export const testLogger = {
  log: (...args: unknown[]) => {
    if (process.env.TEST_DEBUG) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.TEST_DEBUG) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (process.env.TEST_DEBUG) {
      console.error(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (process.env.TEST_DEBUG) {
      console.info(...args);
    }
  },
};

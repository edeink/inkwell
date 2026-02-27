/**
 * Devtools 调试配置与工具
 *
 * 汇总调试配置、日志与性能采样工具。
 * 注意事项：部分函数会访问全局对象与运行时环境。
 * 潜在副作用：可能输出日志或注册/统计运行时调用。
 */
export const DEVTOOLS_DEBUG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export const DEVTOOLS_DEBUG_ENV = {
  ENABLE: 'INKWELL_DEVTOOLS_DEBUG',
  LEVEL: 'INKWELL_DEVTOOLS_LOG_LEVEL',
  SAMPLE: 'INKWELL_DEVTOOLS_LOG_SAMPLE',
} as const;

export type DevtoolsDebugLevel = (typeof DEVTOOLS_DEBUG_LEVEL)[keyof typeof DEVTOOLS_DEBUG_LEVEL];

type DevtoolsDebugConfig = {
  enabled: boolean;
  level: DevtoolsDebugLevel;
  sampleRate: number;
};

const devtoolsDebugState: {
  config: DevtoolsDebugConfig | null;
} = {
  config: null,
};

function readDevtoolsEnv(key: string): string | undefined {
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta.env as Record<string, unknown> | undefined)
      : undefined;
  const env = metaEnv ?? undefined;
  if (env && key in env) {
    const v = env[key];
    return typeof v === 'string' ? v : String(v);
  }
  const g = globalThis as Record<string, unknown>;
  if (key in g) {
    return typeof g[key] === 'string' ? (g[key] as string) : String(g[key]);
  }
  return undefined;
}

function resolveDebugConfig(): DevtoolsDebugConfig {
  const envEnabled = readDevtoolsEnv(DEVTOOLS_DEBUG_ENV.ENABLE);
  const enableFromEnv = envEnabled === '1' || envEnabled === 'true';
  let enableFromQuery = false;
  if (typeof location !== 'undefined') {
    const qs = new URLSearchParams(location.search);
    const v = qs.get('inkwellDevtoolsDebug') ?? qs.get('devtoolsDebug');
    enableFromQuery = v === '1' || v === 'true';
  }
  const enabled = enableFromEnv || enableFromQuery;
  const rawLevel = readDevtoolsEnv(DEVTOOLS_DEBUG_ENV.LEVEL);
  const level = isDevtoolsDebugLevel(rawLevel) ? rawLevel : DEVTOOLS_DEBUG_LEVEL.INFO;
  const rawSample = readDevtoolsEnv(DEVTOOLS_DEBUG_ENV.SAMPLE);
  const sampleRate = rawSample ? Math.min(1, Math.max(0, Number(rawSample))) : 1;
  return { enabled, level, sampleRate: Number.isFinite(sampleRate) ? sampleRate : 1 };
}

/**
 * 读取 Devtools 调试配置
 *
 * @returns 调试配置对象
 * @remarks
 * 注意事项：结果会被缓存，避免重复解析环境变量。
 * 潜在副作用：首次调用时读取全局环境变量与 URL 查询。
 */
export function getDevtoolsDebugConfig(): DevtoolsDebugConfig {
  if (!devtoolsDebugState.config) {
    devtoolsDebugState.config = resolveDebugConfig();
  }
  return devtoolsDebugState.config;
}

export function isDevtoolsDebugLevel(value: string | undefined): value is DevtoolsDebugLevel {
  return (
    value === DEVTOOLS_DEBUG_LEVEL.DEBUG ||
    value === DEVTOOLS_DEBUG_LEVEL.INFO ||
    value === DEVTOOLS_DEBUG_LEVEL.WARN ||
    value === DEVTOOLS_DEBUG_LEVEL.ERROR
  );
}

export const EXPOSED_METHODS = Symbol('exposed_methods');

type ExposedHost = {
  [EXPOSED_METHODS]?: Set<string | symbol>;
};

type StandardDecoratorContext = {
  kind: 'method';
  name: string | symbol;
  addInitializer(initializer: (this: ExposedHost) => void): void;
};

/**
 * 标记方法为可暴露给外部调用 (Ref Handle)
 * 支持 Legacy Decorators (Stage 1) 和 Standard Decorators (Stage 3)
 */
export function expose(
  targetOrValue: unknown,
  contextOrKey?: unknown,
  descriptor?: PropertyDescriptor,
): void {
  void descriptor;
  // Standard Decorator check: context object has 'kind'
  if (contextOrKey && typeof contextOrKey === 'object' && 'kind' in contextOrKey) {
    const context = contextOrKey as StandardDecoratorContext;
    if (context.kind === 'method') {
      context.addInitializer(function (this: ExposedHost) {
        if (!this[EXPOSED_METHODS]) {
          this[EXPOSED_METHODS] = new Set();
        }
        this[EXPOSED_METHODS].add(context.name);
      });
    }
    return;
  }

  // Legacy Decorator
  const target = targetOrValue as ExposedHost;
  const propertyKey = contextOrKey as string | symbol | undefined;
  if (propertyKey) {
    if (!target[EXPOSED_METHODS]) {
      // 避免修改父类的 Set
      const parentExposed = target[EXPOSED_METHODS];
      target[EXPOSED_METHODS] = new Set(parentExposed || []);
    }
    target[EXPOSED_METHODS].add(propertyKey);
  }
}

/**
 * 创建仅包含 @expose 标记方法的 Handle 对象
 */
export function createExposedHandle<T>(instance: unknown): T | null {
  if (!instance) {
    return null;
  }

  const host = instance as ExposedHost;
  const obj = instance as Record<string, unknown>;
  const exposedMethods = new Set<string>();

  // 1. Check instance own property (Standard Decorators via addInitializer)
  if (host[EXPOSED_METHODS]) {
    host[EXPOSED_METHODS].forEach((m) => {
      if (typeof m === 'string') {
        exposedMethods.add(m);
      }
    });
  }

  // 2. Check prototype chain (Legacy Decorators)
  let proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    if (Object.prototype.hasOwnProperty.call(proto, EXPOSED_METHODS)) {
      const p = proto as ExposedHost;
      p[EXPOSED_METHODS]?.forEach((m) => {
        if (typeof m === 'string') {
          exposedMethods.add(m);
        }
      });
    }
    proto = Object.getPrototypeOf(proto);
  }

  if (exposedMethods.size === 0) {
    // 如果没有标记任何方法，但为了兼容性或未迁移组件，返回原实例？
    // 但我们的目标是严格限制。
    // 如果没有 exposed methods，返回 instance 会破坏类型安全的目标。
    // 不过考虑到可能有些组件还没有迁移，这里暂时保留之前的逻辑：
    // 如果完全没有 @expose 使用，返回 instance。
    // 但是怎么判断是"完全没有使用"还是"使用了但没有暴露任何方法"？
    // 这里简单处理：如果 Set 为空，返回 instance。
    return instance as T;
  }

  const handle: Record<string, unknown> = {};
  exposedMethods.forEach((method) => {
    const fn = obj[method];
    if (typeof fn === 'function') {
      handle[method] = fn.bind(instance);
    }
  });

  return handle as T;
}

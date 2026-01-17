import { describe, it, expect } from 'vitest';

import { expose, createExposedHandle } from '../decorators';

describe('装饰器 @expose', () => {
  class BaseComponent {
    @expose
    baseMethod() {
      return 'base';
    }

    hiddenBaseMethod() {
      return 'hidden-base';
    }
  }

  class Component extends BaseComponent {
    @expose
    publicMethod() {
      return 'public';
    }

    privateMethod() {
      return 'private';
    }

    @expose
    overrideMethod() {
      return 'override';
    }
  }

  it('应该暴露被标记的方法', () => {
    const component = new Component();
    const handle = createExposedHandle<any>(component);

    expect(handle).not.toBeNull();
    expect(handle.publicMethod).toBeDefined();
    expect(handle.publicMethod()).toBe('public');
  });

  it('应该隐藏未标记的方法', () => {
    const component = new Component();
    const handle = createExposedHandle<any>(component);

    expect(handle.privateMethod).toBeUndefined();
  });

  it('应该继承基类中被暴露的方法', () => {
    const component = new Component();
    const handle = createExposedHandle<any>(component);

    expect(handle.baseMethod).toBeDefined();
    expect(handle.baseMethod()).toBe('base');
    expect(handle.hiddenBaseMethod).toBeUndefined();
  });

  it('应该对重写方法生效', () => {
    const component = new Component();
    const handle = createExposedHandle<any>(component);

    expect(handle.overrideMethod).toBeDefined();
    expect(handle.overrideMethod()).toBe('override');
  });
});

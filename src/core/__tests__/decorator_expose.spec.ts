import { describe, it, expect } from 'vitest';
import { expose, createExposedHandle } from '../decorators';

describe('Decorator @expose', () => {
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

  it('should expose marked methods', () => {
    const component = new Component();
    const handle = createExposedHandle<any>(component);

    expect(handle).not.toBeNull();
    expect(handle.publicMethod).toBeDefined();
    expect(handle.publicMethod()).toBe('public');
  });

  it('should hide unmarked methods', () => {
    const component = new Component();
    const handle = createExposedHandle<any>(component);

    expect(handle.privateMethod).toBeUndefined();
  });

  it('should inherit exposed methods from base class', () => {
    const component = new Component();
    const handle = createExposedHandle<any>(component);

    expect(handle.baseMethod).toBeDefined();
    expect(handle.baseMethod()).toBe('base');
    expect(handle.hiddenBaseMethod).toBeUndefined();
  });

  it('should work with overridden methods', () => {
    const component = new Component();
    const handle = createExposedHandle<any>(component);

    expect(handle.overrideMethod).toBeDefined();
    expect(handle.overrideMethod()).toBe('override');
  });
});

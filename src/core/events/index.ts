/**
 * 事件系统入口
 * - 暴露事件类型、注册表、管理器、分发器与命中测试工具。
 */
export { dispatchAt, dispatchToTree, hitTest } from './dispatcher';
export { EventManager } from './manager';
export { EventRegistry } from './registry';
export * from './types';

/**
 * 模块：思维导图自定义组件类型枚举
 * 作者：edeink
 * 修改历史：
 * - 2025-12-02 新增文件头部说明，统一类型定义
 *
 * 说明：
 * 用于在运行时注册与识别思维导图相关的自定义组件类型，
 * 与核心组件类型并行存在，不与 `ComponentType` 混用。
 */
export const enum CustomComponentType {
  Viewport = 'Viewport',
  MindMapNode = 'MindMapNode',
  MindMapLayout = 'MindMapLayout',
  Connector = 'Connector',
  ConnectorStyleProvider = 'ConnectorStyleProvider',
  MindMapNodeToolbar = 'MindMapNodeToolbar',
  MindMapNodeToolbarLayer = 'MindMapNodeToolbarLayer',
}

export const enum Side {
  Left = 'left',
  Right = 'right',
}

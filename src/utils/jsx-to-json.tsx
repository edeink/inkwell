import React from "react";
import type { ComponentData } from "../editors/graphics-editor";

// 定义支持的组件类型
export interface JSXComponentProps {
  key?: string;
  children?: React.ReactNode;
}

// Column 组件 Props
export interface ColumnProps extends JSXComponentProps {
  mainAxisAlignment?:
    | "start"
    | "center"
    | "end"
    | "spaceBetween"
    | "spaceAround"
    | "spaceEvenly";
  crossAxisAlignment?: "start" | "center" | "end" | "stretch";
  mainAxisSize?: "min" | "max";
  spacing?: number;
}

// Row 组件 Props
export interface RowProps extends JSXComponentProps {
  mainAxisAlignment?:
    | "start"
    | "center"
    | "end"
    | "spaceBetween"
    | "spaceAround"
    | "spaceEvenly";
  crossAxisAlignment?: "start" | "center" | "end" | "stretch";
  spacing?: number;
}

// Text 组件 Props
export interface TextProps extends JSXComponentProps {
  text: string;
  style?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    color?: string;
    height?: number;
    textAlign?: "left" | "center" | "right";
    backgroundColor?: string;
    maxLines?: number;
    overflow?: "clip" | "ellipsis" | "fade";
  };
}

// Image 组件 Props
export interface ImageProps extends JSXComponentProps {
  src: string;
  width?: number;
  height?: number;
  fit?:
    | "fill"
    | "contain"
    | "cover"
    | "fitWidth"
    | "fitHeight"
    | "none"
    | "scaleDown";
  alignment?:
    | "topLeft"
    | "topCenter"
    | "topRight"
    | "centerLeft"
    | "center"
    | "centerRight"
    | "bottomLeft"
    | "bottomCenter"
    | "bottomRight";
}

// Container 组件 Props
export interface ContainerProps extends JSXComponentProps {
  width?: number;
  height?: number;
  padding?: EdgeInsets | number;
  margin?: EdgeInsets | number;
  backgroundColor?: string;
  borderRadius?: number;
  border?: {
    width: number;
    color: string;
  };
}

// Padding 组件 Props
export interface PaddingProps extends JSXComponentProps {
  padding: EdgeInsets | number;
}

// Center 组件 Props
export interface CenterProps extends JSXComponentProps {
  // Center 组件只需要基础属性
}

// Stack 组件 Props
export interface StackProps extends JSXComponentProps {
  fit?: "expand" | "passthrough" | "loose";
  alignment?: "topLeft" | "topCenter" | "topRight" | "centerLeft" | "center" | "centerRight" | "bottomLeft" | "bottomCenter" | "bottomRight";
}

// Positioned 组件 Props
export interface PositionedProps extends JSXComponentProps {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
}

// EdgeInsets 接口
export interface EdgeInsets {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  all?: number;
}

// SizedBox 组件 Props
export interface SizedBoxProps extends JSXComponentProps {
  width?: number;
  height?: number;
}

// JSX 组件定义
export const Column: React.FC<ColumnProps> = () => null;
export const Row: React.FC<RowProps> = () => null;
export const Text: React.FC<TextProps> = () => null;
export const Image: React.FC<ImageProps> = () => null;
export const SizedBox: React.FC<SizedBoxProps> = () => null;
export const Container: React.FC<ContainerProps> = () => null;
export const Padding: React.FC<PaddingProps> = () => null;
export const Center: React.FC<CenterProps> = () => null;
export const Stack: React.FC<StackProps> = () => null;
export const Positioned: React.FC<PositionedProps> = () => null;

// 生成唯一 key 的辅助函数
function generateKey(type: string): string {
  return `${type}-${Math.random().toString(36).substr(2, 9)}`;
}

// 将 React Element 转换为 ComponentData
function convertElementToComponentData(
  element: React.ReactElement
): ComponentData {
  const { type, props, key } = element;

  // 获取组件类型名称
  const componentTypeName =
    typeof type === "function" ? type.name.toLowerCase() : String(type);

  // 确保类型是有效的 ComponentData 类型
  const validTypes = ["column", "text", "row", "image", "sizedbox", "container", "padding", "center", "stack", "positioned"] as const;
  const componentType = validTypes.includes(componentTypeName as any)
    ? (componentTypeName as ComponentData["type"])
    : "text"; // 默认类型

  // 基础数据结构
  const componentData: ComponentData = {
    type: componentType,
    key: key || generateKey(componentType),
  };

  // 类型安全的 props 访问
  const safeProps = props as any;

  // 处理不同组件类型的特定属性
  switch (componentType) {
    case "column":
      if (safeProps.mainAxisAlignment)
        componentData.mainAxisAlignment = safeProps.mainAxisAlignment;
      if (safeProps.crossAxisAlignment)
        componentData.crossAxisAlignment = safeProps.crossAxisAlignment;
      if (safeProps.spacing !== undefined)
        componentData.spacing = safeProps.spacing;
      break;

    case "row":
      if (safeProps.mainAxisAlignment)
        componentData.mainAxisAlignment = safeProps.mainAxisAlignment;
      if (safeProps.crossAxisAlignment)
        componentData.crossAxisAlignment = safeProps.crossAxisAlignment;
      if (safeProps.spacing !== undefined)
        componentData.spacing = safeProps.spacing;
      break;

    case "text":
      componentData.text = safeProps.text;
      if (safeProps.style) componentData.style = safeProps.style;
      break;

    case "image":
      componentData.src = safeProps.src;
      if (safeProps.width !== undefined) componentData.width = safeProps.width;
      if (safeProps.height !== undefined)
        componentData.height = safeProps.height;
      if (safeProps.fit) componentData.fit = safeProps.fit;
      if (safeProps.alignment) componentData.alignment = safeProps.alignment;
      break;

    case "sizedbox":
      if (safeProps.width !== undefined) componentData.width = safeProps.width;
      if (safeProps.height !== undefined)
        componentData.height = safeProps.height;
      break;

    case "container":
      if (safeProps.width !== undefined) componentData.width = safeProps.width;
      if (safeProps.height !== undefined) componentData.height = safeProps.height;
      if (safeProps.padding !== undefined) componentData.padding = safeProps.padding;
      if (safeProps.margin !== undefined) componentData.margin = safeProps.margin;
      if (safeProps.backgroundColor) componentData.backgroundColor = safeProps.backgroundColor;
      if (safeProps.borderRadius !== undefined) componentData.borderRadius = safeProps.borderRadius;
      if (safeProps.border) componentData.border = safeProps.border;
      break;

    case "padding":
      if (safeProps.padding !== undefined) componentData.padding = safeProps.padding;
      break;

    case "center":
      // Center 组件没有特殊属性
      break;

    case "stack":
      if (safeProps.fit) componentData.fit = safeProps.fit;
      if (safeProps.alignment) componentData.alignment = safeProps.alignment;
      break;

    case "positioned":
      if (safeProps.left !== undefined) componentData.left = safeProps.left;
      if (safeProps.top !== undefined) componentData.top = safeProps.top;
      if (safeProps.right !== undefined) componentData.right = safeProps.right;
      if (safeProps.bottom !== undefined) componentData.bottom = safeProps.bottom;
      if (safeProps.width !== undefined) componentData.width = safeProps.width;
      if (safeProps.height !== undefined) componentData.height = safeProps.height;
      break;
  }

  // 处理子组件
  if (safeProps.children) {
    const children = React.Children.toArray(safeProps.children);
    if (children.length > 0) {
      componentData.children = children
        .filter((child): child is React.ReactElement =>
          React.isValidElement(child)
        )
        .map((child) => convertElementToComponentData(child));
    }
  }

  return componentData;
}

/**
 * 将 JSX 转换为 JSON 数据
 * @param jsxElement JSX 元素
 * @returns ComponentData JSON 对象
 */
export function jsxToJson(jsxElement: React.ReactElement): ComponentData {
  return convertElementToComponentData(jsxElement);
}

/**
 * 创建一个 JSX 模板函数，用于定义组件结构
 * @param template JSX 模板函数
 * @returns ComponentData JSON 对象
 */
export function createTemplate(
  template: () => React.ReactElement
): ComponentData {
  const element = template();
  return jsxToJson(element);
}

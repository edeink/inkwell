import React from "react";
import { ComponentType, type ComponentData } from "../editors/graphics-editor";
import type { FlexProperties } from "../core/flex/type";

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

// Expanded 组件 Props
export interface ExpandedProps extends JSXComponentProps {
  flex?: FlexProperties;
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
export const Expanded: React.FC<ExpandedProps> = () => null;

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
    typeof type === "function" ? type.name : String(type);

  // 确保类型是有效的 ComponentData 类型
  const validTypes: ComponentType[] = [
    ComponentType.Column,
    ComponentType.Text,
    ComponentType.Row,
    ComponentType.Expanded,
    ComponentType.Image,
    ComponentType.SizedBox,
    ComponentType.Container,
    ComponentType.Padding,
    ComponentType.Center,
    ComponentType.Stack,
    ComponentType.Positioned,
  ];
  const componentType = validTypes.includes(componentTypeName as any)
    ? (componentTypeName as ComponentData["type"])
    : ComponentType.Text; // 默认类型

  // 基础数据结构
  const componentData: ComponentData = {
    type: componentType,
    key: key || generateKey(componentType),
  };

  // 类型安全的 props 访问
  const safeProps = props as any;

  // 处理不同组件类型的特定属性
  switch (componentType) {
    case ComponentType.Column:
      if (safeProps.mainAxisAlignment)
        componentData.mainAxisAlignment = safeProps.mainAxisAlignment;
      if (safeProps.crossAxisAlignment)
        componentData.crossAxisAlignment = safeProps.crossAxisAlignment;
      if (safeProps.spacing !== undefined)
        componentData.spacing = safeProps.spacing;
      if (safeProps.mainAxisSize)
        componentData.mainAxisSize = safeProps.mainAxisSize;
      break;

    case ComponentType.Row:
      if (safeProps.mainAxisAlignment)
        componentData.mainAxisAlignment = safeProps.mainAxisAlignment;
      if (safeProps.crossAxisAlignment)
        componentData.crossAxisAlignment = safeProps.crossAxisAlignment;
      if (safeProps.spacing !== undefined)
        componentData.spacing = safeProps.spacing;
      break;

    case ComponentType.Expanded:
      if (safeProps.flex !== undefined) componentData.flex = safeProps.flex;
      if (safeProps.fit) componentData.fit = safeProps.fit;
      break;

    case ComponentType.Text:
      componentData.text = safeProps.text;
      if (safeProps.style) componentData.style = safeProps.style;
      break;

    case ComponentType.Image:
      componentData.src = safeProps.src;
      if (safeProps.width !== undefined) componentData.width = safeProps.width;
      if (safeProps.height !== undefined)
        componentData.height = safeProps.height;
      if (safeProps.fit) componentData.fit = safeProps.fit;
      if (safeProps.alignment) componentData.alignment = safeProps.alignment;
      break;

    case ComponentType.SizedBox:
      if (safeProps.width !== undefined) componentData.width = safeProps.width;
      if (safeProps.height !== undefined)
        componentData.height = safeProps.height;
      break;

    case ComponentType.Container:
      if (safeProps.width !== undefined) componentData.width = safeProps.width;
      if (safeProps.height !== undefined)
        componentData.height = safeProps.height;
      if (safeProps.padding !== undefined)
        componentData.padding = safeProps.padding;
      if (safeProps.margin !== undefined)
        componentData.margin = safeProps.margin;
      if (safeProps.backgroundColor)
        componentData.backgroundColor = safeProps.backgroundColor;
      if (safeProps.borderRadius !== undefined)
        componentData.borderRadius = safeProps.borderRadius;
      if (safeProps.border) componentData.border = safeProps.border;
      break;

    case ComponentType.Padding:
      if (safeProps.padding !== undefined)
        componentData.padding = safeProps.padding;
      break;

    case ComponentType.Center:
      // Center 组件没有特殊属性
      break;

    case ComponentType.Stack:
      if (safeProps.fit) componentData.fit = safeProps.fit;
      if (safeProps.alignment) componentData.alignment = safeProps.alignment;
      break;

    case ComponentType.Positioned:
      if (safeProps.left !== undefined) componentData.left = safeProps.left;
      if (safeProps.top !== undefined) componentData.top = safeProps.top;
      if (safeProps.right !== undefined) componentData.right = safeProps.right;
      if (safeProps.bottom !== undefined)
        componentData.bottom = safeProps.bottom;
      if (safeProps.width !== undefined) componentData.width = safeProps.width;
      if (safeProps.height !== undefined)
        componentData.height = safeProps.height;
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

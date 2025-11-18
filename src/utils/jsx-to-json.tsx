import type { ComponentData } from "../editors/graphics-editor";
import type { JSXElement } from "./jsx-runtime";
import { compileElement, compileTemplate } from "./jsx-compiler";

export function jsxToJson(jsxElement: JSXElement | React.ReactElement): ComponentData {
  return compileElement(jsxElement as any);
}

export function createTemplate(template: () => JSXElement | React.ReactElement): ComponentData {
  return compileTemplate(template as any);
}

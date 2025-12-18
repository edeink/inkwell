# Project Rules & AI Guidelines

This document defines the coding standards, architectural overview, and collaboration guidelines for the `@edeink/inkwell` project.

## 1. Project Context

**Name**: `@edeink/inkwell`
**Type**: Canvas-based UI Rendering Framework (React + TypeScript)
**Purpose**: A declarative, Flutter-like widget system for building high-performance canvas applications (Mindmaps, Charts, etc.) in React.

## 2. Architecture & Tech Stack

### Tech Stack
- **Core**: React 19, TypeScript ~5.8
- **Build**: Vite
- **Styling**: Less, CSS Modules (`*.module.less`)
- **Testing**: Vitest
- **Docs**: Docusaurus

### Directory Structure
- `src/core`: **Core Framework**. Contains the Widget system, Element tree, RenderObject tree, and Event system.
- `src/renderer`: **Rendering Layer**. Currently implements `Canvas2DRenderer`.
- `src/utils/compiler`: **JSX Compiler**. Custom runtime to compile JSX into Widgets.
- `src/demo`: **Applications**. Example apps like `mindmap`.
- `src/devtools`: **Debugging**. Tools to inspect the widget tree.

## 3. Coding Standards

### React Components (UI / Tools)
When creating React components (e.g., for DevTools or Demos):
- **Folder Structure**: `your-component/` (kebab-case) containing:
  - `index.tsx`
  - `index.module.less`
- **Class Names**: Use `classnames` library. Do not string concatenate.
- **Types**: Use strict TypeScript. Avoid `any`. Prefer `enum` or union types over magic strings.
- **Styles**: Use CSS Modules.

**Example**:
```typescript
import cn from 'classnames';
import styles from './index.module.less';

export enum ButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
}

interface Props {
  variant?: ButtonVariant;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = ButtonVariant.Primary, disabled, children }: Props) {
  return (
    <div className={cn(styles.button, {
      [styles.disabled]: disabled,
      [styles[`variant-${variant}`]]: true,
    })}>
      {children}
    </div>
  );
}
```

### Framework Core (Widgets)
When working in `src/core`:
- **Widgets**: Must extend `StatelessWidget`, `StatefulWidget`, or `RenderObjectWidget`.
- **Naming**: PascalCase for Widget classes (e.g., `Container`, `Row`).
- **Performance**: Avoid unnecessary object allocations in `build` or `paint` methods.

## 4. AI Collaboration Guidelines (vibeCoding)

### Role
You are a Senior Core Engineer working on a high-performance rendering engine. You value correctness, performance, and clean architecture.

### Key Workflows
1.  **Creating a Widget**:
    - Define the Widget class in `src/core`.
    - Implement the corresponding `RenderObject` if it's a leaf node.
    - Register in `src/utils/compiler` if it needs special JSX handling (rare).
    - Add a documentation file in `docs/widgets`.

2.  **Debugging Rendering Issues**:
    - Check `Canvas2DRenderer` in `src/renderer`.
    - Verify `paint` methods in RenderObjects.
    - Use `src/devtools` to inspect the tree state.

3.  **Performance Optimization**:
    - Look for excessive re-layouts or re-paints.
    - Check `markNeedsLayout` and `markNeedsPaint` usage.

### Critical Files
- `src/core/base.ts`: Base Widget/Element definitions.
- `src/renderer/canvas2d/canvas-2d-renderer.ts`: Main rendering loop.
- `src/core/events/dispatcher.ts`: Event handling logic.

### Documentation
- Always update `README.md` if high-level setup changes.
- Add JSDoc comments to all public APIs in `src/core`.
- If a new feature is added, create a corresponding doc in `docs/`.

## 5. Comments & Text Requirements

This project strictly follows these Chinese language specifications:

1.  **Source Code Comments**: All comments in source code (including JS/TS files) must be written in **Chinese**.
2.  **Test Descriptions**: The `it` descriptions in test files must use **Chinese** to clearly express the test intent.
3.  **Assertion Messages**: Description text in test assertions must be in **Chinese**.
4.  **Error Messages**: Error messages and log outputs must be in **Chinese**.
5.  **String Constants**: String constants used for parsing or display must be in **Chinese**.
6.  **Documentation**: Explanatory text in documentation must be in **Chinese**.

**Exceptions**:
-   Technical terminology can remain in English.
-   Third-party library API calls can remain in their original English form.

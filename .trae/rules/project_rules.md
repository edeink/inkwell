Use this prompt to guide component creation in a React/TypeScript frontend:
- Project context: This is a frontend React + TypeScript project.
- Folder naming rule: Create the component in a folder named using the pattern `your-component/` (a kebab-case convention, e.g., `user-profile-card/`). The folder must contain:
  - `index.tsx`
  - `index.modules.less`
- Class names: If an element requires multiple `className`s, use the `classnames` library; do not concatenate strings.
- Enums over strings: Prefer TypeScript `enum` (or union literal types) instead of raw string constants wherever feasible.
- Type safety: Minimize the use of `any`. Use precise types, generics, and utility types.
- Comments: Add clear, concise comments for non-obvious logic, intent, and constraints.
Example snippet:
```typescript
import cn from 'classnames';
export enum Variant {
  Primary = 'primary',
  Secondary = 'secondary',
}
interface Props {
  variant?: Variant;
  disabled?: boolean;
}
export function YourComponent({ variant = Variant.Primary, disabled }: Props) {
  // Explain why we combine classes this way (e.g., state-driven variants)
  const className = cn('your-component', {
    'is-disabled': disabled,
    [`is-${variant}`]: true,
  });
  return <div className={className}>...</div>;
}
```

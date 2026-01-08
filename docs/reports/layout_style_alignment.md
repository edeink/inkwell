# Style Alignment Report: Layout Benchmark

This document records the style alignment adjustments made to `src/benchmark/tester/layout/dom.tsx` to match the baseline implementation in `src/benchmark/tester/layout/widget.tsx`.

## Baseline (Widget Implementation)
- **Root**: `Container` (White BG) -> `Wrap` (spacing=2, runSpacing=2).
- **Chain Root**: `Container` (50x50).
- **Node Structure**: Recursive depth of 20.
  - **Even Depth**: `Container` (padding=1) -> `Center`.
  - **Odd Depth**: `Stack` -> `Positioned` (all edges 1) -> `Container` (border 1px solid rgba(0,0,0,0.1)).
- **Leaf**: `Container` (100x100, color #4caf50 or #2196f3).

## DOM Implementation Adjustments

| Component | Widget Property | Previous DOM Style | Adjusted DOM Style | Reason |
|-----------|-----------------|--------------------|--------------------|--------|
| **Root** | `Wrap(spacing=2)` | `margin: 1px` on items | `gap: 2px` on container | `Wrap` places space *between* items, not around edges. `gap` mimics this better than `margin`. |
| **Even Node** | `Center` (Flex Center) | `display: flex...` | Added `position: relative` | Acts as the anchor for the subsequent absolute (Odd) child, mimicking `Stack` behavior in the recursion. |
| **Odd Node** | `Positioned` (top/left/right/bottom=1) | `top: 1px...` | No change (Verified) | Already matched. |
| **Leaf** | `width/height: 100` | `width/height: 100px` | No change (Verified) | Already matched. |
| **Colors** | `#fff` root, `#4caf50/#2196f3` leaf | Matches | Matches | Verified hex codes. |

## Verification
- **Visual**: Styles verified against code definition.
- **Structural**: DOM tree depth matches Widget tree logical depth.
- **Layout**: Flexbox `gap` ensures identical spacing behavior to Flutter/Inkwell `Wrap`.

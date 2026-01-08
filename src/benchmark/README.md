# Inkwell Benchmark Guidelines

This directory contains performance benchmarks comparing Inkwell's rendering engine against native DOM implementations.

## 📊 Metrics

We collect the following core metrics to evaluate performance:

1.  **Build Time (`buildMs`)**: Time taken to construct the widget/element tree (or DOM fragment).
2.  **Layout Time (`layoutMs`)**: Time taken to calculate layout (reflow).
3.  **Paint Time (`paintMs`)**: Time taken to paint the first frame.
4.  **Average FPS**: Average Frames Per Second during the interaction (e.g., scrolling).
5.  **Jank Count**: Number of frames that took significantly longer than the budget (16.6ms).
    *   *Definition*: A frame is considered "jank" if its duration > 1.5x average frame time or > 24ms.
6.  **Completion Time**: Total time to complete the test scenario.

## 📏 Alignment Guidelines

To ensure fair comparison, the DOM and Widget implementations must be **pixel-perfect aligned**.

### Style Consistency
*   **Dimensions**: Width, height, margins, and paddings must match exactly.
*   **Borders**: Ensure border widths and colors are identical.
*   **Typography**: Font size, family, and line height must be consistent.
*   **Layout**: Use Flexbox in DOM if Inkwell uses `Row`/`Column`.

### Validation
Before running benchmarks, visual inspection or automated style checks should verify that the DOM and Canvas outputs look identical.

## 🧪 Scroll Test Scenarios

The scroll tester (`src/benchmark/tester/scroll`) supports the following configurations:

### Directions
*   **Vertical**: Standard top-to-bottom list.
*   **Horizontal**: Left-to-right scrolling list.

### Modes
1.  **One-Way (Continuous)**: Scroll from start to end once.
2.  **Alternating (Bounce)**: Scroll from start to end, then back to start. Repeat for $N$ cycles.

### Requirements
*   **Cycles**: Minimum 10 complete scroll cycles for stable FPS measurement.
*   **Automation**: Tests must run automatically without user interaction.
*   **Flow Control**:
    *   Detect scroll completion via position checking (allow < 1px error).
    *   Handle timeouts (e.g., if scroll gets stuck).

## 🛠 Implementation Guidelines

### DOM Testing
When implementing a new DOM benchmark scenario:
1.  **Cleanup**: Always use `clearDomStage` from `src/benchmark/metrics/dom.tsx` to clean the stage before creating nodes. This ensures a consistent starting state.
2.  **Structure**: Return `Timings` object containing `buildMs`, `layoutMs`, and `paintMs`.

## 📂 Directory Structure

*   `components/`: UI components for the benchmark runner.
*   `metrics/`: Shared metric collection utilities (FPS sampler, etc.).
*   `tester/`: Specific test scenarios.
    *   `scroll/`: List scrolling performance.
    *   `layout/`: Layout calculation performance.
    *   `text/`: Text rendering performance.

import { PresetType, TestCaseType, type CaseConfig } from '../index.types';

export const BENCHMARK_CONFIG = {
  STATE: {
    FRAMES: 50,
    BATCH_SIZE: 20,
    MIN_WIDTH: 300,
    MIN_HEIGHT: 200,
  },
  PIPELINE: {
    FRAMES: 60,
    COUNT_DEFAULT: 1000,
  },
  SCROLL: {
    ITEM_HEIGHT: 50,
    DURATION_FACTOR: 1.0, // Increase factor for longer scroll
    MIN_DURATION: 1000, // Increase min duration
    MAX_DURATION: 5000, // Increase max duration
  },
};

export const CASE_CONFIGS: Record<TestCaseType, Record<PresetType, CaseConfig>> = {
  // 1. Layout 类 (Flex, Layout, Absolute, FlexRowCol) - 较快
  [TestCaseType.Flex]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },
  [TestCaseType.Layout]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },
  [TestCaseType.Absolute]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },
  [TestCaseType.FlexRowCol]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },

  // 2. Text 类 - 中等
  [TestCaseType.Text]: {
    [PresetType.Small]: { start: 50, end: 500, step: 10 },
    [PresetType.Common]: { start: 500, end: 5000, step: 100 },
    [PresetType.Large]: { start: 5000, end: 20000, step: 400 },
  },

  // 3. Scroll 类 - 较慢 (包含动画过程)
  // 增加步长，减少测试次数，以平衡增加的单次测试时长
  [TestCaseType.Scroll]: {
    [PresetType.Small]: { start: 20, end: 200, step: 40 }, // 20 -> 40
    [PresetType.Common]: { start: 200, end: 2000, step: 400 }, // 200 -> 400
    [PresetType.Large]: { start: 2000, end: 10000, step: 2000 }, // 1000 -> 2000
  },

  // 4. Pipeline/State 类 - 取决于复杂度，暂按中等处理
  [TestCaseType.Pipeline]: {
    [PresetType.Small]: { start: 50, end: 500, step: 50 },
    [PresetType.Common]: { start: 500, end: 5000, step: 500 },
    [PresetType.Large]: { start: 5000, end: 20000, step: 2000 },
  },
  [TestCaseType.State]: {
    [PresetType.Small]: { start: 50, end: 500, step: 50 },
    [PresetType.Common]: { start: 500, end: 5000, step: 500 },
    [PresetType.Large]: { start: 5000, end: 20000, step: 2000 },
  },
  [TestCaseType.CanvasBenchmark]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },
};

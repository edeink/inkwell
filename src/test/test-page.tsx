import React, { useRef, useState } from "react";
import { PixiRenderer } from "../renderer/pixi/PixiRenderer";
import { Canvas2DRenderer } from "../renderer/canvas2d/Canvas2DRenderer";
import { KonvaRenderer } from "../renderer/konva/KonvaRenderer";
import type { IRenderer, RendererOptions } from "../renderer/IRenderer";
import Editor from "../editors/graphics-editor";
import type { ComponentData } from "../editors/graphics-editor";
import {
  createTemplate,
  Column,
  Row,
  Text,
  SizedBox,
} from "../utils/jsx-to-json";
import styles from "./index.module.less";

/**
 * 渲染器测试类
 * 用于直接测试不同渲染器的图片和文字渲染功能
 */
class RendererTest {
  private renderer: IRenderer;
  private container: HTMLElement;
  private rendererType: "pixi" | "canvas2d" | "konva";

  constructor(
    container: HTMLElement,
    rendererType: "pixi" | "canvas2d" | "konva" = "pixi"
  ) {
    this.container = container;
    this.rendererType = rendererType;

    if (rendererType === "canvas2d") {
      this.renderer = new Canvas2DRenderer();
    } else if (rendererType === "konva") {
      this.renderer = new KonvaRenderer();
    } else {
      this.renderer = new PixiRenderer();
    }
  }

  /**
   * 初始化渲染器
   */
  async init(): Promise<void> {
    const options: RendererOptions = {
      width: 800,
      height: 600,
      background: 0xffffff,
      backgroundAlpha: 1,
      antialias: true,
      resolution: 2,
    };

    await this.renderer.initialize(this.container, options);
    console.log(`${this.rendererType.toUpperCase()} 渲染器初始化完成`);
  }

  /**
   * 清空画布
   */
  clearCanvas(): void {
    this.renderer.render();
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.renderer.destroy();
    console.log(`${this.rendererType.toUpperCase()} 渲染器已销毁`);
  }

  /**
   * 运行渲染器测试
   */
  async runRendererTest(): Promise<void> {
    console.log(`开始运行 ${this.rendererType.toUpperCase()} 渲染器测试...`);

    // 测试文本渲染
    this.renderer.drawText({
      text: "渲染器测试文本",
      x: 100,
      y: 100,
      fontSize: 24,
      color: "#333333",
      fontWeight: "bold",
    });

    // 测试矩形渲染
    this.renderer.drawRect({
      x: 100,
      y: 150,
      width: 200,
      height: 100,
      fill: "#007bff",
      stroke: "#0056b3",
      strokeWidth: 2,
    });

    // 测试更多文本
    this.renderer.drawText({
      text: "矩形渲染测试",
      x: 120,
      y: 180,
      fontSize: 16,
      color: "#ffffff",
    });

    console.log(`${this.rendererType.toUpperCase()} 渲染器测试完成`);
  }

  /**
   * 运行完整流程测试 - 使用编辑器
   */
  async runCompleteTest(): Promise<void> {
    try {
      console.log("开始运行编辑器完整流程测试...");

      // 创建测试数据（使用JSX语法）
      const testData: ComponentData = createTemplate(() => (
        <Column
          key="root"
          mainAxisAlignment="start"
          crossAxisAlignment="start"
          spacing={4}
        >
          <Text
            key="title"
            text="Build → Layout → Paint 完整流程测试"
            style={{
              fontSize: 24,
              color: "#333333",
              fontWeight: "bold",
            }}
          />
          <SizedBox key="spacer1" height={20} />
          <Row key="content-row" spacing={4}>
            <Column key="build-column" spacing={4}>
              <Text
                key="build-title"
                text="Build 阶段"
                style={{
                  fontSize: 18,
                  color: "#007bff",
                  fontWeight: "bold",
                }}
              />
              <Text
                key="build-1"
                text="✓ 解析组件数据"
                style={{
                  fontSize: 14,
                  color: "#28a745",
                }}
              />
              <Text
                key="build-2"
                text="✓ 构建组件树"
                style={{
                  fontSize: 14,
                  color: "#28a745",
                }}
              />
              <SizedBox key="spacer2" height={10} />
              <Text
                key="layout-title"
                text="Layout 阶段"
                style={{
                  fontSize: 18,
                  color: "#007bff",
                  fontWeight: "bold",
                }}
              />
              <Text
                key="layout-1"
                text="✓ 计算约束条件"
                style={{
                  fontSize: 14,
                  color: "#28a745",
                }}
              />
              <Text
                key="layout-2"
                text="✓ 确定组件尺寸"
                style={{
                  fontSize: 14,
                  color: "#28a745",
                }}
              />
              <Text
                key="layout-3"
                text="✓ 定位子组件"
                style={{
                  fontSize: 14,
                  color: "#28a745",
                }}
              />
            </Column>
            <Column key="paint-column" spacing={4}>
              <Text
                key="paint-title"
                text="Paint 阶段"
                style={{
                  fontSize: 18,
                  color: "#007bff",
                  fontWeight: "bold",
                }}
              />
              <Text
                key="paint-1"
                text="✓ 绘制文本内容"
                style={{
                  fontSize: 14,
                  color: "#28a745",
                }}
              />
              <Text
                key="paint-2"
                text="✓ 绘制背景色"
                style={{
                  fontSize: 14,
                  color: "#28a745",
                }}
              />
              <Text
                key="paint-3"
                text="✓ 应用变换矩阵"
                style={{
                  fontSize: 14,
                  color: "#28a745",
                }}
              />
              <SizedBox key="spacer3" height={10} />
              <Text
                key="renderer-info"
                text={`当前渲染器: ${this.rendererType.toUpperCase()}`}
                style={{
                  fontSize: 16,
                  color: "#dc3545",
                  fontWeight: "bold",
                }}
              />
            </Column>
          </Row>
        </Column>
      ));

      // 清空容器内容
      this.container.innerHTML = "";

      // 为容器设置临时ID（如果没有的话）
      if (!this.container.id) {
        this.container.id =
          "temp-editor-container-" + Math.random().toString(36).substr(2, 9);
      }

      // 创建编辑器实例并渲染
      const editor = await Editor.create(this.container.id, {
        renderer: this.rendererType,
      });
      await editor.renderFromJSON(testData);

      console.log("编辑器完整流程测试完成");
    } catch (error) {
      console.error("编辑器完整流程测试失败:", error);
    }
  }
}

type TabType = "complete" | "renderer";

const TestPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const testInstanceRef = useRef<RendererTest | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("complete");
  const [rendererType, setRendererType] = useState<
    "pixi" | "canvas2d" | "konva"
  >("canvas2d");

  const initRenderer = async () => {
    if (containerRef.current) {
      testInstanceRef.current = new RendererTest(
        containerRef.current,
        rendererType
      );
      await testInstanceRef.current.init();
    }
  };

  const clearCanvas = () => {
    if (testInstanceRef.current) {
      testInstanceRef.current.clearCanvas();
    }
  };

  // 完整流程测试：Build → Layout → Paint
  const runCompleteTest = async () => {
    console.log("运行完整流程测试...");
    clearCanvas();

    if (!containerRef.current) return;

    const testInstance = new RendererTest(containerRef.current, rendererType);
    await testInstance.runCompleteTest();
  };

  // 渲染器测试
  const runRendererTest = async () => {
    console.log("运行渲染器测试...");

    if (!testInstanceRef.current) {
      await initRenderer();
    }

    if (testInstanceRef.current) {
      clearCanvas();
      await testInstanceRef.current.runRendererTest();
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>渲染器测试页面</h1>

      {/* Tab 导航 */}
      <div className={styles.tabNavigation}>
        <button
          onClick={() => setActiveTab("complete")}
          className={`${styles.tabButton} ${
            activeTab === "complete" ? styles.active : ""
          }`}
        >
          完整流程测试
        </button>
        <button
          onClick={() => setActiveTab("renderer")}
          className={`${styles.tabButton} ${
            activeTab === "renderer" ? styles.active : ""
          }`}
        >
          渲染器测试
        </button>
      </div>

      {/* 完整流程测试页签 */}
      {activeTab === "complete" && (
        <div className={styles.testContent}>
          <h2>完整流程测试</h2>
          <p>测试 Build → Layout → Paint 三个阶段的完整渲染流程</p>

          <div className={styles.controlSection}>
            <label>选择渲染器:</label>
            <select
              value={rendererType}
              onChange={(e) =>
                setRendererType(e.target.value as "pixi" | "canvas2d" | "konva")
              }
            >
              <option value="pixi">PixiJS 渲染器</option>
              <option value="canvas2d">Canvas2D 渲染器</option>
              <option value="konva">Konva 渲染器</option>
            </select>
          </div>

          <div className={styles.buttonGroup}>
            <button
              onClick={runCompleteTest}
              className={`${styles.button} ${styles.primary}`}
            >
              运行完整流程测试
            </button>
          </div>

          <div ref={containerRef} className={styles.canvasContainer} />
        </div>
      )}

      {/* 渲染器测试页签 */}
      {activeTab === "renderer" && (
        <div className={styles.testContent}>
          <h2>渲染器独立测试</h2>
          <p>直接测试渲染器的绘制功能，不经过 Build 和 Layout 阶段</p>

          <div className={styles.controlSection}>
            <label>选择渲染器:</label>
            <select
              value={rendererType}
              onChange={(e) =>
                setRendererType(e.target.value as "pixi" | "canvas2d" | "konva")
              }
            >
              <option value="pixi">PixiJS 渲染器</option>
              <option value="canvas2d">Canvas2D 渲染器</option>
              <option value="konva">Konva 渲染器</option>
            </select>
          </div>

          <div className={styles.buttonGroup}>
            <button
              onClick={runRendererTest}
              className={`${styles.button} ${styles.success}`}
            >
              运行渲染器测试
            </button>
            <button
              onClick={clearCanvas}
              className={`${styles.button} ${styles.danger}`}
            >
              清空画布
            </button>
          </div>

          <div ref={containerRef} className={styles.canvasContainer} />
        </div>
      )}
    </div>
  );
};

export default TestPage;

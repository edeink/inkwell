import { useEffect } from "react";
import "./App.css";
import Editor from "./editors/graphics-editor";
import type { ComponentData } from "./editors/graphics-editor";

// 测试JSON数据 - 包含column布局和text组件
const testData: ComponentData = {
  type: "column",
  mainAxisAlignment: "center",
  crossAxisAlignment: "center",
  spacing: 20,
  children: [
    {
      type: "text",
      text: "Hello World!",
      style: {
        fontSize: 12,
        color: "#333333",
        fontWeight: "bold",
      },
    },
    {
      type: "text",
      text: "这是一个测试文本",
      style: {
        fontSize: 12,
        color: "#666666",
      },
    },
    {
      type: "column",
      mainAxisAlignment: "start",
      spacing: 10,
      children: [
        {
          type: "text",
          text: "嵌套的Column布局",
          style: {
            fontSize: 12,
            color: "#0066cc",
          },
        },
        {
          type: "text",
          text: "支持多层嵌套结构",
          style: {
            fontSize: 12,
            color: "#999999",
          },
        },
      ],
    },
  ],
};

function App() {
  useEffect(() => {
    const initEditor = async () => {
      const editor = await Editor.create("editor-wrapper");
      // 渲染测试数据
      await editor.renderFromJSON(testData);
    };

    initEditor().catch(console.error);
  }, []);

  return (
    <div id="editor-wrapper" style={{ width: "100vw", height: "100vh" }}></div>
  );
}

export default App;

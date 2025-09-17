import { useEffect } from "react";
import "./App.css";
import Editor from "./editors/graphics-editor";
import type { ComponentData } from "./editors/graphics-editor";
import { createTemplate, Column, Row, Text, Image, SizedBox } from "./utils/jsx-to-json";

// 使用 JSX 语法定义测试数据 - 包含column、row、image、sizedBox布局和text组件
const testData: ComponentData = createTemplate(() => (
  <Column key="root" mainAxisAlignment="center" crossAxisAlignment="center" spacing={20}>
    <Text
      key="title"
      text="UI组件演示"
      style={{
        fontSize: 18,
        color: "#333333",
        fontWeight: "bold",
      }}
    />
    
    <Row key="button-row" mainAxisAlignment="spaceEvenly" crossAxisAlignment="center" spacing={15}>
      <SizedBox key="button1-container" width={80} height={35}>
        <Text
          key="button1-text"
          text="按钮1"
          style={{
            fontSize: 12,
            color: "#ffffff",
            backgroundColor: "#007bff",
            textAlign: "center",
          }}
        />
      </SizedBox>
      
      <SizedBox key="button2-container" width={80} height={35}>
        <Text
          key="button2-text"
          text="按钮2"
          style={{
            fontSize: 12,
            color: "#ffffff",
            backgroundColor: "#28a745",
            textAlign: "center",
          }}
        />
      </SizedBox>
      
      <SizedBox key="button3-container" width={80} height={35}>
        <Text
          key="button3-text"
          text="按钮3"
          style={{
            fontSize: 12,
            color: "#ffffff",
            backgroundColor: "#dc3545",
            textAlign: "center",
          }}
        />
      </SizedBox>
    </Row>
    
    <Row key="content-row" mainAxisAlignment="spaceAround" crossAxisAlignment="start" spacing={20}>
      <Column key="image-column" mainAxisAlignment="start" crossAxisAlignment="center" spacing={10}>
        <Text
          key="image-title"
          text="图片展示:"
          style={{
            fontSize: 14,
            color: "#0066cc",
            fontWeight: "bold",
          }}
        />
        
        <SizedBox key="image-container" width={120} height={120}>
          <Image
            key="demo-image"
            src="/linear-gradient.svg"
            fit="cover"
            alignment="center"
          />
        </SizedBox>
        
        <Text
          key="image-caption"
          text="固定尺寸图片"
          style={{
            fontSize: 11,
            color: "#666666",
          }}
        />
      </Column>
      
      <Column key="layout-column" mainAxisAlignment="start" crossAxisAlignment="start" spacing={10}>
        <Text
          key="layout-title"
          text="布局组合:"
          style={{
            fontSize: 14,
            color: "#0066cc",
            fontWeight: "bold",
          }}
        />
        
        <Row key="layout-row1" mainAxisAlignment="start" crossAxisAlignment="center" spacing={8}>
          <SizedBox key="icon1-container" width={20} height={20}>
            <Image
              key="icon1"
              src="/linear-gradient.svg"
              fit="contain"
            />
          </SizedBox>
          
          <Text
            key="text1"
            text="SizedBox + Image"
            style={{
              fontSize: 12,
              color: "#333333",
            }}
          />
        </Row>
        
        <Row key="layout-row2" mainAxisAlignment="start" crossAxisAlignment="center" spacing={8}>
          <SizedBox key="icon2-container" width={20} height={20}>
            <Image
              key="icon2"
              src="/linear-gradient.svg"
              fit="contain"
            />
          </SizedBox>
          
          <Text
            key="text2"
            text="Row + Column 嵌套"
            style={{
              fontSize: 12,
              color: "#333333",
            }}
          />
        </Row>
        
        <Text
          key="footer-text"
          text="支持多种组件的灵活组合"
          style={{
            fontSize: 10,
            color: "#999999",
          }}
        />
      </Column>
    </Row>
  </Column>
));

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

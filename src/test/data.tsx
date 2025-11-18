/** @jsxImportSource ../utils */
import { Center, Column, Container, Expanded, Padding, Positioned, Row, Stack, Text } from "../core";

export const getTestTemplate = () => (
  <Column
    key="complete-demo-root"
    mainAxisAlignment="start"
    crossAxisAlignment="start"
    spacing={20}
  >
    <Text
      key="demo-title"
      text="完整 Widget 组件展示"
      style={{
        fontSize: 32,
        color: "#2c3e50",
        fontWeight: "bold",
      }}
    />

    {/* Row中的Expanded测试：居中修复并增加调试边框 */}
    <Row key="row-expanded-section" spacing={10} mainAxisAlignment="center" crossAxisAlignment="center">
      <Container border={{ width: 1, color: "#9e9e9e" }} padding={2}>
        <Text
          key="row-left-text"
          text="左侧"
          style={{
            fontSize: 16,
            color: "#d32f2f",
            textBaseline: "top",
          }}
        />
      </Container>
      <Expanded flex={{ flex: 1 }}>
        <Container key="row-expanded-container" color="#e8f5e8" height={120} padding={8} border={{ width: 1, color: "#9e9e9e" }} borderRadius={12}>
          <Center>
            <Text
              key="row-expanded-text"
              text="中间弹性区域"
              style={{
                fontSize: 16,
                color: "#2e7d32",
                textBaseline: "middle",
              }}
            />
          </Center>
        </Container>
      </Expanded>
      <Container border={{ width: 1, color: "#9e9e9e" }} padding={2}>
        <Text
          key="row-right-text"
          text="右侧"
          style={{
            fontSize: 16,
            color: "#d32f2f",
            textBaseline: "top",
          }}
        />
      </Container>
    </Row>

    {/* Container 组件展示 */}
    <Column key="container-section" spacing={15} mainAxisSize="min">
      <Text
        key="container-title"
        text="Container 组件"
        style={{
          fontSize: 24,
          color: "#3498db",
          fontWeight: "bold",
        }}
      />

      <Row key="container-examples" spacing={20}>
        <Container
          key="basic-container"
          width={150}
          height={100}
          color="#e74c3c"
          padding={12}
        >
          <Text
            key="container-text"
            text="基础容器"
            style={{
              fontSize: 16,
              fontWeight: "bold",
            }}
          />
        </Container>

        <Container
          key="rounded-container"
          width={150}
          height={100}
          color="#2ecc71"
          borderRadius={15}
          padding={12}
          border={{ width: 2, color: "#1b5e20" }}
        >
          <Text
            key="rounded-text"
            text="圆角容器"
            style={{
              fontSize: 16,
              fontWeight: "bold",
              textBaseline: "top",
            }}
          />
        </Container>

        <Container
          key="bordered-container"
          width={150}
          height={100}
          color="#f39c12"
          border={{
            width: 3,
            color: "#e67e22",
          }}
          padding={12}
        >
          <Text
            key="bordered-text"
            text="边框容器"
            style={{
              fontSize: 16,
              fontWeight: "bold",
            }}
          />
        </Container>
      </Row>
    </Column>

    {/* Padding 组件展示 */}
    <Column key="padding-section" spacing={15} mainAxisSize="min">
      <Text
        key="padding-title"
        text="Padding 组件"
        style={{
          fontSize: 24,
          color: "#28a745",
          fontWeight: "bold",
        }}
      />

      <Row key="padding-examples" spacing={20}>
        <Container
          key="padding-demo-1"
          color="#e9ecef"
          border={{
            width: 1,
            color: "#dee2e6",
          }}
        >
          <Padding key="small-padding" padding={10}>
            <Text
              key="padding-text-1"
              text="小间距 Padding"
              style={{
                fontSize: 14,
                color: "#495057",
              }}
            />
          </Padding>
        </Container>

        <Container
          key="padding-demo-2"
          color="#e9ecef"
          border={{
            width: 1,
            color: "#dee2e6",
          }}
        >
          <Padding key="large-padding" padding={25}>
            <Text
              key="padding-text-2"
              text="大间距 Padding"
              style={{
                fontSize: 14,
                color: "#495057",
              }}
            />
          </Padding>
        </Container>
      </Row>
    </Column>

    {/* Center 组件展示 */}
    <Column key="center-section" spacing={15} mainAxisSize="min">
      <Text
        key="center-title"
        text="Center 组件"
        style={{
          fontSize: 24,
          color: "#ffc107",
          fontWeight: "bold",
        }}
      />

      <Container
        key="center-demo"
        width={300}
        height={120}
        color="#fff3cd"
        border={{
          width: 1,
          color: "#ffeaa7",
        }}
      >
        <Center key="center-widget">
          <Text
            key="center-text"
            text="居中显示的文本"
            style={{
              fontSize: 16,
              color: "#856404",
              fontWeight: "bold",
            }}
          />
        </Center>
      </Container>
    </Column>

    {/* Stack 组件展示 */}
    <Column key="stack-section" spacing={15} mainAxisSize="min">
      <Text
        key="stack-title"
        text="Stack 组件"
        style={{
          fontSize: 24,
          color: "#dc3545",
          fontWeight: "bold",
        }}
      />

      <Container
        key="stack-demo"
        width={250}
        height={150}
        border={{
          width: 1,
          color: "#dee2e6",
        }}
      >
        <Stack key="stack-widget" alignment="center">
          <Container
            key="stack-bg"
            width={200}
            height={100}
            color="#f8d7da"
          />
          <Text
            key="stack-text"
            text="堆叠布局"
            style={{
              fontSize: 18,
              color: "#721c24",
              fontWeight: "bold",
            }}
          />
        </Stack>
      </Container>
    </Column>

    {/* Positioned 组件展示 */}
    <Column key="positioned-section" spacing={15} mainAxisSize="min">
      <Text
        key="positioned-title"
        text="Positioned 组件"
        style={{
          fontSize: 24,
          color: "#6f42c1",
          fontWeight: "bold",
        }}
      />

      <Container
        key="positioned-demo"
        width={300}
        height={200}
        color="#f8f9fa"
        border={{
          width: 1,
          color: "#dee2e6",
        }}
      >
        <Stack key="positioned-stack">
          <Positioned key="positioned-tl" left={10} top={10}>
            <Container
              key="pos-tl-container"
              width={60}
              height={30}
              color="#6f42c1"
            >
              <Text
                key="pos-tl-text"
                text="左上"
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              />
            </Container>
          </Positioned>

          <Positioned key="positioned-br" right={10} bottom={10}>
            <Container
              key="pos-br-container"
              width={60}
              height={30}
              color="#6f42c1"
            >
              <Text
                key="pos-br-text"
                text="右下"
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              />
            </Container>
          </Positioned>
        </Stack>
      </Container>
    </Column>

    <Text
      key="demo-footer"
      text="以上展示了所有新增 Widget 组件的基本功能"
      style={{
        fontSize: 16,
        color: "#6c757d",
      }}
    />
  </Column>
);

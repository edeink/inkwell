import {
  createTemplate,
  Column,
  Row,
  Text,
  SizedBox,
  Container,
  Padding,
  Center,
  Stack,
  Positioned,
} from "../utils/jsx-to-json";

export const getTestData = () => {
  const testData = createTemplate(() => (
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

      {/* Container 组件展示 */}
      <Column key="container-section" spacing={15}>
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
            backgroundColor="#e74c3c"
            padding={12}
          >
            <Text
              key="container-text"
              text="基础 Container"
              style={{
                fontSize: 14,
                color: "#ffffff",
                fontWeight: "bold",
              }}
            />
          </Container>

          <Container
            key="border-container"
            width={150}
            height={100}
            backgroundColor="#f8f9fa"
            border={{
              width: 2,
              color: "#007bff",
            }}
            padding={12}
          >
            <Text
              key="border-text"
              text="带边框 Container"
              style={{
                fontSize: 14,
                color: "#007bff",
                fontWeight: "bold",
              }}
            />
          </Container>
        </Row>
      </Column>

      {/* <SizedBox key="section-spacer-1" height={20} /> */}

      {/* Padding 组件展示 */}
      {/* <Column key="padding-section" spacing={15}>
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
            backgroundColor="#e9ecef"
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
            backgroundColor="#e9ecef"
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
      </Column> */}

      {/* <SizedBox key="section-spacer-2" height={20} /> */}

      {/* Center 组件展示 */}
      {/* <Column key="center-section" spacing={15}>
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
          backgroundColor="#fff3cd"
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
      </Column> */}

      {/* <SizedBox key="section-spacer-3" height={20} /> */}

      {/* Stack 组件展示 */}
      {/* <Column key="stack-section" spacing={15}>
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
              backgroundColor="#f8d7da"
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
      </Column> */}

      {/* <SizedBox key="section-spacer-4" height={20} /> */}

      {/* Positioned 组件展示 */}
      {/* <Column key="positioned-section" spacing={15}>
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
          backgroundColor="#f8f9fa"
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
                backgroundColor="#6f42c1"
              >
                <Text
                  key="pos-tl-text"
                  text="左上"
                  style={{
                    fontSize: 12,
                    color: "#ffffff",
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
                backgroundColor="#6f42c1"
              >
                <Text
                  key="pos-br-text"
                  text="右下"
                  style={{
                    fontSize: 12,
                    color: "#ffffff",
                    fontWeight: "bold",
                  }}
                />
              </Container>
            </Positioned>
          </Stack>
        </Container>
      </Column> */}

      {/* <SizedBox key="final-spacer" height={30} /> */}

      {/* <Text
        key="demo-footer"
        text="以上展示了所有新增 Widget 组件的基本功能"
        style={{
          fontSize: 16,
          color: "#6c757d",
        }}
      /> */}
    </Column>
  ));

  return testData;
};

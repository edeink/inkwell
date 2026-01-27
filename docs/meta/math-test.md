---
title: 数学公式渲染测试
---

# 数学公式渲染测试

本文档用于验证 VitePress 的数学公式渲染功能（基于 KaTeX）。

## 1. 基础公式

行内公式：质能方程 $E = mc^2$。

块级公式：

$$
I = \int_0^{2\pi} \sin(x) dx
$$

## 2. 复杂公式

### 2.1 矩阵

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\times
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$

### 2.2 麦克斯韦方程组

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

## 3. 响应式布局测试

当屏幕较窄时，公式应当出现滚动条或自动换行（取决于 Katex 配置，通常会有滚动条）。

$$
f(x) = a_0 + \sum_{n=1}^{\infty} (a_n \cos \frac{n\pi x}{L} + b_n \sin \frac{n\pi x}{L})
$$

## 4. 与其他 Markdown 元素混排

*   列表项中的公式：$e^{i\pi} + 1 = 0$
*   **加粗文本中的公式**：$\sqrt{2}$
*   [链接中的公式 $\alpha$](#)

## 5. 如何在文档中使用公式

Inkwell 文档支持 LaTeX 语法渲染数学公式。

1.  **行内公式**：使用单个 `$` 包裹，如 `$E = mc^2$`。
2.  **块级公式**：使用 `$$` 包裹，单独占行。

```latex
$$
\sum_{i=1}^n i = \frac{n(n+1)}{2}
$$
```

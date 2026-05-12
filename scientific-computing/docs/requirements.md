# Scientific Computing — 需求规格

> 本文件为需求基准，Confirm Agent 基于此进行需求确认。

## 模块需求

### M-01: 线性代数 (linalg)
- 矩阵乘法、LU 分解、特征值计算
- 数值精度：与 NumPy 参考实现相对误差 ≤ 1e-12

### M-02: 统计分布 (stats)
- 正态、t、卡方、F 分布
- PDF/CDF/PPF 函数
- 精度：与 SciPy 参考实现相对误差 ≤ 1e-10

### M-03: 插值与拟合 (interp)
- 线性插值、三次样条、最小二乘拟合
- 边界条件处理

### M-04: 数值积分 (integrate)
- 梯形法则、Simpson、Gauss 求积
- 自适应步长控制

## 非功能需求
- mypy strict 模式零类型警告
- 每个公开函数含完整 docstring
- 性能：核心运算不超过 SciPy 同功能的 5 倍 wall-clock 时间

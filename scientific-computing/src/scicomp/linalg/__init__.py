"""线性代数模块 — 矩阵运算与分解。"""

from scicomp.linalg.core import (
    determinant,
    eigenvalues_2x2,
    lu_decomposition,
    matrix_multiply,
    solve_linear_system,
)

__all__ = [
    "determinant",
    "eigenvalues_2x2",
    "lu_decomposition",
    "matrix_multiply",
    "solve_linear_system",
]

"""线性代数模块 — 矩阵运算与分解。"""

from scicomp.linalg.core import (
    cholesky_decomposition,
    determinant,
    eig,
    eigenvalues_2x2,
    lu_decomposition,
    matrix_inverse,
    matrix_multiply,
    matrix_norm,
    matrix_transpose,
    qr_decomposition,
    solve_linear_system,
    trace,
    vector_norm,
)

__all__ = [
    "cholesky_decomposition",
    "determinant",
    "eig",
    "eigenvalues_2x2",
    "lu_decomposition",
    "matrix_inverse",
    "matrix_multiply",
    "matrix_norm",
    "matrix_transpose",
    "qr_decomposition",
    "solve_linear_system",
    "trace",
    "vector_norm",
]

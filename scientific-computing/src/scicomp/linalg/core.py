"""Core linear algebra operations — matrix multiplication, LU decomposition, linear system solving, determinant, and eigenvalue computation."""

from __future__ import annotations

import math

import numpy as np
from numpy.typing import ArrayLike


def _validate_matrix(A: ArrayLike, name: str = "A") -> np.ndarray:
    """Validate and convert input to a 2D numpy array.

    Args:
        A: Input array-like object.
        name: Name of the parameter for error messages.

    Returns:
        A 2D numpy array.

    Raises:
        TypeError: If the input is not or cannot be converted to a 2D array.
    """
    if not isinstance(A, np.ndarray):
        A = np.asarray(A)
    if A.ndim != 2:
        raise TypeError(f"{name} must be a 2D matrix, got ndim={A.ndim}")
    return A


def matrix_multiply(A: ArrayLike, B: ArrayLike) -> np.ndarray:
    """Multiply two matrices.

    Computes the matrix product of A and B using numpy's native
    matrix multiplication.

    Args:
        A: First matrix with shape (m, n).
        B: Second matrix with shape (n, p).

    Returns:
        The matrix product with shape (m, p).

    Raises:
        TypeError: If A or B is not a 2D array.
        ValueError: If the matrices have incompatible dimensions.
    """
    A_arr = _validate_matrix(A, "A")
    B_arr = _validate_matrix(B, "B")
    if A_arr.shape[1] != B_arr.shape[0]:
        raise ValueError(
            f"Incompatible dimensions: A has {A_arr.shape[1]} columns, "
            f"B has {B_arr.shape[0]} rows"
        )
    return A_arr @ B_arr  # type: ignore[no-any-return]


def lu_decomposition(A: ArrayLike) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Compute LU decomposition with partial pivoting.

    Computes P, L, U such that PA = LU, where P is a permutation matrix,
    L is lower triangular with unit diagonal, and U is upper triangular.

    Uses partial pivoting for numerical stability. Singularity is detected
    using a dynamic tolerance: max(m, n) * eps * ||A||_1.

    Args:
        A: Square matrix to decompose with shape (n, n).

    Returns:
        A tuple (L, U, P) of numpy arrays.

    Raises:
        TypeError: If A is not a 2D array.
        ValueError: If A is not square or is numerically singular.
    """
    A_arr = _validate_matrix(A, "A")
    n, m = A_arr.shape
    if n != m:
        raise ValueError(f"Matrix must be square, got {n} x {m}")

    A_float = A_arr.astype(np.float64)
    eps = np.finfo(np.float64).eps
    tol = max(n, m) * eps * np.linalg.norm(A_float, 1)

    L = np.eye(n, dtype=np.float64)
    U = A_float.copy()
    P = np.eye(n, dtype=np.float64)

    for k in range(n - 1):
        pivot = int(np.argmax(np.abs(U[k:, k]))) + k

        if np.abs(U[pivot, k]) < tol:
            raise ValueError("Matrix is singular (zero pivot encountered)")

        if pivot != k:
            U[[k, pivot]] = U[[pivot, k]]
            L[[k, pivot], :k] = L[[pivot, k], :k]
            P[[k, pivot]] = P[[pivot, k]]

        for i in range(k + 1, n):
            L[i, k] = U[i, k] / U[k, k]
            U[i, k:] -= L[i, k] * U[k, k:]

    if np.abs(U[n - 1, n - 1]) < tol:
        raise ValueError("Matrix is singular (zero pivot encountered)")

    return (L, U, P)


def solve_linear_system(A: ArrayLike, b: ArrayLike) -> np.ndarray:
    """Solve a linear system Ax = b using LU decomposition.

    Uses the LU decomposition with partial pivoting, then performs
    forward substitution (Ly = Pb) and back substitution (Ux = y).

    Args:
        A: Coefficient matrix with shape (n, n).
        b: Right-hand side with shape (n,) or (n, m) for multiple
            right-hand sides.

    Returns:
        Solution with shape (n,) or (n, m) matching the shape of b.

    Raises:
        TypeError: If A is not a 2D array.
        ValueError: If A is singular or dimensions are incompatible.
    """
    A_arr = _validate_matrix(A, "A")
    if not isinstance(b, np.ndarray):
        b_arr = np.asarray(b)
    else:
        b_arr = b

    n = A_arr.shape[0]
    if b_arr.ndim == 1:
        if b_arr.shape[0] != n:
            raise ValueError(f"b must have length {n}, got {b_arr.shape[0]}")
        b_mat = b_arr.reshape(-1, 1)
    elif b_arr.ndim == 2:
        if b_arr.shape[0] != n:
            raise ValueError(f"b must have {n} rows, got {b_arr.shape[0]}")
        b_mat = b_arr
    else:
        raise ValueError(f"b must be 1D or 2D, got ndim={b_arr.ndim}")

    L, U, P = lu_decomposition(A_arr)

    # Apply permutation to right-hand side
    Pb = P @ b_mat.astype(np.float64)

    # Forward substitution: solve Ly = Pb
    y = np.zeros_like(Pb, dtype=np.float64)
    for i in range(n):
        y[i] = Pb[i] - L[i, :i] @ y[:i]

    # Back substitution: solve Ux = y
    x = np.zeros_like(y, dtype=np.float64)
    for i in range(n - 1, -1, -1):
        x[i] = (y[i] - U[i, i + 1:] @ x[i + 1:]) / U[i, i]

    if b_arr.ndim == 1:
        return x.flatten()
    return x


def determinant(A: ArrayLike) -> float:
    """Compute the determinant of a square matrix using LU decomposition.

    Uses the fact that det(A) = det(P) * det(U) since det(L) = 1 (L has a
    unit diagonal). For singular matrices, returns 0.0.

    Args:
        A: Square matrix with shape (n, n).

    Returns:
        The determinant of A.

    Raises:
        TypeError: If A is not a 2D array.
        ValueError: If A is not square.
    """
    A_arr = _validate_matrix(A, "A")
    n, m = A_arr.shape
    if n != m:
        raise ValueError(f"Matrix must be square, got {n} x {m}")

    try:
        _, U, P = lu_decomposition(A_arr)
    except ValueError:
        return 0.0

    # Compute sign of permutation matrix P
    perm = np.argmax(P, axis=1)
    inv_count = 0
    for i in range(n):
        for j in range(i + 1, n):
            if perm[i] > perm[j]:
                inv_count += 1
    sign = -1.0 if inv_count % 2 else 1.0

    # det(L) = 1 (unit diagonal), det(U) = product of diagonal entries
    return float(sign * np.prod(np.diag(U)))


def eigenvalues_2x2(A: ArrayLike) -> np.ndarray:
    """Compute eigenvalues of a 2x2 matrix using the analytical formula.

    For matrix [[a, b], [c, d]], eigenvalues are:
        lambda = (trace +/- sqrt(trace^2 - 4 * det)) / 2

    The formula handles both real and complex eigenvalues.

    Args:
        A: 2x2 matrix.

    Returns:
        Array of two eigenvalues. Returns float64 array for real eigenvalues,
        complex128 array for complex eigenvalues.

    Raises:
        TypeError: If A is not a 2D array.
        ValueError: If A is not 2x2.
    """
    A_arr = _validate_matrix(A, "A")
    if A_arr.shape != (2, 2):
        raise ValueError(
            f"Matrix must be 2x2, got {A_arr.shape[0]}x{A_arr.shape[1]}"
        )

    a = float(A_arr[0, 0])
    b = float(A_arr[0, 1])
    c = float(A_arr[1, 0])
    d = float(A_arr[1, 1])

    trace = a + d
    det = a * d - b * c
    disc = trace * trace - 4.0 * det

    if disc >= 0.0:
        sqrt_real = math.sqrt(disc)
        return np.array(
            [(trace + sqrt_real) / 2.0, (trace - sqrt_real) / 2.0]
        )
    sqrt_cplx = 1j * math.sqrt(-disc)
    return np.array(
        [(trace + sqrt_cplx) / 2.0, (trace - sqrt_cplx) / 2.0]
    )

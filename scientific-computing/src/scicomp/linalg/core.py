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


def _validate_square(A: ArrayLike, name: str = "A") -> np.ndarray:
    """Validate and convert input to a square 2D numpy array.

    Args:
        A: Input array-like object.
        name: Name of the parameter for error messages.

    Returns:
        A square 2D numpy array.

    Raises:
        TypeError: If the input is not or cannot be converted to a 2D array.
        ValueError: If the matrix is not square.
    """
    A_arr = _validate_matrix(A, name)
    n, m = A_arr.shape
    if n != m:
        raise ValueError(
            f"{name} must be a square matrix, got {n} x {m}"
        )
    return A_arr


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

    # Compute sign of permutation matrix P via its determinant
    sign = float(np.linalg.det(P))

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


_NORM_ORD_MAP: dict[str, int | float] = {
    "l1": 1,
    "l2": 2,
    "linf": np.inf,
}


def vector_norm(x: np.ndarray, ord: str = "l2") -> float:
    """Compute the vector norm of a 1D array.

    Supports l1, l2, and infinity (linf) norms via numpy.linalg.norm.

    Args:
        x: 1D input array.
        ord: Norm order. One of ``"l1"``, ``"l2"``, ``"linf"``.
            Defaults to ``"l2"``.

    Returns:
        The computed norm as a float.

    Raises:
        TypeError: If *x* is not a 1D array.
        ValueError: If *ord* is not a recognized norm order.
    """
    if not isinstance(x, np.ndarray):
        x = np.asarray(x)
    if x.ndim != 1:
        raise TypeError(
            f"Input must be a 1D array, got ndim={x.ndim}"
        )
    if ord not in _NORM_ORD_MAP:
        raise ValueError(
            f"Unrecognized norm order '{ord}'. "
            f"Supported values: {', '.join(sorted(_NORM_ORD_MAP))}"
        )
    return float(np.linalg.norm(x, ord=_NORM_ORD_MAP[ord]))


_MATRIX_NORM_ORD_MAP: dict[str, int | float | None] = {
    "fro": None,
    "l1": 1,
    "linf": np.inf,
    "l2": 2,
}


def eig(A: ArrayLike) -> tuple[np.ndarray, np.ndarray]:
    """Compute eigenvalues and eigenvectors of a square matrix.

    Delegates to numpy.linalg.eig.

    Args:
        A: Square matrix with shape (n, n).

    Returns:
        A tuple (w, v) where w is the eigenvalues and v is the
        eigenvectors. The eigenvalues are not guaranteed to be in
        any specific order.

    Raises:
        TypeError: If A is not a 2D array.
        ValueError: If A is not square or eigenvalue computation fails.
    """
    A_arr = _validate_square(A)
    try:
        w, v = np.linalg.eig(A_arr)
    except np.linalg.LinAlgError as e:
        raise ValueError(str(e)) from e
    return (w, v)


def matrix_inverse(A: ArrayLike) -> np.ndarray:
    """Compute the inverse of a square matrix.

    Delegates to numpy.linalg.inv.

    Args:
        A: Square matrix with shape (n, n).

    Returns:
        The inverse matrix.

    Raises:
        TypeError: If A is not a 2D array.
        ValueError: If A is not square or is singular.
    """
    A_arr = _validate_square(A)
    try:
        return np.linalg.inv(A_arr)
    except np.linalg.LinAlgError as e:
        raise ValueError("Matrix is singular") from e


def qr_decomposition(A: ArrayLike) -> tuple[np.ndarray, np.ndarray]:
    """Compute the QR decomposition of a matrix.

    Delegates to numpy.linalg.qr with mode='reduced'.
    Returns Q (orthogonal) and R (upper triangular) such that
    A = Q @ R.

    Args:
        A: Matrix with shape (m, n).

    Returns:
        A tuple (Q, R) of numpy arrays.

    Raises:
        TypeError: If A is not a 2D array.
    """
    A_arr = _validate_matrix(A)
    Q, R_arr = np.linalg.qr(A_arr, mode="reduced")
    return (Q, R_arr)


def cholesky_decomposition(A: ArrayLike) -> np.ndarray:
    """Compute the Cholesky decomposition of a matrix.

    Delegates to numpy.linalg.cholesky.
    Returns L such that A = L @ L^T where L is lower triangular.

    The matrix must be symmetric (Hermitian) positive-definite.

    Args:
        A: Square positive-definite matrix with shape (n, n).

    Returns:
        The lower triangular Cholesky factor.

    Raises:
        TypeError: If A is not a 2D array.
        ValueError: If A is not square or not positive-definite.
    """
    A_arr = _validate_square(A)
    try:
        return np.linalg.cholesky(A_arr)
    except np.linalg.LinAlgError as e:
        raise ValueError(str(e)) from e


def matrix_norm(A: ArrayLike, ord: str = "fro") -> float:
    """Compute the norm of a matrix.

    Delegates to numpy.linalg.norm.
    Supports Frobenius (``"fro"``), l1, linf, and spectral (``"l2"``)
    norms. Note that ``"l2"`` for matrices computes the spectral norm
    (largest singular value), which differs from the vector l2 norm.

    Args:
        A: 2D input matrix.
        ord: Norm order. One of ``"fro"``, ``"l1"``, ``"l2"``,
            ``"linf"``. Defaults to ``"fro"``.

    Returns:
        The computed norm as a float.

    Raises:
        TypeError: If A is not a 2D array.
        ValueError: If *ord* is not a recognized norm order.
    """
    A_arr = _validate_matrix(A)
    if ord not in _MATRIX_NORM_ORD_MAP:
        raise ValueError(
            f"Unrecognized norm order '{ord}'. "
            f"Supported values: {', '.join(sorted(_MATRIX_NORM_ORD_MAP))}"
        )
    return float(np.linalg.norm(A_arr, ord=_MATRIX_NORM_ORD_MAP[ord]))


def matrix_transpose(A: ArrayLike) -> np.ndarray:
    """Compute the transpose of a matrix.

    Delegates to numpy.transpose.

    Args:
        A: 2D input matrix with shape (m, n).

    Returns:
        The transposed matrix with shape (n, m).

    Raises:
        TypeError: If A is not a 2D array.
    """
    A_arr = _validate_matrix(A)
    return np.transpose(A_arr)


def trace(A: ArrayLike) -> float:
    """Compute the trace of a square matrix.

    Delegates to numpy.trace. The trace is the sum of diagonal
    elements.

    Args:
        A: Square matrix with shape (n, n).

    Returns:
        The trace as a float.

    Raises:
        TypeError: If A is not a 2D array.
        ValueError: If A is not square.
    """
    A_arr = _validate_square(A)
    return float(np.trace(A_arr))

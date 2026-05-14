"""Tests for scicomp.linalg — matrix decompositions (LU, QR, Cholesky)."""

from __future__ import annotations

import numpy as np
import pytest
from numpy.testing import assert_allclose

from scicomp.linalg.core import (
    cholesky_decomposition,
    lu_decomposition,
    qr_decomposition,
)


class TestLUDecomposition:
    """Tests for lu_decomposition."""

    def test_pa_eq_lu(self) -> None:
        """PA equals LU for random square matrices of various sizes."""
        rng = np.random.default_rng(42)
        for n in [2, 3, 5, 10]:
            A = rng.random((n, n))
            L, U, P = lu_decomposition(A)
            # Verify PA = LU
            assert_allclose(P @ A, L @ U, atol=1e-12)
            # Verify L is lower triangular with unit diagonal
            assert_allclose(np.tril(L), L)
            assert_allclose(np.diag(L), np.ones(n), atol=1e-12)
            # Verify U is upper triangular (within tolerance for FP residuals)
            assert_allclose(np.triu(U), U, atol=1e-12)

    def test_singular(self) -> None:
        """Singular matrix raises ValueError."""
        A = np.array([[1.0, 2.0], [2.0, 4.0]])
        with pytest.raises(ValueError, match="singular"):
            lu_decomposition(A)

    def test_non_square(self) -> None:
        """Non-square matrix raises ValueError."""
        A = np.eye(3, 2)
        with pytest.raises(ValueError, match="square"):
            lu_decomposition(A)


class TestQRDecomposition:
    """Tests for qr_decomposition."""

    def test_random_square(self) -> None:
        """Q @ R approx A and Q^T @ Q approx I for random square."""
        rng = np.random.default_rng(42)
        A = rng.random((4, 4))
        Q, R = qr_decomposition(A)
        assert_allclose(Q @ R, A, atol=1e-12)
        assert_allclose(Q.T @ Q, np.eye(4), atol=1e-12)

    def test_non_square(self) -> None:
        """Non-square matrix produces correct shapes."""
        rng = np.random.default_rng(42)
        A = rng.random((5, 3))
        Q, R = qr_decomposition(A)
        assert Q.shape == (5, 3)
        assert R.shape == (3, 3)
        assert_allclose(Q @ R, A, atol=1e-12)

    def test_non_2d_type_error(self) -> None:
        """Non-2D input raises TypeError."""
        A = np.array([1.0, 2.0, 3.0])
        with pytest.raises(TypeError, match="must be a 2D matrix"):
            qr_decomposition(A)

    def test_1x1(self) -> None:
        """1x1 matrix QR decomposition yields factor of 1."""
        Q, R = qr_decomposition(np.array([[5.0]]))
        assert_allclose(Q, [[1.0]], atol=1e-12)
        assert_allclose(R, [[5.0]], atol=1e-12)

    def test_list_input(self) -> None:
        """List input is accepted and converted."""
        A = [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]
        Q, R = qr_decomposition(A)
        assert_allclose(Q @ R, np.array(A), atol=1e-12)


class TestCholeskyDecomposition:
    """Tests for cholesky_decomposition."""

    def test_random(self) -> None:
        """L @ L^T approx A and L is lower triangular."""
        rng = np.random.default_rng(42)
        A = rng.random((4, 4))
        A = A.T @ A  # Make symmetric positive-definite
        L = cholesky_decomposition(A)
        assert_allclose(L @ L.T, A, atol=1e-12)
        assert_allclose(np.triu(L, k=1), np.zeros_like(L), atol=1e-12)

    def test_non_symmetric(self) -> None:
        """Non-symmetric matrix raises ValueError."""
        A = np.array([[1.0, 2.0], [3.0, 4.0]])
        with pytest.raises(ValueError):
            cholesky_decomposition(A)

    def test_not_positive_definite(self) -> None:
        """Non-positive-definite matrix raises ValueError."""
        A = np.array([[-1.0, 0.0], [0.0, -1.0]])
        with pytest.raises(ValueError):
            cholesky_decomposition(A)

    def test_1x1(self) -> None:
        """1x1 positive-definite matrix."""
        L = cholesky_decomposition(np.array([[4.0]]))
        assert_allclose(L, [[2.0]], atol=1e-12)

    def test_list_input(self) -> None:
        """List input is accepted and converted."""
        A = np.array([[4.0, 2.0], [2.0, 5.0]])
        L = cholesky_decomposition(A.tolist())
        assert_allclose(L @ L.T, A, atol=1e-12)

    def test_non_square(self) -> None:
        """Non-square matrix raises ValueError."""
        A = np.eye(3, 2)
        with pytest.raises(ValueError, match="square matrix"):
            cholesky_decomposition(A)

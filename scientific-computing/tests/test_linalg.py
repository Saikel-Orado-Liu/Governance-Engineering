"""Tests for scicomp.linalg — matrix operations with numpy reference comparison."""

from __future__ import annotations

import numpy as np
import pytest
from numpy.testing import assert_allclose

from scicomp.linalg.core import (
    determinant,
    eigenvalues_2x2,
    lu_decomposition,
    matrix_multiply,
    solve_linear_system,
)


# =============================================================================
# matrix_multiply
# =============================================================================

class TestMatrixMultiply:
    """Tests for matrix_multiply."""

    def test_identity(self) -> None:
        """Multiplying identity matrices yields identity."""
        result = matrix_multiply(np.eye(3), np.eye(3))
        assert_allclose(result, np.eye(3), atol=1e-12)

    def test_random(self) -> None:
        """Result matches numpy reference for random matrices."""
        rng = np.random.default_rng(42)
        A = rng.random((4, 3))
        B = rng.random((3, 5))
        result = matrix_multiply(A, B)
        expected = A @ B
        assert_allclose(result, expected, atol=1e-12)

    def test_dim_mismatch(self) -> None:
        """Incompatible dimensions raise ValueError."""
        A = np.eye(3)
        B = np.eye(2)
        with pytest.raises(ValueError, match="Incompatible dimensions"):
            matrix_multiply(A, B)

    def test_non_2d_type_error(self) -> None:
        """Non-2D input raises TypeError."""
        A = np.array([1.0, 2.0, 3.0])
        B = np.eye(3)
        with pytest.raises(TypeError, match="must be a 2D matrix"):
            matrix_multiply(A, B)

    def test_list_input(self) -> None:
        """List inputs are accepted and converted."""
        A = [[1.0, 2.0], [3.0, 4.0]]
        B = [[5.0, 6.0], [7.0, 8.0]]
        result = matrix_multiply(A, B)
        expected = np.array(A) @ np.array(B)
        assert_allclose(result, expected, atol=1e-12)


# =============================================================================
# lu_decomposition
# =============================================================================

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


# =============================================================================
# solve_linear_system
# =============================================================================

class TestSolveLinearSystem:
    """Tests for solve_linear_system."""

    def test_identity(self) -> None:
        """System with identity matrix returns the right-hand side."""
        A = np.eye(3)
        b = np.array([1.0, 2.0, 3.0])
        x = solve_linear_system(A, b)
        assert_allclose(x, b, atol=1e-12)

    def test_random(self) -> None:
        """Solution satisfies Ax = b for a random non-singular system."""
        rng = np.random.default_rng(42)
        A = rng.random((5, 5))
        b = rng.random(5)
        x = solve_linear_system(A, b)
        assert_allclose(A @ x, b, atol=1e-10)

    def test_singular(self) -> None:
        """Singular matrix raises ValueError."""
        A = np.array([[1.0, 2.0], [2.0, 4.0]])
        b = np.array([1.0, 2.0])
        with pytest.raises(ValueError, match="singular"):
            solve_linear_system(A, b)

    def test_multiple_rhs(self) -> None:
        """Multiple right-hand sides are handled correctly."""
        rng = np.random.default_rng(42)
        A = rng.random((4, 4))
        b = rng.random((4, 3))
        x = solve_linear_system(A, b)
        assert_allclose(A @ x, b, atol=1e-10)


# =============================================================================
# determinant
# =============================================================================

class TestDeterminant:
    """Tests for determinant."""

    def test_identity(self) -> None:
        """det(I) = 1."""
        assert_allclose(determinant(np.eye(3)), 1.0, atol=1e-12)

    def test_2x2(self) -> None:
        """Known 2x2 determinant matches expected value."""
        A = [[1.0, 2.0], [3.0, 4.0]]
        assert_allclose(determinant(A), -2.0, atol=1e-12)

    def test_random(self) -> None:
        """Determinant matches numpy reference for random matrices."""
        rng = np.random.default_rng(42)
        for n in [2, 3, 5]:
            A = rng.random((n, n))
            result = determinant(A)
            expected = np.linalg.det(A)
            assert_allclose(result, expected, atol=1e-12)

    def test_singular_returns_zero(self) -> None:
        """Singular matrix returns zero, does not raise."""
        A = np.array([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0], [7.0, 8.0, 9.0]])
        assert_allclose(determinant(A), 0.0, atol=1e-12)

    def test_non_square(self) -> None:
        """Non-square matrix raises ValueError."""
        A = np.eye(3, 2)
        with pytest.raises(ValueError, match="square"):
            determinant(A)

    def test_random_nxn_sign(self) -> None:
        """Determinant of random 4x4 matrix matches numpy sign and magnitude."""
        rng = np.random.default_rng(123)
        A = rng.random((4, 4))
        result = determinant(A)
        expected = np.linalg.det(A)
        assert_allclose(result, expected, atol=1e-12)


# =============================================================================
# eigenvalues_2x2
# =============================================================================

class TestEigenvalues2x2:
    """Tests for eigenvalues_2x2."""

    def test_identity(self) -> None:
        """Eigenvalues of identity are [1, 1]."""
        eigvals = eigenvalues_2x2(np.eye(2))
        assert_allclose(eigvals, [1.0, 1.0], atol=1e-12)

    def test_real(self) -> None:
        """Real eigenvalues from a 2x2 matrix match numpy reference."""
        A = np.array([[1.0, 2.0], [3.0, 4.0]])
        eigvals = eigenvalues_2x2(A)
        expected = np.linalg.eigvals(A)
        # Sort by real part for comparison
        idx_r = np.argsort(eigvals.real)
        idx_e = np.argsort(expected.real)
        assert_allclose(eigvals[idx_r], expected[idx_e], atol=1e-12)

    def test_complex(self) -> None:
        """Complex eigenvalues from a rotation matrix satisfy char. poly."""
        A = np.array([[0.0, -1.0], [1.0, 0.0]])
        eigvals = eigenvalues_2x2(A)
        # Eigenvalues should have non-zero imaginary part
        assert np.any(np.abs(eigvals.imag) > 1e-15)
        # Check characteristic polynomial: lambda^2 - trace * lambda + det = 0
        trace_val = np.trace(A)
        det_val = np.linalg.det(A)
        for eigval in eigvals:
            residual = eigval**2 - trace_val * eigval + det_val
            assert_allclose(residual, 0.0, atol=1e-12)

    def test_trace_sum(self) -> None:
        """Sum of eigenvalues equals trace of matrix."""
        rng = np.random.default_rng(42)
        A = rng.random((2, 2))
        eigvals = eigenvalues_2x2(A)
        assert_allclose(np.sum(eigvals), np.trace(A), atol=1e-12)

    def test_non_2x2(self) -> None:
        """Non-2x2 matrix raises ValueError."""
        A = np.eye(3)
        with pytest.raises(ValueError, match="2x2"):
            eigenvalues_2x2(A)

    def test_list_input(self) -> None:
        """List input is accepted and converted."""
        A = [[1.0, 2.0], [3.0, 4.0]]
        eigvals = eigenvalues_2x2(A)
        expected = np.linalg.eigvals(A)
        idx_r = np.argsort(eigvals.real)
        idx_e = np.argsort(expected.real)
        assert_allclose(eigvals[idx_r], expected[idx_e], atol=1e-12)

"""Tests for scicomp.linalg — utility operations (solve, determinant, inverse, transpose, trace)."""

from __future__ import annotations

import numpy as np
import pytest
from numpy.testing import assert_allclose

from scicomp.linalg.core import (
    determinant,
    matrix_inverse,
    matrix_transpose,
    solve_linear_system,
    trace,
)


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


class TestMatrixInverse:
    """Tests for matrix_inverse."""

    def test_identity(self) -> None:
        """Inverse of identity is identity."""
        result = matrix_inverse(np.eye(3))
        assert_allclose(result, np.eye(3), atol=1e-12)

    def test_random(self) -> None:
        """A @ inv(A) approx I for random matrix."""
        rng = np.random.default_rng(42)
        A = rng.random((4, 4))
        invA = matrix_inverse(A)
        assert_allclose(A @ invA, np.eye(4), atol=1e-10)

    def test_singular(self) -> None:
        """Singular matrix raises ValueError."""
        A = np.array([[1.0, 2.0], [2.0, 4.0]])
        with pytest.raises(ValueError, match="Matrix is singular"):
            matrix_inverse(A)

    def test_1x1(self) -> None:
        """Inverse of 1x1 matrix works correctly."""
        result = matrix_inverse(np.array([[5.0]]))
        assert_allclose(result, [[0.2]], atol=1e-12)

    def test_list_input(self) -> None:
        """List input is accepted and converted."""
        A = [[1.0, 2.0], [3.0, 4.0]]
        invA = matrix_inverse(A)
        assert_allclose(np.array(A) @ invA, np.eye(2), atol=1e-12)

    def test_non_square(self) -> None:
        """Non-square matrix raises ValueError."""
        A = np.eye(3, 2)
        with pytest.raises(ValueError, match="square matrix"):
            matrix_inverse(A)

    def test_non_2d_type_error(self) -> None:
        """Non-2D input raises TypeError."""
        A = np.array([1.0, 2.0, 3.0])
        with pytest.raises(TypeError, match="must be a 2D matrix"):
            matrix_inverse(A)


class TestMatrixTranspose:
    """Tests for matrix_transpose."""

    def test_2x3(self) -> None:
        """2x3 matrix transposes to 3x2."""
        A = np.array([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]])
        result = matrix_transpose(A)
        assert result.shape == (3, 2)
        assert_allclose(result, A.T, atol=1e-12)

    def test_list_input(self) -> None:
        """List input is accepted and converted."""
        A = [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]
        result = matrix_transpose(A)
        expected = np.transpose(np.array(A))
        assert_allclose(result, expected, atol=1e-12)

    def test_non_2d_type_error(self) -> None:
        """Non-2D input raises TypeError."""
        A = np.array([1.0, 2.0, 3.0])
        with pytest.raises(TypeError, match="must be a 2D matrix"):
            matrix_transpose(A)

    def test_1x1(self) -> None:
        """1x1 matrix transpose returns itself."""
        A = np.array([[5.0]])
        result = matrix_transpose(A)
        assert_allclose(result, A, atol=1e-12)

    def test_square_symmetric(self) -> None:
        """Symmetric matrix transpose equals itself."""
        A = np.array([[1.0, 2.0], [2.0, 3.0]])
        result = matrix_transpose(A)
        assert_allclose(result, A, atol=1e-12)


class TestTrace:
    """Tests for trace."""

    def test_identity(self) -> None:
        """Trace of 3x3 identity is 3.0."""
        result = trace(np.eye(3))
        assert_allclose(result, 3.0, atol=1e-12)

    def test_random(self) -> None:
        """Trace matches numpy reference for random matrix."""
        rng = np.random.default_rng(42)
        A = rng.random((5, 5))
        result = trace(A)
        expected = np.trace(A)
        assert_allclose(result, expected, atol=1e-12)

    def test_non_square(self) -> None:
        """Non-square matrix raises ValueError."""
        A = np.eye(3, 2)
        with pytest.raises(ValueError, match="square matrix"):
            trace(A)

    def test_1x1(self) -> None:
        """Trace of 1x1 matrix is its single element."""
        result = trace(np.array([[5.0]]))
        assert_allclose(result, 5.0, atol=1e-12)

    def test_list_input(self) -> None:
        """List input is accepted and converted."""
        A = [[1.0, 2.0], [3.0, 4.0]]
        result = trace(A)
        assert_allclose(result, 5.0, atol=1e-12)

    def test_non_2d_type_error(self) -> None:
        """Non-2D input raises TypeError."""
        A = np.array([1.0, 2.0, 3.0])
        with pytest.raises(TypeError, match="must be a 2D matrix"):
            trace(A)

    def test_zero_matrix(self) -> None:
        """Trace of zero matrix is 0."""
        result = trace(np.zeros((3, 3)))
        assert_allclose(result, 0.0, atol=1e-12)

"""Tests for scicomp.linalg — eigenvalue computations."""

from __future__ import annotations

import numpy as np
import pytest
from numpy.testing import assert_allclose

from scicomp.linalg.core import eig, eigenvalues_2x2


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


class TestEig:
    """Tests for eig."""

    def test_identity(self) -> None:
        """Identity matrix eigenvalues are all 1."""
        A = np.eye(3)
        w, v = eig(A)
        assert_allclose(w, [1.0, 1.0, 1.0], atol=1e-12)

    def test_random(self) -> None:
        """A @ v[:, i] approx w[i] * v[:, i] for random 3x3."""
        rng = np.random.default_rng(42)
        A = rng.random((3, 3))
        w, v = eig(A)
        assert_allclose(A @ v, v @ np.diag(w), atol=1e-10)

    def test_non_square(self) -> None:
        """Non-square matrix raises ValueError."""
        A = np.eye(3, 2)
        with pytest.raises(ValueError, match="square matrix"):
            eig(A)

    def test_1x1(self) -> None:
        """1x1 matrix eigenvalue equals its single element."""
        w, v = eig(np.array([[5.0]]))
        assert_allclose(w, [5.0], atol=1e-12)
        assert_allclose(v, [[1.0]], atol=1e-12)

    def test_list_input(self) -> None:
        """List input is accepted and converted."""
        A = [[1.0, 2.0], [3.0, 4.0]]
        w, v = eig(A)
        assert_allclose(np.array(A) @ v, v @ np.diag(w), atol=1e-10)

    def test_non_2d_type_error(self) -> None:
        """Non-2D input raises TypeError."""
        A = np.array([1.0, 2.0, 3.0])
        with pytest.raises(TypeError, match="must be a 2D matrix"):
            eig(A)

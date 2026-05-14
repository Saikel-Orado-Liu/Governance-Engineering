"""Tests for scicomp.linalg — matrix multiplication."""

from __future__ import annotations

import numpy as np
import pytest
from numpy.testing import assert_allclose

from scicomp.linalg.core import matrix_multiply


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

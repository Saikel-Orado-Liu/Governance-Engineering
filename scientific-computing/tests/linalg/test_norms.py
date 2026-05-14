"""Tests for scicomp.linalg — vector and matrix norms."""

from __future__ import annotations

import numpy as np
import pytest
from numpy.testing import assert_allclose

from scicomp.linalg.core import matrix_norm, vector_norm


class TestVectorNorm:
    """Tests for vector_norm."""

    def test_l2_default(self) -> None:
        """Default l2 norm matches numpy reference for 3-4-5 triangle."""
        x = np.array([3.0, 4.0])
        result = vector_norm(x)
        assert_allclose(result, 5.0, atol=1e-12)

    def test_l1(self) -> None:
        """l1 norm computes sum of absolute values."""
        x = np.array([1.0, -2.0, 3.0])
        result = vector_norm(x, ord="l1")
        assert_allclose(result, 6.0, atol=1e-12)

    def test_linf(self) -> None:
        """linf norm computes max absolute value."""
        x = np.array([-5.0, 2.0, 3.0])
        result = vector_norm(x, ord="linf")
        assert_allclose(result, 5.0, atol=1e-12)

    def test_empty_array(self) -> None:
        """Empty array returns 0.0 for all norms."""
        x = np.array([])
        for ord_val in ["l1", "l2", "linf"]:
            result = vector_norm(x, ord=ord_val)
            assert_allclose(result, 0.0, atol=1e-12)

    def test_single_element(self) -> None:
        """Single element returns absolute value for all norms."""
        x = np.array([-7.0])
        for ord_val in ["l1", "l2", "linf"]:
            assert_allclose(vector_norm(x, ord=ord_val), 7.0, atol=1e-12)

    def test_2d_raises_typeerror(self) -> None:
        """2D input raises TypeError."""
        x = np.array([[1.0, 2.0], [3.0, 4.0]])
        with pytest.raises(TypeError, match="Input must be a 1D array"):
            vector_norm(x)

    def test_3d_raises_typeerror(self) -> None:
        """3D input raises TypeError."""
        x = np.zeros((2, 2, 2))
        with pytest.raises(TypeError, match="Input must be a 1D array"):
            vector_norm(x)

    def test_invalid_ord_raises_valueerror(self) -> None:
        """Invalid norm order raises ValueError."""
        x = np.array([1.0, 2.0])
        with pytest.raises(ValueError, match="Unrecognized norm order"):
            vector_norm(x, ord="l4")
        with pytest.raises(ValueError, match="Unrecognized norm order"):
            vector_norm(x, ord="L2")
        with pytest.raises(ValueError, match="Unrecognized norm order"):
            vector_norm(x, ord="")

    def test_list_input(self) -> None:
        """List input is accepted and converted."""
        x = np.array([3.0, 4.0])
        result = vector_norm(x)
        assert_allclose(result, 5.0, atol=1e-12)

    def test_negative_values(self) -> None:
        """Negative values handled correctly for all norms."""
        x = np.array([-1.0, -2.0, -3.0])
        assert_allclose(vector_norm(x, ord="l1"), 6.0, atol=1e-12)
        expected_l2 = np.sqrt(14.0)
        assert_allclose(vector_norm(x, ord="l2"), expected_l2, atol=1e-12)
        assert_allclose(vector_norm(x, ord="linf"), 3.0, atol=1e-12)

    def test_random_matches_numpy(self) -> None:
        """All norms match numpy.linalg.norm for random input."""
        rng = np.random.default_rng(42)
        x = rng.random(10) * 20.0 - 10.0
        cases = [("l1", 1), ("l2", 2), ("linf", np.inf)]
        for ord_name, ord_val in cases:
            result = vector_norm(x, ord=ord_name)
            expected = np.linalg.norm(x, ord=ord_val)
            assert_allclose(result, expected, atol=1e-12)


class TestMatrixNorm:
    """Tests for matrix_norm."""

    def test_identity_fro(self) -> None:
        """Frobenius norm of 3x3 identity is sqrt(3)."""
        result = matrix_norm(np.eye(3))
        assert_allclose(result, np.sqrt(3.0), atol=1e-12)

    def test_random_all_ords(self) -> None:
        """All matrix norms match numpy reference."""
        rng = np.random.default_rng(42)
        A = rng.random((4, 4))
        for ord_name, ord_val in [
            ("fro", None), ("l1", 1.0), ("l2", 2.0), ("linf", np.inf),
        ]:
            result = matrix_norm(A, ord=ord_name)
            expected = np.linalg.norm(A, ord=ord_val)
            assert_allclose(result, expected, atol=1e-12)

    def test_invalid_ord(self) -> None:
        """Invalid norm order raises ValueError."""
        A = np.eye(3)
        with pytest.raises(ValueError, match="Unrecognized norm order"):
            matrix_norm(A, ord="invalid")

    def test_non_2d_type_error(self) -> None:
        """Non-2D input raises TypeError."""
        A = np.array([1.0, 2.0, 3.0])
        with pytest.raises(TypeError, match="must be a 2D matrix"):
            matrix_norm(A)

    def test_list_input(self) -> None:
        """List input is accepted and converted."""
        A = [[3.0, 4.0], [0.0, 0.0]]
        result = matrix_norm(A, ord="fro")
        assert_allclose(result, 5.0, atol=1e-12)

    def test_rectangular(self) -> None:
        """Non-square matrix norm matches numpy reference."""
        rng = np.random.default_rng(42)
        A = rng.random((5, 3))
        for ord_name, ord_val in [
            ("fro", None), ("l1", 1.0), ("l2", 2.0), ("linf", np.inf),
        ]:
            result = matrix_norm(A, ord=ord_name)
            expected = np.linalg.norm(A, ord=ord_val)
            assert_allclose(result, expected, atol=1e-12)

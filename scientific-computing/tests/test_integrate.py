"""Tests for scicomp.integrate — numerical integration methods."""

from __future__ import annotations

import numpy as np
import pytest
from numpy.testing import assert_allclose

from scicomp.integrate.core import (
    IntegrateResult,
    integrate,
    monte_carlo_integrate,
    sparse_grid_integrate,
)


# =============================================================================
# IntegrateResult
# =============================================================================


class TestIntegrateResult:
    """Tests for IntegrateResult dataclass."""

    def test_fields(self) -> None:
        """All fields are set correctly."""
        result = IntegrateResult(
            value=3.14,
            error_estimate=0.01,
            n_evaluations=1000,
            success=True,
            message="Done",
        )
        assert_allclose(result.value, 3.14)
        assert_allclose(result.error_estimate, 0.01)
        assert result.n_evaluations == 1000
        assert result.success is True
        assert result.message == "Done"

    def test_failure_result(self) -> None:
        """A result with success=False has the expected fields."""
        result = IntegrateResult(
            value=0.0,
            error_estimate=0.0,
            n_evaluations=0,
            success=False,
            message="Integration failed",
        )
        assert result.success is False
        assert result.message == "Integration failed"
        assert result.n_evaluations == 0

    def test_zero_error_estimate(self) -> None:
        """Default error_estimate of 0.0 is tolerated."""
        result = IntegrateResult(
            value=0.0, error_estimate=0.0, n_evaluations=0,
            success=True, message="",
        )
        assert_allclose(result.error_estimate, 0.0)


# =============================================================================
# monte_carlo_integrate
# =============================================================================


class TestMonteCarloIntegrate:
    """Tests for monte_carlo_integrate."""

    def test_constant_function_1d(self) -> None:
        """Integral of f(x)=1 on [0, 1] should be 1.0."""
        result = monte_carlo_integrate(
            lambda x: 1.0, [[0.0, 1.0]], n_samples=50000, seed=42,
        )
        assert result.success
        assert_allclose(result.value, 1.0, atol=0.05)
        assert result.n_evaluations == 50000

    def test_constant_function_2d(self) -> None:
        """Integral of f(x)=1 on unit square [0,1]^2 should be 1.0."""
        result = monte_carlo_integrate(
            lambda x: 1.0, [[0.0, 1.0], [0.0, 1.0]], n_samples=50000, seed=42,
        )
        assert result.success
        assert_allclose(result.value, 1.0, atol=0.05)
        assert result.n_evaluations == 50000

    def test_linear_function_1d(self) -> None:
        """Integral of f(x)=x on [0, 1] should be 0.5."""
        result = monte_carlo_integrate(
            lambda x: float(x[0]), [[0.0, 1.0]], n_samples=50000, seed=123,
        )
        assert result.success
        assert_allclose(result.value, 0.5, atol=0.05)

    def test_deterministic_with_seed(self) -> None:
        """Same seed produces same result."""
        r1 = monte_carlo_integrate(
            lambda x: float(x[0] ** 2), [[0.0, 1.0]], n_samples=10000, seed=42,
        )
        r2 = monte_carlo_integrate(
            lambda x: float(x[0] ** 2), [[0.0, 1.0]], n_samples=10000, seed=42,
        )
        assert_allclose(r1.value, r2.value)
        assert_allclose(r1.error_estimate, r2.error_estimate)

    def test_error_estimate_nonzero(self) -> None:
        """Error estimate is positive for non-constant functions."""
        result = monte_carlo_integrate(
            lambda x: float(x[0] ** 2), [[0.0, 1.0]], n_samples=10000, seed=42,
        )
        assert result.error_estimate > 0.0

    def test_invalid_bounds_shape(self) -> None:
        """Bounds with invalid shape raise ValueError."""
        with pytest.raises(ValueError, match="bounds must have shape"):
            monte_carlo_integrate(lambda x: 1.0, [0.0, 1.0])

    def test_invalid_n_samples(self) -> None:
        """n_samples < 1 raises ValueError."""
        with pytest.raises(ValueError, match="n_samples must be >= 1"):
            monte_carlo_integrate(
                lambda x: 1.0, [[0.0, 1.0]], n_samples=0,
            )

    def test_single_sample(self) -> None:
        """n_samples=1 produces zero error estimate."""
        result = monte_carlo_integrate(
            lambda x: 1.0, [[0.0, 1.0]], n_samples=1, seed=42,
        )
        assert result.n_evaluations == 1
        assert_allclose(result.error_estimate, 0.0)
        assert_allclose(result.value, 1.0)

    def test_high_dimensional(self) -> None:
        """Integration in 5D with constant function equals volume."""
        bounds = [[0.0, 1.0]] * 5
        result = monte_carlo_integrate(
            lambda x: 1.0, bounds, n_samples=20000, seed=42,
        )
        assert result.success
        assert_allclose(result.value, 1.0, atol=1.0)


# =============================================================================
# sparse_grid_integrate
# =============================================================================


class TestSparseGridIntegrate:
    """Tests for sparse_grid_integrate."""

    def test_constant_function_1d(self) -> None:
        """Integral of f(x)=1 on [0, 1] is exactly 1.0."""
        result = sparse_grid_integrate(
            lambda x: 1.0, [[0.0, 1.0]], level=2,
        )
        assert result.success
        assert_allclose(result.value, 1.0, atol=1e-12)

    def test_constant_function_2d(self) -> None:
        """Integral of f(x)=1 on [0,1]^2 is exactly 1.0."""
        result = sparse_grid_integrate(
            lambda x: 1.0, [[0.0, 1.0], [0.0, 1.0]], level=2,
        )
        assert result.success
        assert_allclose(result.value, 1.0, atol=1e-12)

    def test_quadratic_1d(self) -> None:
        """Integral of f(x)=x^2 on [0, 1] should be 1/3."""
        result = sparse_grid_integrate(
            lambda x: float(x[0] ** 2), [[0.0, 1.0]], level=3,
        )
        assert result.success
        assert_allclose(result.value, 1.0 / 3.0, atol=1e-12)

    def test_sine_1d(self) -> None:
        """Integral of sin(x) on [0, pi] should be 2.0."""
        result = sparse_grid_integrate(
            lambda x: float(np.sin(x[0])), [[0.0, np.pi]], level=4,
        )
        assert result.success
        assert_allclose(result.value, 2.0, atol=1e-10)

    def test_invalid_bounds_shape(self) -> None:
        """Bounds with invalid shape raise ValueError."""
        with pytest.raises(ValueError, match="bounds must have shape"):
            sparse_grid_integrate(lambda x: 1.0, [0.0, 1.0])

    def test_invalid_level(self) -> None:
        """level < 1 raises ValueError."""
        with pytest.raises(ValueError, match="Level must be >= 1"):
            sparse_grid_integrate(
                lambda x: 1.0, [[0.0, 1.0]], level=0,
            )

    def test_small_level_empty_grid(self) -> None:
        """level < d results in an empty index set and raises ValueError."""
        with pytest.raises(ValueError, match="No valid multi-indices"):
            sparse_grid_integrate(
                lambda x: 1.0, [[0.0, 1.0], [0.0, 1.0], [0.0, 1.0]], level=2,
            )

    def test_n_evaluations_reported(self) -> None:
        """n_evaluations is reported (positive integer)."""
        result = sparse_grid_integrate(
            lambda x: 1.0, [[0.0, 1.0], [0.0, 1.0]], level=2,
        )
        assert result.n_evaluations > 0
        assert isinstance(result.n_evaluations, int)


# =============================================================================
# integrate — dispatch
# =============================================================================


class TestIntegrateDispatch:
    """Tests for the integrate() dispatch function."""

    def test_method_sparse_grid_low_dim(self) -> None:
        """'auto' with d <= 4 dispatches to sparse_grid."""
        result = integrate(
            lambda x: 1.0, [[0.0, 1.0], [0.0, 1.0]], method="auto", level=2,
        )
        assert result.success
        assert_allclose(result.value, 1.0, atol=1e-12)
        assert "Smolyak" in result.message

    def test_method_monte_carlo_high_dim(self) -> None:
        """'auto' with d >= 5 dispatches to monte_carlo."""
        bounds = [[0.0, 1.0]] * 5
        result = integrate(
            lambda x: 1.0, bounds, method="auto", n_samples=10000, seed=42,
        )
        assert result.success
        assert_allclose(result.value, 1.0, atol=0.1)
        assert "Monte Carlo" in result.message

    def test_explicit_sparse_grid(self) -> None:
        """Explicit method='sparse_grid' works for any dimension."""
        result = integrate(
            lambda x: 1.0, [[0.0, 1.0]], method="sparse_grid", level=2,
        )
        assert result.success
        assert_allclose(result.value, 1.0, atol=1e-12)
        assert "Smolyak" in result.message

    def test_explicit_monte_carlo(self) -> None:
        """Explicit method='monte_carlo' works for any dimension."""
        result = integrate(
            lambda x: 1.0, [[0.0, 1.0]], method="monte_carlo",
            n_samples=10000, seed=42,
        )
        assert result.success
        assert_allclose(result.value, 1.0, atol=0.05)
        assert "Monte Carlo" in result.message

    def test_invalid_method(self) -> None:
        """Unknown method raises ValueError."""
        with pytest.raises(ValueError, match="Unknown method"):
            integrate(
                lambda x: 1.0, [[0.0, 1.0]], method="unknown",
            )

    def test_invalid_bounds(self) -> None:
        """Invalid bounds propagate through integrate."""
        with pytest.raises(ValueError, match="bounds must have shape"):
            integrate(lambda x: 1.0, [0.0, 1.0])


# =============================================================================
# Validation helpers (boundary cases)
# =============================================================================


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_zero_volume_domain(self) -> None:
        """Integration over a zero-width interval returns 0."""
        result = monte_carlo_integrate(
            lambda x: 1.0, [[1.0, 1.0]], n_samples=1000, seed=42,
        )
        assert result.success
        assert_allclose(result.value, 0.0, atol=1e-12)

    def test_scipy_style_bounds_list(self) -> None:
        """Bounds as a list of pairs (scipy-style) is accepted."""
        result = monte_carlo_integrate(
            lambda x: float(x[0]), [[0.0, 2.0]], n_samples=50000, seed=42,
        )
        assert result.success
        assert_allclose(result.value, 2.0, atol=0.1)

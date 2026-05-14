"""Tests for scicomp.optimize — gradient descent and Newton's method."""

from __future__ import annotations

import numpy as np
import pytest
from numpy.testing import assert_allclose

from scicomp.optimize.core import (
    GradientDescent,
    Minimizer,
    NewtonMethod,
    OptimizeResult,
)


# =============================================================================
# OptimizeResult
# =============================================================================


class TestOptimizeResult:
    """Tests for OptimizeResult dataclass."""

    def test_fields(self) -> None:
        """All fields are set correctly."""
        x = np.array([1.0, 2.0])
        result = OptimizeResult(
            x=x, fun=3.0, nit=10, success=True, message="Done",
        )
        assert_allclose(result.x, x)
        assert result.fun == 3.0
        assert result.nit == 10
        assert result.success is True
        assert result.message == "Done"


# =============================================================================
# Minimizer ABC
# =============================================================================


class TestMinimizerABC:
    """Tests for Minimizer ABC."""

    def test_cannot_instantiate(self) -> None:
        """Minimizer ABC raises TypeError."""
        with pytest.raises(TypeError):
            Minimizer()  # type: ignore[abstract]


# =============================================================================
# GradientDescent — fixed step size
# =============================================================================


class TestGradientDescentFixedStep:
    """Tests for GradientDescent with fixed step size."""

    def test_quadratic_convergence(self) -> None:
        """Fixed-step GD converges for a simple quadratic."""
        minimizer = GradientDescent(
            max_iter=200, step_size=0.1, use_armijo=False, tol=1e-6,
        )
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([3.0, 4.0]),
        )
        assert result.success
        assert result.nit < 200
        assert_allclose(result.fun, 0.0, atol=1e-5)

    def test_step_size_not_provided(self) -> None:
        """Raises ValueError when use_armijo=False and step_size is None."""
        minimizer = GradientDescent(use_armijo=False, step_size=None)
        with pytest.raises(ValueError, match="step_size must be provided"):
            minimizer.minimize(
                lambda x: float(np.sum(x**2)), np.array([1.0, 1.0]),
            )

    def test_list_input(self) -> None:
        """Accepts a plain list as x0."""
        minimizer = GradientDescent(
            max_iter=200, step_size=0.1, use_armijo=False, tol=1e-6,
        )
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), [3.0, 4.0],
        )
        assert result.success
        assert_allclose(result.fun, 0.0, atol=1e-5)

    def test_zero_step_size(self) -> None:
        """Zero step size makes no progress and hits max_iter."""
        minimizer = GradientDescent(
            max_iter=5, step_size=0.0, use_armijo=False, tol=1e-12,
        )
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([10.0, 10.0]),
        )
        assert not result.success
        assert result.nit == 5
        assert "Max iterations" in result.message

    def test_neg_step_size_diverges(self) -> None:
        """Negative step size causes divergence; max_iter is reached."""
        minimizer = GradientDescent(
            max_iter=5, step_size=-0.1, use_armijo=False, tol=1e-12,
        )
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([10.0, 10.0]),
        )
        # Should not converge — gradient norm will grow
        assert not result.success
        assert result.nit == 5


# =============================================================================
# GradientDescent — Armijo line search
# =============================================================================


class TestGradientDescentArmijo:
    """Tests for GradientDescent with Armijo line search."""

    def test_quadratic_convergence(self) -> None:
        """Armijo GD converges for a simple quadratic."""
        minimizer = GradientDescent(max_iter=200, tol=1e-6)
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([3.0, 4.0]),
        )
        assert result.success
        assert result.nit < 200
        assert_allclose(result.fun, 0.0, atol=1e-5)

    def test_custom_armijo_parameters(self) -> None:
        """Armijo with non-default c, rho, alpha_0 still converges."""
        minimizer = GradientDescent(
            max_iter=500, tol=1e-6,
            use_armijo=True, c=0.2, rho=0.8, alpha_0=0.5,
        )
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([5.0, -3.0]),
        )
        assert result.success
        assert_allclose(result.fun, 0.0, atol=1e-5)


# =============================================================================
# NewtonMethod
# =============================================================================


class TestNewtonMethod:
    """Tests for NewtonMethod."""

    def test_quadratic_convergence_one_step(self) -> None:
        """Newton converges in one step for a pure quadratic."""
        def hess(x: np.ndarray) -> np.ndarray:
            return 2.0 * np.eye(x.size)
        minimizer = NewtonMethod(hess=hess, tol=1e-12)
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([3.0, 4.0]),
        )
        assert result.success
        assert result.nit <= 2  # Numerical precision may require 2 iters
        assert_allclose(result.fun, 0.0, atol=1e-24)

    def test_singular_hessian(self) -> None:
        """Singular Hessian returns success=False."""
        def hess(x: np.ndarray) -> np.ndarray:
            return np.array([[2.0, 0.0], [0.0, 0.0]])

        def fun(x: np.ndarray) -> float:
            return float(x[0] ** 2)

        minimizer = NewtonMethod(hess=hess, max_iter=10)
        result = minimizer.minimize(fun, np.array([1.0, 1.0]))
        assert not result.success
        assert "Singular Hessian" in result.message

    def test_already_converged(self) -> None:
        """Starting near the minimum converges at iteration 0."""
        def hess(x: np.ndarray) -> np.ndarray:
            return 2.0 * np.eye(x.size)

        minimizer = NewtonMethod(hess=hess, tol=1.0)
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([0.1, 0.2]),
        )
        assert result.success
        assert result.nit == 0

    def test_max_iter_reached(self) -> None:
        """Max iterations exhausted returns success=False."""
        def hess(x: np.ndarray) -> np.ndarray:
            return 2.0 * np.eye(x.size)

        minimizer = NewtonMethod(hess=hess, max_iter=1, tol=1e-12)
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([1e6, 1e6]),
        )
        assert not result.success
        assert result.nit == 1
        assert "Max iterations" in result.message

    def test_list_input(self) -> None:
        """Accepts a plain list as x0."""
        def hess(x: np.ndarray) -> np.ndarray:
            return 2.0 * np.eye(len(x))

        minimizer = NewtonMethod(hess=hess, tol=1e-12)
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), [3.0, 4.0],
        )
        assert result.success
        assert result.nit <= 2
        assert_allclose(result.fun, 0.0, atol=1e-24)


# =============================================================================
# Gradient norm convergence criterion
# =============================================================================


class TestGradientNormConvergence:
    """Tests for gradient norm convergence criterion."""

    def test_already_converged(self) -> None:
        """Starting point near minimum triggers immediate convergence."""
        minimizer = GradientDescent(
            step_size=0.1, use_armijo=False, tol=1.0,
        )
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([0.1, 0.2]),
        )
        assert result.success
        assert result.nit == 0


# =============================================================================
# Max iter exhaustion
# =============================================================================


class TestMaxIterExhaustion:
    """Tests for max_iter termination."""

    def test_max_iter_reached(self) -> None:
        """When max iterations are exhausted, success is False."""
        minimizer = GradientDescent(
            max_iter=5, step_size=0.01, use_armijo=False, tol=1e-12,
        )
        result = minimizer.minimize(
            lambda x: float(np.sum(x**2)), np.array([10.0, 10.0]),
        )
        assert not result.success
        assert result.nit == 5
        assert "Max iterations" in result.message


# =============================================================================
# Armijo line search failure
# =============================================================================


class TestArmijoMaxInnerFail:
    """Tests for Armijo line search failure."""

    def test_armijo_fails_for_ill_conditioned_problem(self) -> None:
        """Armijo fails to find a step within 50 inner iterations."""
        def fun(x: np.ndarray) -> float:
            return float(x[0] ** 2 + 1e16 * x[1] ** 2)

        minimizer = GradientDescent(max_iter=10, tol=1e-12)
        result = minimizer.minimize(fun, np.array([1.0, 1.0]))
        assert not result.success
        assert "Armijo" in result.message


# =============================================================================
# Default parameters
# =============================================================================


class TestDefaultParams:
    """Tests for default constructor parameters."""

    def test_gradient_descent_defaults(self) -> None:
        """GradientDescent constructed with defaults runs without error."""
        minimizer = GradientDescent()
        assert minimizer.use_armijo is True
        assert minimizer.step_size is None

    def test_newton_method_defaults(self) -> None:
        """NewtonMethod constructed with hess and defaults runs."""
        def hess(x: np.ndarray) -> np.ndarray:
            return 2.0 * np.eye(x.size)
        minimizer = NewtonMethod(hess=hess)
        assert minimizer.max_iter == 1000
        assert minimizer.tol == 1e-6

"""Tests for scicomp.interp — cubic spline interpolation."""

from __future__ import annotations

import numpy as np
import pytest
from numpy.testing import assert_allclose

from scicomp.interp.core import CubicSpline, spline_interpolate


# =============================================================================
# CubicSpline — construction
# =============================================================================


class TestCubicSplineConstruction:
    """Tests for CubicSpline construction and validation."""

    def test_linear_data(self) -> None:
        """Cubic spline through collinear points recovers the line exactly."""
        x = np.array([0.0, 1.0, 2.0, 3.0, 4.0])
        y = 2.0 * x + 1.0  # line: 2x + 1
        spline = CubicSpline(x, y)
        x_test = np.array([0.0, 0.5, 1.0, 2.5, 4.0])
        expected = 2.0 * x_test + 1.0
        assert_allclose(spline.evaluate(x_test), expected, atol=1e-12)

    def test_stores_x_and_coefficients(self) -> None:
        """CubicSpline stores x and coefficient arrays."""
        x = np.array([0.0, 1.0, 3.0])
        y = np.array([0.0, 2.0, 6.0])
        spline = CubicSpline(x, y)
        assert_allclose(spline.x, x)
        assert spline.a.shape == (2,)
        assert spline.b.shape == (2,)
        assert spline.c.shape == (3,)
        assert spline.d.shape == (2,)

    def test_natural_boundary(self) -> None:
        """Natural boundary: second derivative is zero at endpoints."""
        x = np.array([0.0, 1.0, 2.0, 3.0])
        y = np.array([0.0, 1.0, 0.0, 1.0])
        spline = CubicSpline(x, y)
        # At x[0], c[0] should be 0 (a "proxy" for S''(x[0])/2 = 0)
        assert_allclose(spline.c[0], 0.0, atol=1e-12)
        # At x[-1], c[-1] should be 0
        assert_allclose(spline.c[-1], 0.0, atol=1e-12)

    def test_fewer_than_3_points(self) -> None:
        """Fewer than 3 points raises ValueError."""
        x = np.array([0.0, 1.0])
        y = np.array([0.0, 1.0])
        with pytest.raises(ValueError, match="At least 3 points"):
            CubicSpline(x, y)

    def test_non_monotonic_x(self) -> None:
        """Non-monotonic x raises ValueError."""
        x = np.array([0.0, 2.0, 1.0, 3.0])
        y = np.array([0.0, 1.0, 2.0, 3.0])
        with pytest.raises(ValueError, match="strictly increasing"):
            CubicSpline(x, y)

    def test_duplicate_x(self) -> None:
        """Duplicate x values raise ValueError."""
        x = np.array([0.0, 1.0, 1.0, 2.0])
        y = np.array([0.0, 1.0, 2.0, 3.0])
        with pytest.raises(ValueError, match="strictly increasing"):
            CubicSpline(x, y)

    def test_mismatched_lengths(self) -> None:
        """Mismatched x and y lengths raise ValueError."""
        x = np.array([0.0, 1.0, 2.0])
        y = np.array([0.0, 1.0])
        with pytest.raises(ValueError, match="same length"):
            CubicSpline(x, y)


# =============================================================================
# CubicSpline — evaluate vs scipy
# =============================================================================


def _exact_quadratic(x: np.ndarray) -> np.ndarray:
    """Exact quadratic: f(x) = 3x^2 - 2x + 1."""
    return 3.0 * x ** 2 - 2.0 * x + 1.0


def _exact_cubic(x: np.ndarray) -> np.ndarray:
    """Exact cubic: f(x) = x^3 - 2x^2 + x + 1."""
    return x ** 3 - 2.0 * x ** 2 + x + 1.0  # type: ignore[no-any-return]


def _exact_sine(x: np.ndarray) -> np.ndarray:
    """Smooth oscillatory function: f(x) = sin(2*pi*x)."""
    return np.sin(2.0 * np.pi * x)


class TestCubicSplineAccuracy:
    """Tests for CubicSpline accuracy vs scipy reference."""

    def test_quadratic_vs_scipy(self) -> None:
        """Cubic spline through quadratic data agrees with scipy natural spline."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline  # type: ignore[import-untyped]

        x = np.array([0.0, 0.5, 1.0, 2.0, 3.0, 4.0])
        y = _exact_quadratic(x)
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(0.0, 4.0, 21)
        assert_allclose(spline.evaluate(x_test), scipy_spline(x_test), atol=1e-12)

    def test_cubic_vs_scipy(self) -> None:
        """Cubic spline through cubic data agrees with scipy natural spline."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline

        x = np.array([0.0, 0.5, 1.5, 2.0, 3.0, 5.0])
        y = _exact_cubic(x)
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(0.0, 5.0, 31)
        assert_allclose(spline.evaluate(x_test), scipy_spline(x_test), atol=1e-12)

    def test_smooth_function_vs_scipy(self) -> None:
        """Cubic spline agrees with scipy for smooth non-polynomial data."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline

        x = np.array([0.0, 0.3, 0.7, 1.0, 1.5, 2.0])
        y = _exact_sine(x)
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(0.0, 2.0, 51)
        actual = spline.evaluate(x_test)
        expected = scipy_spline(x_test)
        assert_allclose(actual, expected, atol=1e-12)

    def test_uniform_grid_vs_scipy(self) -> None:
        """Agrees with scipy on uniform grid."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline

        x = np.linspace(0.0, 5.0, 11)
        y = np.exp(-x)
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(0.0, 5.0, 101)
        assert_allclose(
            spline.evaluate(x_test),
            scipy_spline(x_test),
            atol=1e-12,
        )

    def test_random_grid_vs_scipy(self) -> None:
        """Agrees with scipy on non-uniform grid."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline

        rng = np.random.default_rng(42)
        x = np.sort(rng.uniform(0.0, 10.0, size=15))
        y = np.sin(x)
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(x[0], x[-1], 101)
        assert_allclose(
            spline.evaluate(x_test),
            scipy_spline(x_test),
            atol=1e-12,
        )

    def test_five_points_quadratic_vs_scipy(self) -> None:
        """Quadratic data with 5 points agrees with scipy natural spline."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline

        x = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])
        y = x ** 2
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(-2.0, 2.0, 21)
        assert_allclose(spline.evaluate(x_test), scipy_spline(x_test), atol=1e-12)


# =============================================================================
# CubicSpline — derivative
# =============================================================================


class TestCubicSplineDerivative:
    """Tests for CubicSpline.derivative."""

    def test_linear_derivative(self) -> None:
        """Derivative of line is constant slope."""
        x = np.array([0.0, 1.0, 2.0, 3.0, 4.0])
        y = 2.0 * x + 1.0  # line with slope 2
        spline = CubicSpline(x, y)
        x_test = np.array([0.0, 0.5, 2.0, 3.5, 4.0])
        expected = np.full_like(x_test, 2.0)
        assert_allclose(spline.derivative(x_test), expected, atol=1e-10)

    def test_derivative_quadratic_vs_scipy(self) -> None:
        """Derivative of spline through quadratic agrees with scipy."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline

        x = np.array([0.0, 0.5, 1.0, 2.0, 3.0, 4.0])
        y = _exact_quadratic(x)
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(0.0, 4.0, 21)
        assert_allclose(
            spline.derivative(x_test),
            scipy_spline(x_test, nu=1),
            atol=1e-12,
        )

    def test_cubic_derivative_vs_scipy(self) -> None:
        """Derivative of spline through cubic agrees with scipy."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline

        x = np.array([0.0, 0.5, 1.5, 2.0, 3.0])
        y = _exact_cubic(x)
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(0.0, 3.0, 31)
        expected = scipy_spline(x_test, nu=1)
        assert_allclose(spline.derivative(x_test), expected, atol=1e-10)

    def test_derivative_vs_scipy(self) -> None:
        """Derivative agrees with scipy for smooth function."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline

        x = np.array([0.0, 0.3, 1.0, 1.7, 2.5, 3.0])
        y = _exact_sine(x)
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(0.0, 3.0, 51)
        actual = spline.derivative(x_test)
        expected = scipy_spline(x_test, nu=1)
        assert_allclose(actual, expected, atol=1e-12)


# =============================================================================
# spline_interpolate — convenience function
# =============================================================================


class TestSplineInterpolate:
    """Tests for spline_interpolate convenience function."""

    def test_equivalent_to_class(self) -> None:
        """spline_interpolate(x, y, x_eval) == CubicSpline(x, y).evaluate(x_eval)."""
        x = np.array([0.0, 1.0, 2.0, 3.0])
        y = np.array([0.0, 1.0, 0.0, 1.0])
        x_eval = np.linspace(0.0, 3.0, 11)
        direct = CubicSpline(x, y).evaluate(x_eval)
        via_func = spline_interpolate(x, y, x_eval)
        assert_allclose(direct, via_func)

    def test_linear_data(self) -> None:
        """spline_interpolate recovers a line."""
        x = np.array([0.0, 1.0, 2.0, 3.0])
        y = 3.0 * x + 2.0
        x_eval = np.array([0.0, 1.5, 3.0])
        expected = 3.0 * x_eval + 2.0
        assert_allclose(spline_interpolate(x, y, x_eval), expected, atol=1e-12)


# =============================================================================
# Error cases
# =============================================================================


class TestErrorCases:
    """Tests for error handling."""

    def test_extrapolation_left(self) -> None:
        """Evaluation left of x[0] raises ValueError."""
        x = np.array([0.0, 1.0, 2.0, 3.0])
        y = np.array([0.0, 1.0, 0.0, 1.0])
        spline = CubicSpline(x, y)
        with pytest.raises(ValueError, match="outside the interpolation range"):
            spline.evaluate(np.array([-1.0]))

    def test_extrapolation_right(self) -> None:
        """Evaluation right of x[-1] raises ValueError."""
        x = np.array([0.0, 1.0, 2.0, 3.0])
        y = np.array([0.0, 1.0, 0.0, 1.0])
        spline = CubicSpline(x, y)
        with pytest.raises(ValueError, match="outside the interpolation range"):
            spline.evaluate(np.array([5.0]))

    def test_extrapolation_mixed(self) -> None:
        """Mixed valid/invalid points raise ValueError."""
        x = np.array([0.0, 1.0, 2.0, 3.0])
        y = np.array([0.0, 1.0, 0.0, 1.0])
        spline = CubicSpline(x, y)
        with pytest.raises(ValueError, match="outside the interpolation range"):
            spline.evaluate(np.array([0.5, 3.5]))

    def test_derivative_extrapolation(self) -> None:
        """Derivative evaluation outside range raises ValueError."""
        x = np.array([0.0, 1.0, 2.0])
        y = np.array([0.0, 1.0, 0.0])
        spline = CubicSpline(x, y)
        with pytest.raises(ValueError, match="outside the interpolation range"):
            spline.derivative(np.array([-0.1]))

    def test_non_monotonic_x(self) -> None:
        """Non-monotonic x in CubicSpline raises ValueError."""
        x = np.array([0.0, 2.0, 1.0, 3.0])
        y = np.array([0.0, 1.0, 2.0, 3.0])
        with pytest.raises(ValueError, match="strictly increasing"):
            CubicSpline(x, y)

    def test_fewer_than_3_points(self) -> None:
        """2 points in CubicSpline raises ValueError."""
        x = np.array([0.0, 1.0])
        y = np.array([0.0, 1.0])
        with pytest.raises(ValueError, match="At least 3 points"):
            CubicSpline(x, y)

    def test_duplicate_x(self) -> None:
        """Duplicate x raises ValueError."""
        x = np.array([0.0, 1.0, 1.0, 2.0])
        y = np.array([0.0, 1.0, 2.0, 3.0])
        with pytest.raises(ValueError, match="strictly increasing"):
            CubicSpline(x, y)

    def test_scalar_evaluation(self) -> None:
        """Evaluation at a scalar returns a 1D array."""
        x = np.array([0.0, 1.0, 2.0])
        y = np.array([0.0, 1.0, 2.0])
        spline = CubicSpline(x, y)
        result = spline.evaluate(1.5)
        assert isinstance(result, np.ndarray)
        assert result.ndim == 1
        assert_allclose(result, np.array([1.5]))

    def test_tolerance_at_boundaries(self) -> None:
        """Evaluation within 1e-12 tolerance at boundaries is allowed."""
        x = np.array([0.0, 1.0, 2.0, 3.0])
        y = np.array([0.0, 1.0, 0.0, 1.0])
        spline = CubicSpline(x, y)
        # Just inside the left boundary (x[0] - 1e-12)
        result = spline.evaluate(np.array([0.0]))
        assert_allclose(result, np.array([0.0]), atol=1e-12)
        # Just inside the right boundary
        result = spline.evaluate(np.array([3.0]))
        assert_allclose(result, np.array([1.0]), atol=1e-12)

    def test_2d_input_arrays(self) -> None:
        """2D input arrays for x or y raise ValueError."""
        x_2d = np.array([[0.0, 1.0, 2.0], [3.0, 4.0, 5.0]])
        y_2d = np.array([[0.0, 1.0, 2.0], [3.0, 4.0, 5.0]])
        with pytest.raises(ValueError, match="1D arrays"):
            CubicSpline(x_2d, np.array([0.0, 1.0, 2.0]))
        with pytest.raises(ValueError, match="1D arrays"):
            CubicSpline(np.array([0.0, 1.0, 2.0]), y_2d)


# =============================================================================
# Boundary / fundamental-property tests
# =============================================================================


class TestCubicSplineFundamentalProperties:
    """Tests for fundamental mathematical properties of cubic splines."""

    def test_exact_interpolation_at_knots(self) -> None:
        """Spline evaluates exactly to y values at knot locations."""
        rng = np.random.default_rng(99)
        for _ in range(5):
            n = rng.integers(3, 12)
            x = np.sort(rng.uniform(-5.0, 5.0, size=n))
            y = rng.uniform(-10.0, 10.0, size=n)
            spline = CubicSpline(x, y)
            assert_allclose(spline.evaluate(x), y, atol=1e-12)

    def test_interpolation_at_knots_various_functions(self) -> None:
        """Spline recovers exact function values at knots for known functions."""
        # Linear
        x = np.array([0.0, 2.0, 5.0, 7.0, 10.0])
        y = 3.0 * x + 1.0
        spline = CubicSpline(x, y)
        assert_allclose(spline.evaluate(x), y, atol=1e-12)

        # Quadratic
        x = np.array([-3.0, -1.0, 0.0, 2.0, 4.0])
        y = x ** 2 - 2.0 * x + 1.0
        spline = CubicSpline(x, y)
        assert_allclose(spline.evaluate(x), y, atol=1e-12)

        # Sine
        x = np.linspace(0.0, np.pi, 7)
        y = np.sin(x)
        spline = CubicSpline(x, y)
        assert_allclose(spline.evaluate(x), y, atol=1e-12)

    def test_derivative_continuity_at_interior_knots(self) -> None:
        """First derivative is continuous at interior knots."""
        rng = np.random.default_rng(42)
        for _ in range(5):
            n = rng.integers(4, 10)
            x = np.sort(rng.uniform(-5.0, 5.0, size=n))
            y = np.sin(x)  # smooth function
            spline = CubicSpline(x, y)

            eps = 1e-10
            for i in range(1, n - 1):
                left = spline.derivative(np.array([x[i] - eps]))
                right = spline.derivative(np.array([x[i] + eps]))
                assert_allclose(left, right, atol=1e-8,
                                err_msg=f"Derivative discontinuity at knot x[{i}]={x[i]}")

    def test_scalar_input_for_derivative(self) -> None:
        """Derivative with scalar returns a 1D array."""
        x = np.array([0.0, 1.0, 2.0])
        y = np.array([0.0, 1.0, 2.0])
        spline = CubicSpline(x, y)
        result = spline.derivative(1.5)
        assert isinstance(result, np.ndarray)
        assert result.ndim == 1
        assert_allclose(result, np.array([1.0]), atol=1e-12)


class TestSplineInterpolateErrorForwarding:
    """Tests that spline_interpolate forwards construction errors."""

    def test_fewer_than_3_points(self) -> None:
        """spline_interpolate forwards <3 points error."""
        with pytest.raises(ValueError, match="At least 3 points"):
            spline_interpolate(
                np.array([0.0, 1.0]),
                np.array([0.0, 1.0]),
                np.array([0.5]),
            )

    def test_non_monotonic_x(self) -> None:
        """spline_interpolate forwards non-monotonic error."""
        with pytest.raises(ValueError, match="strictly increasing"):
            spline_interpolate(
                np.array([0.0, 2.0, 1.0]),
                np.array([0.0, 1.0, 2.0]),
                np.array([0.5]),
            )

    def test_mismatched_lengths(self) -> None:
        """spline_interpolate forwards mismatched lengths error."""
        with pytest.raises(ValueError, match="same length"):
            spline_interpolate(
                np.array([0.0, 1.0, 2.0]),
                np.array([0.0, 1.0]),
                np.array([0.5]),
            )

    def test_extrapolation_error(self) -> None:
        """spline_interpolate forwards extrapolation error."""
        with pytest.raises(ValueError, match="outside the interpolation range"):
            spline_interpolate(
                np.array([0.0, 1.0, 2.0]),
                np.array([0.0, 1.0, 2.0]),
                np.array([-1.0]),
            )


class TestNonUniformGridStability:
    """Tests for numerical stability on extreme non-uniform grids."""

    def test_moderately_non_uniform(self) -> None:
        """Spline handles moderately non-uniform spacing without issues."""
        x = np.array([0.0, 0.01, 0.05, 0.2, 1.0, 5.0, 10.0])
        y = np.exp(-x)
        spline = CubicSpline(x, y)
        x_test = np.linspace(0.0, 10.0, 51)
        result = spline.evaluate(x_test)
        assert result.shape == (51,)
        assert np.all(np.isfinite(result))

    def test_non_uniform_vs_scipy(self) -> None:
        """Non-uniform grid result agrees with scipy."""
        pytest.importorskip("scipy")
        from scipy.interpolate import CubicSpline as ScipyCubicSpline

        x = np.array([0.0, 0.01, 0.1, 0.5, 2.0, 10.0])
        y = np.log(1.0 + x)
        spline = CubicSpline(x, y)
        scipy_spline = ScipyCubicSpline(x, y, bc_type="natural")
        x_test = np.linspace(0.0, 10.0, 51)
        assert_allclose(spline.evaluate(x_test), scipy_spline(x_test), atol=1e-10)

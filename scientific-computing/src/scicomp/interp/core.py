"""Core interpolation operations — natural cubic spline interpolation.

Provides a self-contained implementation of natural cubic spline
interpolation using the Thomas algorithm for tridiagonal systems.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike, NDArray


def _solve_tridiagonal(
    a: np.ndarray,
    b: np.ndarray,
    c: np.ndarray,
    d: np.ndarray,
) -> np.ndarray:
    """Solve a tridiagonal system using the Thomas algorithm.

    Solves the system ``A x = d`` where ``A`` is a tridiagonal matrix
    with sub-diagonal *a*, diagonal *b*, and super-diagonal *c*.
    By convention ``a[0] = 0`` and ``c[-1] = 0`` (both are unused).
    The algorithm runs in O(n) time and modifies no input arrays.

    Args:
        a: Sub-diagonal with shape ``(n,)``.  ``a[0]`` is ignored
            (must be 0 by convention).
        b: Diagonal with shape ``(n,)``.
        c: Super-diagonal with shape ``(n,)``.  ``c[-1]`` is ignored
            (must be 0 by convention).
        d: Right-hand side with shape ``(n,)``.

    Returns:
        Solution vector ``x`` with shape ``(n,)``.

    Raises:
        ValueError: If the system is singular (zero pivot encountered).
    """
    n = len(d)

    c_prime = np.empty(n - 1, dtype=np.float64)
    d_prime = np.empty(n, dtype=np.float64)

    # Forward sweep
    if n == 1:
        if b[0] == 0.0:
            raise ValueError("Tridiagonal system is singular (zero pivot)")
        d_prime[0] = d[0] / b[0]
    else:
        denom = b[0]
        if denom == 0.0:
            raise ValueError("Tridiagonal system is singular (zero pivot)")
        c_prime[0] = c[0] / denom
        d_prime[0] = d[0] / denom

        for i in range(1, n - 1):
            denom = b[i] - a[i] * c_prime[i - 1]
            if denom == 0.0:
                raise ValueError("Tridiagonal system is singular (zero pivot)")
            c_prime[i] = c[i] / denom
            d_prime[i] = (d[i] - a[i] * d_prime[i - 1]) / denom

        # Last row: c[n-1] = 0 by convention
        denom = b[n - 1] - a[n - 1] * c_prime[n - 2]
        if denom == 0.0:
            raise ValueError("Tridiagonal system is singular (zero pivot)")
        d_prime[n - 1] = (d[n - 1] - a[n - 1] * d_prime[n - 2]) / denom

    # Backward substitution
    x = np.empty(n, dtype=np.float64)
    x[n - 1] = d_prime[n - 1]
    for i in range(n - 2, -1, -1):
        x[i] = d_prime[i] - c_prime[i] * x[i + 1]

    return x


class CubicSpline:
    """Natural cubic spline interpolation.

    Constructs a piecewise cubic polynomial interpolant *S(x)* through
    the given data points ``(x_i, y_i)``.  The spline uses natural
    boundary conditions: the second derivative is zero at both
    endpoints, providing a smooth interpolation.

    The construction solves a tridiagonal system of size ``n - 2``
    using the Thomas algorithm (O(n) time).  Evaluation uses
    ``np.searchsorted`` (O(log n)) per point.

    Attributes:
        x: The sorted knot locations, shape ``(n,)``.
        a: Constant coefficients ``a_i = y_i``, shape ``(n - 1,)``.
        b: Linear coefficients, shape ``(n - 1,)``.
        c: Quadratic coefficients (from the tridiagonal solve), shape ``(n,)``.
        d: Cubic coefficients, shape ``(n - 1,)``.
    """

    def __init__(self, x: ArrayLike, y: ArrayLike) -> None:
        """Construct a natural cubic spline through the given points.

        Args:
            x: Knot locations.  Must be strictly increasing (at least
                3 points).
            y: Values at the knots.  Must have the same length as *x*.

        Raises:
            ValueError: If *x* and *y* have different lengths, fewer
                than 3 points are provided, *x* is not strictly
                increasing, or the tridiagonal solve fails.
        """
        x_arr = np.asarray(x, dtype=np.float64)
        y_arr = np.asarray(y, dtype=np.float64)

        if x_arr.ndim != 1 or y_arr.ndim != 1:
            raise ValueError("x and y must be 1D arrays")
        if x_arr.shape[0] != y_arr.shape[0]:
            raise ValueError(
                f"x and y must have the same length, "
                f"got len(x)={x_arr.shape[0]}, len(y)={y_arr.shape[0]}"
            )
        n = x_arr.shape[0]
        if n < 3:
            raise ValueError(
                f"At least 3 points are required for cubic spline, got {n}"
            )

        # Verify strict monotonicity
        h = np.diff(x_arr)
        if np.any(h <= 0.0):
            raise ValueError(
                "x must be strictly increasing (all diff(x) > 0)"
            )

        # Store knots
        self.x: NDArray[np.float64] = x_arr

        # Build and solve the tridiagonal system, compute all coefficients
        self._build_tridiagonal_system(h, y_arr)

    def _build_reduced_system(
        self, h: np.ndarray, y_arr: np.ndarray,
    ) -> tuple[
        np.ndarray, np.ndarray, np.ndarray, np.ndarray, int, int, np.ndarray
    ]:
        """Construct the reduced tridiagonal system for interior c coefficients.

        Builds the sub-diagonal *a_red*, diagonal *b_red*, super-diagonal
        *c_red*, and right-hand side *d_red* for the system of ``n - 2``
        interior c coefficients.

        Args:
            h: Differences between consecutive knot locations,
                shape ``(n - 1,)``.
            y_arr: Values at the knots, shape ``(n,)``.

        Returns:
            A tuple ``(a_red, b_red, c_red, d_red, system_size, m, dy)``.
        """
        n = len(self.x)
        m = n - 1
        system_size = n - 2

        a_red = np.zeros(system_size, dtype=np.float64)
        b_red = np.empty(system_size, dtype=np.float64)
        c_red = np.zeros(system_size, dtype=np.float64)
        d_red = np.empty(system_size, dtype=np.float64)

        # RHS for equation i: 3 * (dy_{i+1}/h_{i+1} - dy_i/h_i)
        dy = np.diff(y_arr)
        for k in range(system_size):
            b_red[k] = 2.0 * (h[k] + h[k + 1])
            d_red[k] = 3.0 * (
                dy[k + 1] / h[k + 1] - dy[k] / h[k]
            )

        # Sub-diagonal (coefficient of c_{k})
        for k in range(1, system_size):
            a_red[k] = h[k]

        # Super-diagonal (coefficient of c_{k+2})
        for k in range(system_size - 1):
            c_red[k] = h[k + 1]

        return a_red, b_red, c_red, d_red, system_size, m, dy

    def _solve_for_c_coefficients(
        self,
        system_size: int,
        a_red: np.ndarray,
        b_red: np.ndarray,
        c_red: np.ndarray,
        d_red: np.ndarray,
    ) -> None:
        """Solve the tridiagonal system and store the c coefficients.

        Solves for ``c_1, ..., c_{n-2}`` using the Thomas algorithm
        and stores ``self.c`` (``c_0 = c_{n-1} = 0`` by natural boundary
        conditions).

        Args:
            system_size: Size of the reduced system (``n - 2``).
            a_red: Sub-diagonal of the reduced system.
            b_red: Diagonal of the reduced system.
            c_red: Super-diagonal of the reduced system.
            d_red: Right-hand side of the reduced system.
        """
        n = len(self.x)
        c_inner = _solve_tridiagonal(a_red, b_red, c_red, d_red)

        self.c = np.zeros(n, dtype=np.float64)
        self.c[1:-1] = c_inner

    def _compute_ab_d_coefficients(
        self, h: np.ndarray, y_arr: np.ndarray, m: int, dy: np.ndarray,
    ) -> None:
        """Compute the a, b, d polynomial coefficients for each segment.

        Args:
            h: Differences between consecutive knot locations,
                shape ``(n - 1,)``.
            y_arr: Values at the knots, shape ``(n,)``.
            m: Number of segments (``n - 1``).
            dy: First differences of *y_arr*, shape ``(n - 1,)``.
        """
        self.a = y_arr[:m]
        self.b = np.empty(m, dtype=np.float64)
        self.d = np.empty(m, dtype=np.float64)

        for i in range(m):
            self.b[i] = (
                dy[i] / h[i]
                - h[i] * (2.0 * self.c[i] + self.c[i + 1]) / 3.0
            )
            self.d[i] = (self.c[i + 1] - self.c[i]) / (3.0 * h[i])

    def _build_tridiagonal_system(
        self, h: np.ndarray, y_arr: np.ndarray,
    ) -> None:
        """Build and solve the tridiagonal system for spline coefficients.

        Convenience method that delegates to the three sub-steps:
        :meth:`_build_reduced_system`, :meth:`_solve_for_c_coefficients`,
        and :meth:`_compute_ab_d_coefficients`.

        Args:
            h: Differences between consecutive knot locations,
                shape ``(n - 1,)``.
            y_arr: Values at the knots, shape ``(n,)``.
        """
        a_red, b_red, c_red, d_red, system_size, m, dy = (
            self._build_reduced_system(h, y_arr)
        )
        self._solve_for_c_coefficients(system_size, a_red, b_red, c_red, d_red)
        self._compute_ab_d_coefficients(h, y_arr, m, dy)

    def _check_eval_bounds(self, x_arr: np.ndarray) -> None:
        """Validate that evaluation points lie within the interpolation range.

        Args:
            x_arr: Evaluation points, shape ``(n,)``.

        Raises:
            ValueError: If any point lies outside ``[x[0], x[-1]]``
                (with a small tolerance of 1e-12).
        """
        x_min = float(self.x[0])
        x_max = float(self.x[-1])

        if np.any(x_arr < x_min - 1e-12) or np.any(x_arr > x_max + 1e-12):
            raise ValueError(
                f"x_eval contains points outside the interpolation range "
                f"[{x_min}, {x_max}]"
            )

    def evaluate(self, x_eval: ArrayLike) -> NDArray[np.float64]:
        """Evaluate the cubic spline at given points.

        Evaluates *S(x)* at each point using the pre-computed
        piecewise coefficients.  Uses ``np.searchsorted`` for interval
        location.

        Args:
            x_eval: Points at which to evaluate the spline.

        Returns:
            Array of interpolated values.

        Raises:
            ValueError: If any evaluation point lies outside the
                interpolation range ``[x[0], x[-1]]`` (with a small
                tolerance of 1e-12).
        """
        x_arr: NDArray[np.float64] = np.atleast_1d(
            np.asarray(x_eval, dtype=np.float64)
        )
        self._check_eval_bounds(x_arr)

        n = len(self.x)
        indices = np.searchsorted(self.x, x_arr, side="right") - 1
        # Clip to valid segment range
        indices = np.clip(indices, 0, n - 2)

        h_eval = x_arr - self.x[indices]
        # S_i(x) = a_i + b_i*h + c_i*h^2 + d_i*h^3
        result = (
            self.a[indices]
            + self.b[indices] * h_eval
            + self.c[indices] * h_eval ** 2
            + self.d[indices] * h_eval ** 3
        )
        return result

    def derivative(self, x_eval: ArrayLike) -> NDArray[np.float64]:
        """Evaluate the first derivative of the cubic spline.

        Evaluates *S'(x)* at each point using the derivative of the
        piecewise cubic polynomial:

            ``S'_i(x) = b_i + 2*c_i*h + 3*d_i*h^2``

        Args:
            x_eval: Points at which to evaluate the derivative.

        Returns:
            Array of first derivative values.

        Raises:
            ValueError: If any evaluation point lies outside the
                interpolation range ``[x[0], x[-1]]`` (with a small
                tolerance of 1e-12).
        """
        x_arr: NDArray[np.float64] = np.atleast_1d(
            np.asarray(x_eval, dtype=np.float64)
        )
        self._check_eval_bounds(x_arr)

        n = len(self.x)
        indices = np.searchsorted(self.x, x_arr, side="right") - 1
        indices = np.clip(indices, 0, n - 2)

        h_eval = x_arr - self.x[indices]
        # S'_i(x) = b_i + 2*c_i*h + 3*d_i*h^2
        result = (
            self.b[indices]
            + 2.0 * self.c[indices] * h_eval
            + 3.0 * self.d[indices] * h_eval ** 2
        )
        return result


def spline_interpolate(
    x: ArrayLike,
    y: ArrayLike,
    x_eval: ArrayLike,
) -> NDArray[np.float64]:
    """Natural cubic spline interpolation — convenience function.

    Constructs a :class:`CubicSpline` through ``(x, y)`` and evaluates
    it at ``x_eval``.  Equivalent to
    ``CubicSpline(x, y).evaluate(x_eval)``.

    Args:
        x: Knot locations (strictly increasing, at least 3 points).
        y: Values at the knots.
        x_eval: Points at which to evaluate the spline.

    Returns:
        Array of interpolated values.

    Raises:
        ValueError: If the input data is invalid or an evaluation point
            lies outside the interpolation range.
    """
    return CubicSpline(x, y).evaluate(x_eval)

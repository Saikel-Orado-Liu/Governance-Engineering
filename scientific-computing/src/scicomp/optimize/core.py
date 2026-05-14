"""Core optimization algorithms — gradient descent and Newton's method."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from typing import Optional

import numpy as np
from numpy.typing import ArrayLike


@dataclass
class OptimizeResult:
    """Result of an optimization run.

    Attributes:
        x: Final point.
        fun: Function value at the final point.
        nit: Number of iterations performed.
        success: Whether the algorithm converged.
        message: Description of the termination reason.
    """

    x: np.ndarray
    fun: float
    nit: int
    success: bool
    message: str


class Minimizer(ABC):
    """Abstract base class for unconstrained optimization algorithms.

    Args:
        max_iter: Maximum number of iterations. Defaults to 1000.
        tol: Gradient norm tolerance for convergence. Defaults to 1e-6.
    """

    def __init__(self, max_iter: int = 1000, tol: float = 1e-6) -> None:
        self.max_iter = max_iter
        self.tol = tol

    def _check_convergence(
        self,
        x: np.ndarray,
        f_x: float,
        grad: np.ndarray,
        nit: int,
    ) -> Optional[OptimizeResult]:
        """Check convergence via gradient norm.

        Args:
            x: Current point.
            f_x: Objective function value at *x*.
            grad: Gradient at *x*.
            nit: Current iteration count.

        Returns:
            An OptimizeResult if converged, ``None`` otherwise.
        """
        grad_norm = float(np.linalg.norm(grad, ord=np.inf))
        if grad_norm < self.tol:
            return OptimizeResult(
                x=x,
                fun=f_x,
                nit=nit,
                success=True,
                message="Converged: gradient norm below tolerance",
            )
        return None

    def _max_iter_reached(
        self,
        x: np.ndarray,
        fun: Callable[[np.ndarray], float],
    ) -> OptimizeResult:
        """Return result when maximum iterations are reached.

        Args:
            x: Current point.
            fun: Objective function.

        Returns:
            An OptimizeResult with ``success=False``.
        """
        return OptimizeResult(
            x=x,
            fun=fun(x),
            nit=self.max_iter,
            success=False,
            message="Max iterations reached",
        )

    @abstractmethod
    def minimize(
        self,
        fun: Callable[[np.ndarray], float],
        x0: np.ndarray,
    ) -> OptimizeResult:
        """Minimize the objective function starting from x0.

        Args:
            fun: Objective function mapping an array to a scalar.
            x0: Initial guess.

        Returns:
            An OptimizeResult describing the optimization outcome.
        """
        ...


def _validate_vector(x: ArrayLike, name: str = "x") -> np.ndarray:
    """Validate and convert input to a 1D numpy array.

    Args:
        x: Input array-like object.
        name: Name of the parameter for error messages.

    Returns:
        A 1D numpy array.

    Raises:
        TypeError: If the input is not or cannot be converted to a 1D array.
    """
    if not isinstance(x, np.ndarray):
        x = np.asarray(x)
    if x.ndim != 1:
        raise TypeError(f"{name} must be a 1D array, got ndim={x.ndim}")
    return x


def _compute_gradient(
    fun: Callable[[np.ndarray], float],
    x: np.ndarray,
    eps: float = 1.5e-8,
) -> np.ndarray:
    """Compute the gradient of *fun* at *x* using central finite differences.

    Uses a centered difference scheme with step size *eps* for each
    coordinate.

    Args:
        fun: Objective function.
        x: Point at which to evaluate the gradient.
        eps: Finite difference step size. Defaults to 1.5e-8
            (sqrt of float64 machine epsilon).

    Returns:
        The numerical gradient vector.

    Raises:
        TypeError: If *x* is not a 1D array.
    """
    x = _validate_vector(x)
    grad = np.empty_like(x, dtype=np.float64)
    for i in range(x.size):
        original = x[i]
        x[i] = original + eps
        f_plus = fun(x)
        x[i] = original - eps
        f_minus = fun(x)
        x[i] = original
        grad[i] = (f_plus - f_minus) / (2.0 * eps)
    return grad


class GradientDescent(Minimizer):
    """Gradient descent optimizer with optional Armijo line search.

    When *use_armijo* is ``True``, the step size is determined by Armijo
    backtracking at each iteration. When ``False``, a fixed *step_size*
    must be provided.

    Args:
        max_iter: Maximum number of iterations. Defaults to 1000.
        tol: Gradient norm tolerance for convergence. Defaults to 1e-6.
        step_size: Fixed step size (required when *use_armijo* is
            ``False``). Defaults to ``None``.
        use_armijo: Whether to use Armijo backtracking. Defaults to
            ``True``.
        c: Armijo sufficient decrease parameter. Defaults to 1e-4.
        rho: Backtracking reduction factor. Defaults to 0.5.
        alpha_0: Initial step size for Armijo backtracking. Defaults
            to 1.0.
    """

    def __init__(
        self,
        max_iter: int = 1000,
        tol: float = 1e-6,
        step_size: Optional[float] = None,
        use_armijo: bool = True,
        c: float = 1e-4,
        rho: float = 0.5,
        alpha_0: float = 1.0,
    ) -> None:
        super().__init__(max_iter, tol)
        self.step_size = step_size
        self.use_armijo = use_armijo
        self.c = c
        self.rho = rho
        self.alpha_0 = alpha_0

    def minimize(
        self,
        fun: Callable[[np.ndarray], float],
        x0: np.ndarray,
    ) -> OptimizeResult:
        """Minimize *fun* using gradient descent.

        Args:
            fun: Objective function.
            x0: Initial guess.

        Returns:
            An OptimizeResult describing the optimization outcome.

        Raises:
            ValueError: If *use_armijo* is ``False`` and *step_size*
                was not provided.
        """
        x = np.asarray(x0, dtype=np.float64).copy()
        for nit in range(self.max_iter):
            grad = _compute_gradient(fun, x)
            f_x = fun(x)
            result = self._check_convergence(x, f_x, grad, nit)
            if result is not None:
                return result

            if self.use_armijo:
                p = -grad
                alpha = self.alpha_0
                for _ in range(50):
                    x_new = x + alpha * p
                    f_new = fun(x_new)
                    if f_new <= f_x + self.c * alpha * float(np.dot(grad, p)):
                        break
                    alpha *= self.rho
                else:
                    return OptimizeResult(
                        x=x,
                        fun=f_x,
                        nit=nit,
                        success=False,
                        message="Armijo line search failed",
                    )
                x = x_new
            else:
                if self.step_size is None:
                    raise ValueError(
                        "step_size must be provided when use_armijo=False"
                    )
                x = x - self.step_size * grad

        return self._max_iter_reached(x, fun)


class NewtonMethod(Minimizer):
    """Newton's method optimizer using an exact Hessian.

    At each iteration the search direction is computed by solving the
    Newton system ``H * p = -grad``. If the Hessian is singular, the
    method returns ``success=False``.

    Args:
        hess: Hessian function mapping an array to a square matrix.
        max_iter: Maximum number of iterations. Defaults to 1000.
        tol: Gradient norm tolerance for convergence. Defaults to 1e-6.
    """

    def __init__(
        self,
        hess: Callable[[np.ndarray], np.ndarray],
        max_iter: int = 1000,
        tol: float = 1e-6,
    ) -> None:
        super().__init__(max_iter, tol)
        self.hess = hess

    def minimize(
        self,
        fun: Callable[[np.ndarray], float],
        x0: np.ndarray,
    ) -> OptimizeResult:
        """Minimize *fun* using Newton's method.

        Args:
            fun: Objective function.
            x0: Initial guess.

        Returns:
            An OptimizeResult describing the optimization outcome.
        """
        x = np.asarray(x0, dtype=np.float64).copy()
        for nit in range(self.max_iter):
            grad = _compute_gradient(fun, x)
            f_x = fun(x)
            result = self._check_convergence(x, f_x, grad, nit)
            if result is not None:
                return result

            H = self.hess(x)
            try:
                p = np.linalg.solve(H, -grad)
            except np.linalg.LinAlgError:
                return OptimizeResult(
                    x=x,
                    fun=f_x,
                    nit=nit,
                    success=False,
                    message="Singular Hessian encountered",
                )

            x = x + p

        return self._max_iter_reached(x, fun)

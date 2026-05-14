"""Core numerical integration — Smolyak sparse grids and Monte Carlo."""

from __future__ import annotations

import math
from collections.abc import Callable
from dataclasses import dataclass
from typing import Optional, Union

import numpy as np
from numpy.typing import ArrayLike, NDArray


@dataclass
class IntegrateResult:
    """Result of a numerical integration.

    Attributes:
        value: The estimated integral value.
        error_estimate: Estimated error of the integral value.
        n_evaluations: Number of function evaluations performed.
        success: Whether the integration completed successfully.
        message: A human-readable message describing the result.
    """

    value: float
    error_estimate: float
    n_evaluations: int
    success: bool
    message: str


def _gauss_legendre_1d(
    n: int, a: float, b: float
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """Compute Gauss-Legendre nodes and weights on the interval ``[a, b]``.

    Uses ``numpy.polynomial.legendre.leggauss`` for the reference nodes and
    weights on ``[-1, 1]``, then applies an affine transformation to ``[a, b]``.

    Args:
        n: Number of nodes (must be >= 1).
        a: Lower bound of the interval.
        b: Upper bound of the interval.

    Returns:
        A tuple ``(nodes, weights)`` where each is a 1D array of length *n*.

    Raises:
        ValueError: If *n* < 1 or *a* >= *b*.
    """
    if n < 1:
        raise ValueError(f"Number of nodes must be >= 1, got {n}")
    if a >= b:
        raise ValueError(
            f"Interval must satisfy a < b, got a={a}, b={b}"
        )

    x_ref, w_ref = np.polynomial.legendre.leggauss(n)

    half_length = 0.5 * (b - a)
    mid = 0.5 * (b + a)

    x_mapped: NDArray[np.float64] = half_length * x_ref + mid
    w_mapped: NDArray[np.float64] = half_length * w_ref
    return x_mapped, w_mapped


def _smolyak_recursive(
    d: int,
    level: int,
    current: list[int],
    depth: int,
    result: list[tuple[int, ...]],
) -> None:
    """Generate multi-indices with recursive pruning of the sum constraint.

    At each depth the maximum allowed value for the current dimension is
    ``level - sum(current) - (d - depth - 1)``, ensuring the remaining
    dimensions can each contribute at least 1.  This avoids enumerating
    tuples that would be discarded by the sum constraint.

    Args:
        d: Number of dimensions.
        level: Smolyak level.
        current: Accumulated values for the current recursion path.
        depth: Current recursion depth (0-indexed).
        result: Accumulator list for completed tuples.
    """
    if depth == d:
        result.append(tuple(current))
        return

    remaining = d - depth
    max_for_this_dim = level - sum(current) - (remaining - 1)
    for i in range(1, max_for_this_dim + 1):
        current.append(i)
        _smolyak_recursive(d, level, current, depth + 1, result)
        current.pop()


def _smolyak_multi_index(d: int, level: int) -> list[tuple[int, ...]]:
    """Generate the Smolyak multi-index set for dimension *d* and *level*.

    Returns all tuples ``(i_1, ..., i_d)`` with ``i_j >= 1`` and
    ``sum(i_j) <= level``.  Each index corresponds to a 1D quadrature level
    with node count ``n_{i_j} = 2^{i_j - 1} + 1``.

    Args:
        d: Number of dimensions (must be >= 1).
        level: Smolyak level (must be >= *d* for a non-empty index set).

    Returns:
        List of multi-index tuples sorted by increasing sum, then
        lexicographically.

    Raises:
        ValueError: If *d* < 1 or *level* < 1.
    """
    if d < 1:
        raise ValueError(f"Dimension must be >= 1, got {d}")
    if level < 1:
        raise ValueError(f"Level must be >= 1, got {level}")

    indices: list[tuple[int, ...]] = []
    _smolyak_recursive(d, level, [], 0, indices)
    indices.sort(key=lambda t: (sum(t), t))
    return indices


def _validate_bounds(bounds: ArrayLike) -> tuple[NDArray[np.float64], int]:
    """Validate and convert integration bounds.

    Args:
        bounds: Array of shape ``(d, 2)`` where ``bounds[j, 0]`` and
            ``bounds[j, 1]`` are the lower and upper bounds for dimension *j*.

    Returns:
        A tuple ``(bounds_arr, d)`` where *bounds_arr* is a float64 array
        of shape ``(d, 2)`` and *d* is the number of dimensions.

    Raises:
        ValueError: If *bounds* has invalid shape or *d* < 1.
    """
    bounds_arr = np.asarray(bounds, dtype=np.float64)
    if bounds_arr.ndim != 2 or bounds_arr.shape[1] != 2:
        raise ValueError(
            f"bounds must have shape (d, 2), got {bounds_arr.shape}"
        )
    d = bounds_arr.shape[0]
    if d < 1:
        raise ValueError(f"Dimension must be >= 1, got {d}")
    return bounds_arr, d


def _build_sparse_grid(
    idx: tuple[int, ...],
    d: int,
    bounds_arr: NDArray[np.float64],
    level: int,
) -> tuple[float, NDArray[np.float64], NDArray[np.float64], int]:
    """Build Gauss-Legendre nodes, weights, and grid points for a multi-index.

    Constructs the d-dimensional tensor-product grid of 1D Gauss-Legendre
    nodes and the corresponding tensor-product weights for the given
    multi-index *idx*.

    Args:
        idx: A multi-index tuple ``(i_1, ..., i_d)``.
        d: Number of dimensions.
        bounds_arr: Bounds array of shape ``(d, 2)``.
        level: Smolyak level (used for the combination coefficient).

    Returns:
        A tuple ``(coeff, tp_weights, flat_points, n_points)`` where
        *coeff* is the Smolyak combination coefficient, *tp_weights* is
        the array of tensor-product weights, *flat_points* is the
        flattened grid of shape ``(n_points, d)``, and *n_points* is
        the total number of grid points.
    """
    s = sum(idx)
    coeff = ((-1.0) ** (level - s)) * float(math.comb(d - 1, level - s))

    n_per_dim = [int(2 ** (i - 1) + 1) for i in idx]

    nodes_1d: list[NDArray[np.float64]] = []
    weights_1d: list[NDArray[np.float64]] = []
    for dim in range(d):
        a = float(bounds_arr[dim, 0])
        b = float(bounds_arr[dim, 1])
        x, w = _gauss_legendre_1d(n_per_dim[dim], a, b)
        nodes_1d.append(x)
        weights_1d.append(w)

    grids = np.meshgrid(*nodes_1d, indexing="ij")
    weight_grids = np.meshgrid(*weights_1d, indexing="ij")
    tp_weights: NDArray[np.float64] = np.prod(weight_grids, axis=0)

    flat_points = np.column_stack([g.ravel() for g in grids])
    n_points = flat_points.shape[0]

    return coeff, tp_weights, flat_points, n_points


def _evaluate_on_grid(
    fun: Callable[[NDArray[np.float64]], float | np.floating],
    points: NDArray[np.float64],
) -> NDArray[np.float64]:
    """Evaluate *fun* at each point, attempting a vectorised call first.

    Tries ``fun(points)`` as a single vectorised evaluation.  If the
    integrand raises ``TypeError`` or ``ValueError`` (e.g. it expects a
    1D input), falls back to an explicit per-point loop.

    Args:
        fun: The integrand.
        points: Array of shape ``(n_points, d)``.

    Returns:
        Array of function values, shape ``(n_points,)``.
    """
    n_points = points.shape[0]
    try:
        result = fun(points)
        result_arr = np.asarray(result, dtype=np.float64)
        if result_arr.ndim == 0:
            return np.full(n_points, float(result_arr))
        return result_arr.ravel()
    except (TypeError, ValueError):
        f_values = np.empty(n_points, dtype=np.float64)
        for p in range(n_points):
            f_values[p] = float(fun(points[p]))
        return f_values


def _combine_quadrature(
    coeff: float,
    tp_weights: NDArray[np.float64],
    f_values: NDArray[np.float64],
) -> float:
    """Combine tensor-product weights with function values and the coefficient.

    Computes ``coeff * sum(tp_weights * f_values)``.

    Args:
        coeff: Smolyak combination coefficient.
        tp_weights: Tensor-product weight array.
        f_values: Function values at grid points, shape ``(n_points,)``.

    Returns:
        The weighted quadrature contribution.
    """
    tp_integral = float(np.sum(tp_weights.ravel() * f_values))
    return coeff * tp_integral


def sparse_grid_integrate(
    fun: Callable[[NDArray[np.float64]], float | np.floating],
    bounds: ArrayLike,
    level: int = 2,
) -> IntegrateResult:
    """Integrate a function over a hyper-rectangle using Smolyak sparse grids.

    Implements the Smolyak algorithm: a weighted combination of tensor-product
    Gauss-Legendre rules over a multi-index set.  The combination coefficient
    for a multi-index ``i`` is:

        ``c(i) = (-1)^(level - |i|) * C(d - 1, level - |i|)``

    where ``|i| = sum(i_j)`` and ``C`` is the binomial coefficient.

    Args:
        fun: The integrand.  Must accept a 1D array of length *d* and return
            a scalar.
        bounds: Array of shape ``(d, 2)`` where ``bounds[j, 0]`` and
            ``bounds[j, 1]`` are the lower and upper bounds for dimension *j*.
        level: Smolyak level (>= 1, should be >= *d* for a non-empty grid).
            Defaults to 2.

    Returns:
        An :class:`IntegrateResult` with the estimated integral.

    Raises:
        ValueError: If *bounds* has invalid shape, *level* < 1, or
            the index set is empty.
    """
    bounds_arr, d = _validate_bounds(bounds)
    if level < 1:
        raise ValueError(f"Level must be >= 1, got {level}")

    indices = _smolyak_multi_index(d, level)
    if not indices:
        raise ValueError(
            f"No valid multi-indices for d={d}, level={level}. "
            f"level must be >= d for a non-empty sparse grid."
        )

    total_value = 0.0
    total_evaluations = 0

    for idx in indices:
        coeff, tp_weights, flat_points, n_points = _build_sparse_grid(
            idx, d, bounds_arr, level,
        )
        f_values = _evaluate_on_grid(fun, flat_points)
        total_value += _combine_quadrature(coeff, tp_weights, f_values)
        total_evaluations += n_points

    return IntegrateResult(
        value=float(total_value),
        error_estimate=0.0,
        n_evaluations=total_evaluations,
        success=True,
        message=f"Smolyak sparse grid level={level}, dimension={d}, "
        f"{len(indices)} multi-indices",
    )


def monte_carlo_integrate(
    fun: Callable[[NDArray[np.float64]], float | np.floating],
    bounds: ArrayLike,
    n_samples: int = 100_000,
    seed: Optional[int] = None,
) -> IntegrateResult:
    """Integrate a function over a hyper-rectangle using Monte Carlo sampling.

    Draws uniform random samples in the hyper-rectangle defined by *bounds*,
    evaluates the integrand, and estimates the integral as:

        ``volume * mean(f(x_i))``

    with error estimate:

        ``volume * std(f(x_i)) / sqrt(n_samples)``

    Uses a local ``numpy.random.Generator`` (via ``default_rng``) so the
    global NumPy random state is never modified.

    Args:
        fun: The integrand.  Must accept a 1D array of length *d* and return
            a scalar.
        bounds: Array of shape ``(d, 2)`` where ``bounds[j, 0]`` and
            ``bounds[j, 1]`` are the lower and upper bounds for dimension *j*.
        n_samples: Number of random samples.  Defaults to 100000.
        seed: Seed for the local random number generator.  Pass ``None`` for
            non-deterministic sampling.

    Returns:
        An :class:`IntegrateResult` with the estimated integral and error.

    Raises:
        ValueError: If *bounds* has invalid shape or *n_samples* < 1.
    """
    bounds_arr, d = _validate_bounds(bounds)
    if n_samples < 1:
        raise ValueError(f"n_samples must be >= 1, got {n_samples}")

    lengths = bounds_arr[:, 1] - bounds_arr[:, 0]
    volume = float(np.prod(lengths))

    # Local RNG — never pollutes the global state
    rng = np.random.default_rng(seed)

    # Sample uniformly in [0, 1]^d then scale to bounds via broadcasting
    samples: NDArray[np.float64] = rng.uniform(0.0, 1.0, size=(n_samples, d))
    samples = bounds_arr[:, 0] + samples * lengths[np.newaxis, :]

    f_values = _evaluate_on_grid(fun, samples)

    mean_f = float(np.mean(f_values))
    if n_samples == 1:
        std_f = 0.0
    else:
        std_f = float(np.std(f_values, ddof=1))

    value = volume * mean_f
    error_estimate = volume * std_f / math.sqrt(float(n_samples))

    return IntegrateResult(
        value=float(value),
        error_estimate=float(error_estimate),
        n_evaluations=n_samples,
        success=True,
        message=f"Monte Carlo n_samples={n_samples}, dimension={d}",
    )


def integrate(
    fun: Callable[[NDArray[np.float64]], float | np.floating],
    bounds: ArrayLike,
    method: str = "auto",
    **kwargs: Optional[Union[int, str]],
) -> IntegrateResult:
    """Numerically integrate a function over a hyper-rectangle.

    Dispatches to :func:`sparse_grid_integrate` or
    :func:`monte_carlo_integrate` based on the dimension *d* or the
    explicit *method* argument.

    Args:
        fun: The integrand.  Must accept a 1D array of length *d* and return
            a scalar.
        bounds: Array of shape ``(d, 2)`` where ``bounds[j, 0]`` and
            ``bounds[j, 1]`` are the lower and upper bounds for dimension *j*.
        method: Integration method.  One of ``"auto"``, ``"sparse_grid"``,
            or ``"monte_carlo"``.
            ``"auto"`` (default) selects ``"sparse_grid"`` for ``d <= 4``
            and ``"monte_carlo"`` for ``d >= 5``.
        **kwargs: Additional keyword arguments passed to the specific
            integration routine (e.g. ``level``, ``n_samples``, ``seed``).

    Returns:
        An :class:`IntegrateResult`.

    Raises:
        ValueError: If *bounds* has invalid shape or *method* is unknown.
    """
    bounds_arr, d = _validate_bounds(bounds)

    if method == "auto":
        resolved: str = "sparse_grid" if d <= 4 else "monte_carlo"
    else:
        resolved = method

    if resolved == "sparse_grid":
        level: int = kwargs.get("level", 2)  # type: ignore[assignment]
        return sparse_grid_integrate(fun, bounds_arr, level=level)
    elif resolved == "monte_carlo":
        n_samples: int = kwargs.get("n_samples", 100_000)  # type: ignore[assignment]
        seed_val = kwargs.get("seed", None)
        if seed_val is not None:
            seed: int | None = int(seed_val)
        else:
            seed = None
        return monte_carlo_integrate(
            fun, bounds_arr, n_samples=n_samples, seed=seed,
        )
    else:
        raise ValueError(
            f"Unknown method '{method}'. "
            f"Expected one of: 'auto', 'sparse_grid', 'monte_carlo'"
        )

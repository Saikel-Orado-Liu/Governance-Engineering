"""数值积分模块 — 数值求积方法。"""

from __future__ import annotations

from scicomp.integrate.core import (
    IntegrateResult,
    integrate,
    monte_carlo_integrate,
    sparse_grid_integrate,
)

__all__ = [
    "IntegrateResult",
    "integrate",
    "monte_carlo_integrate",
    "sparse_grid_integrate",
]

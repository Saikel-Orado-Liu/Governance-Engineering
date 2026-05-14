"""插值与拟合模块 — 数据插值和曲线拟合。"""

from __future__ import annotations

from scicomp.interp.core import CubicSpline, spline_interpolate

__all__ = [
    "CubicSpline",
    "spline_interpolate",
]

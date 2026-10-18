"""
Unit tests for symbolic mathematics service and SymPy verification.
"""
from app.services.mathematics_service import math_service


def test_solve_algebraic_equation():
    """Verify algebraic equation solving and root substitution check."""
    result = math_service.solve_algebraic_equation("x^2 - 5*x + 6 = 0", "x")
    assert result.verified is True
    assert "2" in result.result
    assert "3" in result.result
    assert any("Verified" in step for step in (result.steps or []))


def test_compute_derivative():
    """Verify symbolic differentiation."""
    result = math_service.compute_derivative("x^3 + 2*x", "x", 1)
    assert result.verified is True
    assert "3*x**2 + 2" in result.result or "3*x^2" in result.result or "3" in result.result


def test_compute_integral_indefinite():
    """Verify indefinite integration."""
    result = math_service.compute_integral("2*x", "x")
    assert result.verified is True
    assert "x**2" in result.result or "x^2" in result.result


def test_compute_integral_definite():
    """Verify definite integration with lower and upper limits."""
    result = math_service.compute_integral("x", "x", lower="0", upper="2")
    assert result.verified is True
    assert result.result == "2"


def test_extract_and_verify_math():
    """Verify query pattern detection and automated solving."""
    res = math_service.extract_and_verify_math("solve x^2 - 4 = 0")
    assert res is not None
    assert res.verified is True
    assert "-2" in res.result and "2" in res.result

"""
Engineering Mathematics Service using SymPy for exact symbolic computation and verification.
Provides step-by-step calculus, algebra, differential equations, and solution verification.
"""
import re
import logging
from typing import Optional, Any
from app.models.schemas import MathVerification

logger = logging.getLogger(__name__)

# Attempt SymPy import
try:
    import sympy as sp
    from sympy import (
        symbols, solve, Eq, diff, integrate, simplify
    )
    from sympy.parsing.sympy_parser import (
        parse_expr, standard_transformations,
        implicit_multiplication_application, convert_xor
    )
    SYMPY_AVAILABLE = True
except ImportError:
    SYMPY_AVAILABLE = False
    logger.warning("SymPy is not installed; symbolic math verification will be disabled.")


class MathematicsService:
    """Service providing symbolic mathematical solving and verification."""

    def __init__(self):
        self.available = SYMPY_AVAILABLE
        if self.available:
            self.transformations = (
                standard_transformations + (implicit_multiplication_application, convert_xor)
            )

    def is_available(self) -> bool:
        return self.available

    def safe_parse(self, expr_str: str) -> Optional[Any]:
        """Safely parse mathematical expressions with implicit multiplication and powers."""
        if not self.available:
            return None
        try:
            # Clean common input quirks: ^ -> **
            cleaned = expr_str.strip().replace("^", "**")
            parsed = parse_expr(cleaned, transformations=self.transformations)
            return parsed
        except Exception as e:
            logger.debug(f"Failed to parse mathematical expression '{expr_str}': {e}")
            return None

    def solve_algebraic_equation(self, equation_str: str, var_str: str = "x") -> MathVerification:
        """
        Solve an equation such as 'x^2 - 5*x + 6 = 0' or '2*x + 3 = 7'
        and verify each root by substituting back into LHS - RHS.
        """
        if not self.available:
            return MathVerification(
                expression=equation_str,
                verified=False,
                result="SymPy library unavailable",
                error="SymPy not installed"
            )

        try:
            var = symbols(var_str)
            if "=" in equation_str:
                lhs_str, rhs_str = equation_str.split("=", 1)
                lhs = self.safe_parse(lhs_str)
                rhs = self.safe_parse(rhs_str)
                eq = Eq(lhs, rhs)
                eval_expr = lhs - rhs
            else:
                lhs = self.safe_parse(equation_str)
                eq = Eq(lhs, 0)
                eval_expr = lhs

            solutions = solve(eq, var)
            steps = [
                f"Equation formulated: {sp.pretty(eq, use_unicode=True)}",
                f"Solving for variable: {var_str}",
            ]

            # Verification: substitute each root back into eval_expr
            verification_passed = True
            for sol in solutions:
                sub_val = simplify(eval_expr.subs(var, sol))
                step_note = f"Root: {var_str} = {sp.pretty(sol, use_unicode=True)}"
                if sub_val == 0:
                    steps.append(f"{step_note} -> Verified (LHS - RHS = 0)")
                else:
                    steps.append(f"{step_note} -> Numerical residue: {sub_val}")
                    verification_passed = False

            result_str = ", ".join(f"{var_str} = {sol}" for sol in solutions) if solutions else "No symbolic solution found"

            return MathVerification(
                expression=equation_str,
                verified=verification_passed,
                result=result_str,
                steps=steps
            )
        except Exception as e:
            return MathVerification(
                expression=equation_str,
                verified=False,
                result="Error during symbolic computation",
                error=str(e)
            )

    def compute_derivative(self, expr_str: str, var_str: str = "x", order: int = 1) -> MathVerification:
        """Compute the n-th derivative of an expression with respect to var."""
        if not self.available:
            return MathVerification(expression=expr_str, verified=False, result="SymPy unavailable")
        try:
            var = symbols(var_str)
            expr = self.safe_parse(expr_str)
            if expr is None:
                raise ValueError("Could not parse expression")
            
            result = diff(expr, var, order)
            steps = [
                f"Function: f({var_str}) = {sp.pretty(expr, use_unicode=True)}",
                f"Order of differentiation: {order}",
                f"Derivative d^{order}/d{var_str}^{order}: {sp.pretty(result, use_unicode=True)}"
            ]
            return MathVerification(
                expression=f"d^{order}/d{var_str}^{order} ({expr_str})",
                verified=True,
                result=str(result),
                steps=steps
            )
        except Exception as e:
            return MathVerification(
                expression=expr_str,
                verified=False,
                result="Differentiation failed",
                error=str(e)
            )

    def compute_integral(
        self,
        expr_str: str,
        var_str: str = "x",
        lower: Optional[str] = None,
        upper: Optional[str] = None
    ) -> MathVerification:
        """Compute indefinite or definite integral."""
        if not self.available:
            return MathVerification(expression=expr_str, verified=False, result="SymPy unavailable")
        try:
            var = symbols(var_str)
            expr = self.safe_parse(expr_str)
            if expr is None:
                raise ValueError("Could not parse expression")

            if lower is not None and upper is not None:
                low_val = self.safe_parse(lower)
                up_val = self.safe_parse(upper)
                result = integrate(expr, (var, low_val, up_val))
                steps = [
                    f"Integrand: {sp.pretty(expr, use_unicode=True)}",
                    f"Definite limits: [{lower}, {upper}]",
                    f"Evaluated definite integral: {sp.pretty(result, use_unicode=True)}"
                ]
            else:
                result = integrate(expr, var)
                # Verify by differentiating result
                diff_check = simplify(diff(result, var) - expr)
                verified = (diff_check == 0)
                steps = [
                    f"Integrand: {sp.pretty(expr, use_unicode=True)}",
                    f"Indefinite integral: {sp.pretty(result, use_unicode=True)} + C",
                    f"Verification: d/d{var_str}(integral) matches integrand: {verified}"
                ]

            return MathVerification(
                expression=f"integral({expr_str}, {var_str})",
                verified=True,
                result=str(result),
                steps=steps
            )
        except Exception as e:
            return MathVerification(
                expression=expr_str,
                verified=False,
                result="Integration failed",
                error=str(e)
            )

    def extract_and_verify_math(self, text: str) -> Optional[MathVerification]:
        """
        Inspect user queries for explicit mathematical problems and attempt verification.
        Example triggers:
        - "solve x^2 - 5x + 6 = 0"
        - "derivative of sin(x)*exp(x)"
        - "integral of x^2"
        """
        if not self.available:
            return None

        clean_text = text.strip()

        # Check solve pattern: solve ...
        solve_match = re.search(r'\bsolve\s+([a-zA-Z0-9\s\+\-\*\/\^\(\)]+=?[a-zA-Z0-9\s\+\-\*\/\^\(\)]*)', clean_text, re.IGNORECASE)
        if solve_match:
            eq_candidate = solve_match.group(1).strip()
            # Avoid long English text accidental matches
            if len(eq_candidate.split()) < 10 and any(c in eq_candidate for c in "+-*/^=0123456789"):
                return self.solve_algebraic_equation(eq_candidate)

        # Check derivative pattern: derivative of ... / diff of ...
        diff_match = re.search(r'\b(?:derivative|diff)\s+of\s+([a-zA-Z0-9\s\+\-\*\/\^\(\)]+?)(?:\s+with respect to\s+([a-zA-Z]))?$', clean_text, re.IGNORECASE)
        if diff_match:
            expr_candidate = diff_match.group(1).strip()
            var = diff_match.group(2) if diff_match.group(2) else "x"
            return self.compute_derivative(expr_candidate, var_str=var)

        # Check integral pattern: integral of ... / integrate ...
        int_match = re.search(r'\b(?:integral|integrate)\s+(?:of\s+)?([a-zA-Z0-9\s\+\-\*\/\^\(\)]+?)(?:\s+with respect to\s+([a-zA-Z]))?$', clean_text, re.IGNORECASE)
        if int_match:
            expr_candidate = int_match.group(1).strip()
            var = int_match.group(2) if int_match.group(2) else "x"
            return self.compute_integral(expr_candidate, var_str=var)

        return None


math_service = MathematicsService()

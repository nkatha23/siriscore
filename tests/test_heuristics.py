"""Unit tests for each heuristic module (one test per heuristic)."""
import pytest
from unittest.mock import MagicMock
from scorer.report import Severity


def _tx(inputs=None, outputs=None):
    tx = MagicMock()
    tx.inputs = inputs or []
    tx.outputs = outputs or []
    return tx


class TestH1ScriptMismatch:
    def test_fires_on_mismatch(self):
        from scorer.heuristics.h1_script_mismatch import check
        # TODO: mock classify_script and provide mismatched tx
        pass

    def test_clean_on_uniform_types(self):
        from scorer.heuristics.h1_script_mismatch import check
        pass


class TestH2RoundAmount:
    def test_fires_on_round_output(self):
        from scorer.heuristics.h2_round_amount import check
        out = MagicMock()
        out.value = 1_000_000
        finding = check(_tx(outputs=[out]), {})
        assert finding is not None
        assert finding.heuristic_id == "H2"
        assert finding.severity == Severity.WARNING

    def test_clean_on_odd_amount(self):
        from scorer.heuristics.h2_round_amount import check
        out = MagicMock()
        out.value = 987_654
        assert check(_tx(outputs=[out]), {}) is None


class TestH5Consolidation:
    def test_fires_above_threshold(self):
        from scorer.heuristics.h5_consolidation import check
        inputs = [MagicMock() for _ in range(6)]
        finding = check(_tx(inputs=inputs), {})
        assert finding is not None
        assert finding.heuristic_id == "H5"

    def test_clean_below_threshold(self):
        from scorer.heuristics.h5_consolidation import check
        inputs = [MagicMock() for _ in range(3)]
        assert check(_tx(inputs=inputs), {}) is None

from scorer.report import Finding, Severity

HIGH_INPUT_THRESHOLD = 5


def check(tx, psbt_meta) -> Finding | None:
    n = len(tx.inputs)
    if n >= HIGH_INPUT_THRESHOLD:
        return Finding(
            heuristic_id="H5",
            severity=Severity.WARNING,
            title="High input count consolidation",
            detail=(
                f"Transaction has {n} inputs. High input counts are a strong "
                "Common Input Ownership Heuristic (CIOH) signal — analysts assume "
                "all inputs belong to the same wallet."
            ),
            suggestion=(
                "Avoid consolidating many UTXOs in a single transaction. "
                "Consider using a coinjoin instead."
            ),
            weight=10,
        )
    return None

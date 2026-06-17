from scorer.report import Finding, Severity

ROUND_THRESHOLD = 10_000  # sats — amounts divisible by this are considered round


def check(tx, psbt_meta) -> Finding | None:
    for i, out in enumerate(tx.outputs):
        if out.value % ROUND_THRESHOLD == 0:
            return Finding(
                heuristic_id="H2",
                severity=Severity.WARNING,
                title="Round payment amount",
                detail=(
                    f"Output #{i} is exactly {out.value:,} sats. "
                    "Round numbers strongly suggest the human-entered payment amount, "
                    "revealing which output is payment and which is change."
                ),
                suggestion="Add a small random offset to the payment amount when possible.",
                weight=15,
            )
    return None

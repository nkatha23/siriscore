from scorer.report import Finding, Severity

DUST_THRESHOLD = 546  # sats — standard dust limit for P2PKH


def check(tx, psbt_meta) -> Finding | None:
    for inp in tx.inputs:
        if inp.value is not None and inp.value <= DUST_THRESHOLD:
            return Finding(
                heuristic_id="H6",
                severity=Severity.WARNING,
                title="Dust input present",
                detail=(
                    f"Input value {inp.value} sats is at or below the dust threshold "
                    f"({DUST_THRESHOLD} sats). Spending dust outputs may be part of a "
                    "dust attack designed to track your wallet."
                ),
                suggestion=(
                    "Avoid spending dust inputs. Consider ignoring them or "
                    "sweeping them via a coinjoin."
                ),
                weight=10,
            )
    return None

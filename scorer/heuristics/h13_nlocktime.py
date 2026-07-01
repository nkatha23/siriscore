from scorer.report import Finding, Severity


def check(tx, psbt_meta) -> Finding | None:
    if tx.locktime == 0:
        return Finding(
            heuristic_id="H13",
            severity=Severity.INFO,
            title="nLockTime Anti-Fee-Sniping Check",
            detail=(
                "nLockTime is set to 0. Most wallets set it to the current block height "
                "as an anti-fee-sniping measure. The absence is a wallet fingerprint that "
                "reveals the software used to construct this transaction."
            ),
            suggestion="Use a wallet that sets nLockTime to the current tip height.",
            weight=5,
        )
    return None

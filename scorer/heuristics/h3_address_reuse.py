from scorer.report import Finding, Severity
from scorer.lookup import get_address_txs


def check(tx, psbt_meta) -> Finding | None:
    for inp in tx.inputs:
        address = inp.address
        if not address:
            continue
        txs = get_address_txs(address)
        if len(txs) > 1:
            return Finding(
                heuristic_id="H3",
                severity=Severity.CRITICAL,
                title="Address reuse on input",
                detail=(
                    f"Input address {address[:16]}… was previously used in "
                    f"{len(txs)} transactions. Reuse links all activity to one identity."
                ),
                suggestion="Never reuse addresses. Generate a fresh address per receive.",
                weight=20,
            )
    return None

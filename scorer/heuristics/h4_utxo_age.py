from scorer.report import Finding, Severity
from scorer.lookup import get_utxo_block_height

NARROW_RANGE = 6  # blocks — inputs within this range suggest clustering


def check(tx, psbt_meta) -> Finding | None:
    heights = []
    for inp in tx.inputs:
        h = get_utxo_block_height(inp.txid)
        if h is not None:
            heights.append(h)

    if len(heights) >= 2 and max(heights) - min(heights) <= NARROW_RANGE:
        return Finding(
            heuristic_id="H4",
            severity=Severity.WARNING,
            title="UTXO age clustering",
            detail=(
                f"All {len(heights)} inputs were confirmed within {NARROW_RANGE} blocks "
                "of each other. This suggests they came from the same source event."
            ),
            suggestion="Mix UTXOs from different time periods to break clustering.",
            weight=10,
        )
    return None

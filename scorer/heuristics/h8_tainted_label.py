from scorer.report import Finding, Severity
from scorer.labels import get_label

TAINTED_SCORE_CAP = 40


def check(tx, psbt_meta) -> Finding | None:
    for inp in tx.inputs:
        record = get_label(inp.txid, inp.vout)
        if record and record.get("tag") == "tainted":
            return Finding(
                heuristic_id="H8",
                severity=Severity.CRITICAL,
                title="Labelled tainted UTXO in inputs",
                detail=(
                    f"Input {inp.txid[:16]}…:{inp.vout} is labelled "
                    f'"{record["label"]}" and tagged tainted. '
                    f"Maximum score is capped at {TAINTED_SCORE_CAP}."
                ),
                suggestion=(
                    "Do not spend tainted UTXOs with clean ones. "
                    "Consider a coinjoin to break the taint link first."
                ),
                weight=25,
            )
    return None

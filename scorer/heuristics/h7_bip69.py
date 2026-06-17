from scorer.report import Finding, Severity


def check(tx, psbt_meta) -> Finding | None:
    if not _inputs_sorted(tx) or not _outputs_sorted(tx):
        return Finding(
            heuristic_id="H7",
            severity=Severity.INFO,
            title="Non-BIP69 input/output ordering",
            detail=(
                "Input or output ordering is not lexicographic (BIP-69). "
                "Non-standard ordering is a wallet fingerprint visible to analysts."
            ),
            suggestion="Implement BIP-69 lexicographic ordering before signing.",
            weight=5,
        )
    return None


def _inputs_sorted(tx) -> bool:
    pairs = [(i.txid, i.vout) for i in tx.inputs]
    return pairs == sorted(pairs)


def _outputs_sorted(tx) -> bool:
    pairs = [(o.value, o.script_pubkey.hex()) for o in tx.outputs]
    return pairs == sorted(pairs)

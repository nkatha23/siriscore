from scorer.report import Finding, Severity


def check(tx, psbt_meta) -> Finding | None:
    input_types = {classify_script(i.script_pubkey) for i in tx.inputs}
    output_types = {classify_script(o.script_pubkey) for o in tx.outputs}

    if len(input_types) == 1 and output_types - input_types:
        mismatched = output_types - input_types
        return Finding(
            heuristic_id="H1",
            severity=Severity.CRITICAL,
            title="Script type mismatch",
            detail=(
                f"Inputs are {list(input_types)[0]}. "
                f"Output(s) use {mismatched}. "
                f"Change output is trivially identifiable."
            ),
            suggestion=(
                "Ensure all outputs use the same script type as inputs, "
                "or match the recipient's script type."
            ),
            weight=25,
        )
    return None


def classify_script(script_pubkey) -> str:
    raise NotImplementedError

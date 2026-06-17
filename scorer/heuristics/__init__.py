from scorer.heuristics import (
    h1_script_mismatch,
    h2_round_amount,
    h3_address_reuse,
    h4_utxo_age,
    h5_consolidation,
    h6_dust,
    h7_bip69,
    h8_tainted_label,
)

ALL = [
    h1_script_mismatch,
    h2_round_amount,
    h3_address_reuse,
    h4_utxo_age,
    h5_consolidation,
    h6_dust,
    h7_bip69,
    h8_tainted_label,
]

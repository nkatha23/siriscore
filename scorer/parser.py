"""Parse PSBT (BIP-174/370) or raw tx hex into a unified transaction object."""
from scorer.lookup import get_tx


def parse(input_str: str):
    """Accept base64 PSBT, raw hex, or txid. Returns (tx, psbt_meta)."""
    input_str = input_str.strip()

    if len(input_str) == 64 and all(c in "0123456789abcdefABCDEF" for c in input_str):
        return _parse_txid(input_str)

    if input_str.startswith("cHNidP"):
        return _parse_psbt(input_str)

    return _parse_rawtx(input_str)


def _parse_psbt(b64: str):
    raise NotImplementedError


def _parse_rawtx(hex_str: str):
    raise NotImplementedError


def _parse_txid(txid: str):
    raw = get_tx(txid)
    return _parse_rawtx(raw["hex"])

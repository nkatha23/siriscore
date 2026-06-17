import requests
import time

BASE = "https://mempool.space/api"
_cache = {}


def get_tx(txid: str) -> dict:
    if txid in _cache:
        return _cache[txid]
    r = requests.get(f"{BASE}/tx/{txid}", timeout=10)
    r.raise_for_status()
    _cache[txid] = r.json()
    return _cache[txid]


def get_address_txs(address: str) -> list:
    r = requests.get(f"{BASE}/address/{address}/txs", timeout=10)
    r.raise_for_status()
    return r.json()


def get_utxo_block_height(txid: str) -> int | None:
    tx = get_tx(txid)
    return tx.get("status", {}).get("block_height")

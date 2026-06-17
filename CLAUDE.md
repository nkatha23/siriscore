# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install (editable, with dev deps)
pip install -e ".[dev]"

# Web UI — serves index.html at http://localhost:8000
uvicorn api.main:app --reload

# Offline demo — open directly in a browser, no server needed
open web/index.html   # uses mock data

# CLI
btc-privacy-check --psbt <base64>
btc-privacy-check --rawtx <hex>
btc-privacy-check --txid <txid>
btc-privacy-check --psbt <b64> --import-sparrow sparrow-labels.json
btc-privacy-check --psbt <b64> --fail-below 60   # exits 1 if score < threshold
btc-privacy-check --psbt <b64> --json

# Tests
pytest                                                                          # all
pytest tests/test_labels.py                                                     # single file
pytest tests/test_heuristics.py::TestH2RoundAmount::test_fires_on_round_output # single test
pytest --cov=scorer                                                             # with coverage
```

## Architecture

The project is three layers over a shared `scorer/` library:

```
scorer/          ← standalone Python library (importable by wallets)
  __init__.py    ← public API: score(input_str) → Report, import_labels(path) → int
  report.py      ← data models: Severity enum, Finding dataclass, Report dataclass
  parser.py      ← dispatch: base64 PSBT → _parse_psbt, hex → _parse_rawtx, 64-char hex → txid lookup
  lookup.py      ← mempool.space REST wrapper with in-process dict cache; used by H3, H4
  labels.py      ← SQLite store at ~/.utxo-privacy-scorer/labels.db; Sparrow JSON import
  heuristics/    ← one module per heuristic, all share the same signature:
    __init__.py  ←   check(tx, psbt_meta) → Finding | None
                 ←   ALL list drives the engine in scorer/__init__.py
cli.py           ← argparse + rich; calls scorer.score(), renders coloured output
api/main.py      ← FastAPI; POST /score, GET/POST /labels, POST /labels/import
web/index.html   ← single-file vanilla HTML/CSS/JS frontend (no build step); spec in FRONTEND.md
```

### Scoring engine (scorer/\_\_init\_\_.py)

`score(input_str)` calls `parse()`, then runs every module in `heuristics.ALL` and collects `Finding` objects. Raw score = `100 - sum(weights)`. If H8 fired (tainted UTXO), the final score is additionally capped at 40 regardless of other findings.

### Heuristic contract

Every heuristic is a pure function `check(tx, psbt_meta) → Finding | None`. Adding a new heuristic means: create `scorer/heuristics/hN_name.py`, implement `check()`, append the module to `ALL` in `scorer/heuristics/__init__.py`. No other changes needed.

### H8 override behaviour

H8 (`h8_tainted_label.py`) is special: it is still weighted like the others (weight=25) but the engine in `scorer/__init__.py` imposes a hard cap of 40 on the final score when H8 fires. The cap is defined as `_H8_SCORE_CAP = 40` at the top of `scorer/__init__.py`.

### Label store

`labels.py` manages a local SQLite file. The `tag` field drives scoring: `tainted` triggers H8; `coinjoin` is intended to suppress H5 (not yet implemented in H5); `clean` and `unknown` are informational. Import sources: Sparrow JSON (`{"txid:vout": "label string"}`), manual via CLI/API.

### Frontend

`web/index.html` is a self-contained demo with hardcoded mock data — no backend required to open it directly in a browser. The `FRONTEND.md` file is the authoritative design spec (colour tokens, layout, component behaviour).

When the FastAPI server is running, `api/main.py` serves `index.html` at `GET /` and exposes the API at `/score`, `/labels`, and `/labels/import`. The frontend uses `fetch('/score', ...)` and falls back to the mock data automatically if the backend is unreachable (e.g. opened as a local file). API routes are registered before the static mount so they are never shadowed.

### Key dependencies

- `python-bitcoinlib` — raw tx parsing
- `bitcointx` — PSBT parsing (to be wired into `parser.py`)
- `requests` — mempool.space lookups in `lookup.py`
- `rich` — coloured CLI output
- `fastapi` + `uvicorn` — web API

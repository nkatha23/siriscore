UTXO Privacy Scorer — Product Requirements & Implementation Reference

Problem Statement
Bitcoin transactions are permanent and public. Every decision made during transaction construction — which UTXOs to spend, what script type to use for change, whether to reuse an address — leaves fingerprints that chain analysis firms exploit after broadcast. The user has no feedback loop during construction. By the time a privacy mistake is visible (post-broadcast, on-chain forever), it cannot be undone.
The specific gap: every privacy analysis tool in the ecosystem operates post-broadcast. There is no tool that intercepts the transaction at PSBT stage, before signing, and tells the user exactly how identifiable their transaction is and how to fix it. This tool fills that gap.

Solution
A pre-broadcast Bitcoin transaction privacy scorer. It accepts a PSBT (BIP-174 / BIP-370) or raw transaction hex, runs a deterministic set of chain analysis heuristics against it, and returns a structured privacy report with a score, per-finding breakdown, severity levels, and actionable suggestions — before the user signs or broadcasts.
The scorer is built in three layers:
A standalone Python library (utxo-privacy-scorer) that any wallet can import
A CLI for developer and power-user access
A web UI for demo, education, and accessibility

Use Cases
Use case 1 — Individual user, pre-broadcast check A user in Sparrow Wallet has constructed a transaction. Before broadcasting, they export the PSBT and run it through the scorer. They see their change output is a different script type than their inputs. They go back to Sparrow, fix the coin selection, rescore. Score improves. They broadcast.
Use case 2 — Developer integrating privacy feedback into a wallet A wallet developer wants to add privacy warnings to their transaction construction UI. They import utxo-privacy-scorer as a Python dependency, pass the PSBT object through the score() function, and render the returned findings in their UI. They do not build any heuristic logic themselves.
Use case 3 — Hardware wallet user with labelled UTXOs A user has labelled their UTXOs over time: "Binance withdrawal", "coinjoin output", "doxxed — used at KYC exchange". They export labels from Sparrow Wallet (JSON format). They import those labels into the scorer. Now when any of those UTXOs appear in a PSBT being scored, the label surfaces automatically in the report. The tool remembers their coin history for them.
Use case 4 — Educational / conference demo A Bitcoin educator pastes a real transaction (historical or constructed) into the web UI and walks an audience through the privacy report finding by finding. The score and colour-coded severity levels make the explanation immediate and visual.
Use case 5 — Automated CI check for wallet projects A wallet project adds the CLI to their test suite. Any transaction constructed by their automated tests is piped through btc-privacy-check --psbt <b64> --fail-below 60. If the score is below 60, the test fails. Privacy regression is caught before release.

BIPs in scope
BIP
Role
BIP-174
Primary input format — PSBT v0 parsing
BIP-370
PSBT v2 parsing
BIP-141
SegWit script type identification (P2WPKH, P2WSH)
BIP-341
Taproot identification (P2TR)
BIP-352
Referenced as recommendation when address reuse detected
BIP-69
Input/output ordering compliance check
BIP-21
URI parsing if PSBT is delivered via payment URI


Heuristics engine
Each heuristic is a pure function: takes a parsed transaction object, returns a Finding or None. They are independently testable and independently weighted.
ID
Heuristic
Severity
Weight
H1
Script type mismatch between inputs and change output
Critical
25
H2
Round payment amount (change identifiable by elimination)
Warning
15
H3
Address reuse on any input
Critical
20
H4
UTXO age clustering (all inputs within narrow block range)
Warning
10
H5
High input count consolidation (CIOH signal)
Warning
10
H6
Dust input present (potential dust attack spend)
Warning
10
H7
Non-BIP69 input/output ordering
Info
5
H8
Labelled tainted UTXO present in inputs
Critical
25 (override)

Score = 100 minus the sum of weights of triggered heuristics, floored at 0. H8 is an override — if a tainted-labelled UTXO is present, maximum score is 40 regardless of other findings, because the user is knowingly spending a coin with known provenance.

Label system
Directly inspired by KYCC's approach to coin history context.
Each label record:
{
  "txid": "abc123...",
  "vout": 0,
  "label": "Binance withdrawal March 2024",
  "tag": "tainted",         // clean | tainted | coinjoin | unknown
  "added_at": "2024-03-15T10:22:00Z",
  "source": "user"          // user | sparrow_import | kycc_import
}

Tags drive scoring behaviour: tainted triggers H8. coinjoin suppresses H5 (CIOH — expected for coinjoin outputs). clean is informational only.
Import sources supported at launch: Sparrow Wallet JSON export, manual entry, KYCC export (if available). Storage is local SQLite, no server.

Roadmap

Phase 1 — Core library (Day 1, hours 0–8)
Goal: a working Python library that parses a PSBT and returns a privacy score.
1.1 — Project scaffold
utxo-privacy-scorer/
├── scorer/
│   ├── __init__.py
│   ├── parser.py        # PSBT + raw tx parsing
│   ├── heuristics/
│   │   ├── __init__.py
│   │   ├── h1_script_mismatch.py
│   │   ├── h2_round_amount.py
│   │   ├── h3_address_reuse.py
│   │   ├── h4_utxo_age.py
│   │   ├── h5_consolidation.py
│   │   ├── h6_dust.py
│   │   ├── h7_bip69.py
│   │   └── h8_tainted_label.py
│   ├── labels.py        # SQLite label store
│   ├── lookup.py        # mempool.space API wrapper
│   └── report.py        # Finding, Report, score calculation
├── cli.py
├── tests/
├── pyproject.toml
└── README.md

1.2 — Core data models
# report.py

from dataclasses import dataclass
from typing import List, Optional
from enum import Enum

class Severity(Enum):
    CRITICAL = "critical"
    WARNING  = "warning"
    INFO     = "info"

@dataclass
class Finding:
    heuristic_id: str        # "H1", "H2", etc.
    severity: Severity
    title: str
    detail: str              # human-readable explanation
    suggestion: str          # actionable fix
    weight: int              # points deducted

@dataclass
class Report:
    score: int               # 0–100
    findings: List[Finding]
    input_count: int
    output_count: int
    psbt_version: int        # 0 or 2
    warnings: List[str]      # parse-level warnings, not heuristic findings

1.3 — Parser
Use python-bitcoinlib for raw tx parsing and bitcointx for PSBT. Accept:
PSBT base64 string
Raw hex string
txid (fetches raw hex from mempool.space)
1.4 — Each heuristic as isolated module
Example for H1:
# heuristics/h1_script_mismatch.py

from scorer.report import Finding, Severity

def check(tx, psbt_meta) -> Finding | None:
    input_types  = {classify_script(i.script_pubkey) for i in tx.inputs}
    output_types = {classify_script(o.script_pubkey) for o in tx.outputs}

    if len(input_types) == 1 and output_types - input_types:
        mismatched = output_types - input_types
        return Finding(
            heuristic_id="H1",
            severity=Severity.CRITICAL,
            title="Script type mismatch",
            detail=f"Inputs are {list(input_types)[0]}. "
                   f"Output(s) use {mismatched}. "
                   f"Change output is trivially identifiable.",
            suggestion="Ensure all outputs use the same script type as inputs, "
                       "or match the recipient's script type.",
            weight=25
        )
    return None

Every heuristic follows this exact signature. The engine in __init__.py calls all of them, collects findings, computes score.
1.5 — mempool.space lookup wrapper
# lookup.py

import requests, time

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
    # used by H3 — address reuse check
    r = requests.get(f"{BASE}/address/{address}/txs", timeout=10)
    r.raise_for_status()
    return r.json()

def get_utxo_block_height(txid: str) -> int | None:
    tx = get_tx(txid)
    return tx.get("status", {}).get("block_height")

Rate-limit: add time.sleep(0.2) between calls. For the demo, pre-cache lookups for the demo transaction so there is no live latency.
1.6 — Label store
# labels.py

import sqlite3, json
from pathlib import Path

DB_PATH = Path.home() / ".utxo-privacy-scorer" / "labels.db"

def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS labels (
            txid TEXT, vout INTEGER, label TEXT,
            tag TEXT DEFAULT 'unknown',
            added_at TEXT, source TEXT,
            PRIMARY KEY (txid, vout)
        )
    """)
    con.commit()
    con.close()

def get_label(txid: str, vout: int) -> dict | None:
    con = sqlite3.connect(DB_PATH)
    row = con.execute(
        "SELECT * FROM labels WHERE txid=? AND vout=?", (txid, vout)
    ).fetchone()
    con.close()
    return dict(zip(["txid","vout","label","tag","added_at","source"], row)) if row else None

def import_sparrow(json_path: str):
    # Sparrow exports labels as {"txid:vout": "label string"}
    with open(json_path) as f:
        data = json.load(f)
    con = sqlite3.connect(DB_PATH)
    for key, label in data.items():
        txid, vout = key.rsplit(":", 1)
        con.execute(
            "INSERT OR REPLACE INTO labels VALUES (?,?,?,?,datetime('now'),'sparrow')",
            (txid, int(vout), label, "unknown")
        )
    con.commit()
    con.close()

Phase 1 exit criteria: scorer.score(psbt_b64) returns a Report object with correct findings for a set of prepared test PSBTs covering all 8 heuristics. Unit tests pass.

Phase 2 — CLI (Day 1, hours 8–10)
Goal: btc-privacy-check command usable from terminal with coloured output.
btc-privacy-check --psbt <base64>
btc-privacy-check --rawtx <hex>
btc-privacy-check --txid <txid>
btc-privacy-check --psbt <b64> --labels ~/.utxo-privacy-scorer/labels.db
btc-privacy-check --psbt <b64> --import-sparrow sparrow-labels.json
btc-privacy-check --psbt <b64> --fail-below 60   # exit code 1 if score < 60
btc-privacy-check --psbt <b64> --json            # machine-readable output

Output format (terminal):
Privacy Score: 34 / 100  [POOR]

CRITICAL  H1  Script type mismatch
          Inputs are P2WPKH. One output is P2PKH. Change is identifiable.
          Fix: use P2WPKH for all outputs.

CRITICAL  H3  Address reuse
          Input tb1q... was previously used as a receiving address in 3 txs.
          Fix: never reuse addresses. Generate a fresh address per receive.

WARNING   H2  Round payment amount
          Output 0 is exactly 1,000,000 sats. Change output identifiable by elimination.
          Fix: coordinate with recipient or adjust fee to produce non-round amount.

INFO      H7  Non-BIP69 ordering
          Input/output ordering is not lexicographic. Minor wallet fingerprint.
          Fix: implement BIP-69 ordering before signing.

Use rich library for coloured terminal output. CRITICAL in red, WARNING in yellow, INFO in blue.
Phase 2 exit criteria: CLI works end-to-end on all three input types. --json flag produces parseable JSON for piping into other tools.

Phase 3 — Web UI (Day 1, hours 10–16)
Goal: paste a PSBT or raw hex into a browser, see a privacy report. This is the demo interface.
Stack: FastAPI backend, single HTML/CSS/JS frontend, no framework.
Backend routes:
POST /score
  body: { "input": "<psbt_b64 or hex>", "input_type": "psbt|rawtx|txid" }
  returns: Report as JSON

POST /labels/import
  body: Sparrow JSON file upload
  returns: { "imported": N }

GET  /labels
  returns: all stored labels

POST /labels
  body: { "txid": "...", "vout": 0, "label": "...", "tag": "tainted" }
  returns: created label

Frontend behaviour:
Single page. Text area for PSBT/hex input. Score button. Results render below without page reload. Score displayed as a large number with colour coding: 0–39 red, 40–69 amber, 70–100 green. Each finding is a collapsible card: severity badge, title, detail text, suggestion. Labels panel on the side: import Sparrow JSON, view stored labels, add manual label.
No user accounts. No server-side persistence. The label store lives on the server's local SQLite only for the duration of the demo session. In production use, the library is local.
Phase 3 exit criteria: full demo loop works in browser. Paste prepared PSBT, see poor score, open findings, understand fixes.

Phase 4 — Packaging as library (Day 2, hours 0–4)
Goal: pip install utxo-privacy-scorer works. A wallet developer can import the library and call score() in three lines.
pyproject.toml (key fields):
[project]
name = "utxo-privacy-scorer"
version = "0.1.0"
description = "Pre-broadcast Bitcoin transaction privacy scorer"
dependencies = [
    "python-bitcoinlib>=0.12",
    "requests>=2.28",
    "rich>=13.0",
]

[project.scripts]
btc-privacy-check = "scorer.cli:main"

Public API surface (what wallet developers use):
from utxo_privacy_scorer import score, import_labels

# Minimal usage
report = score("cHNidP8BA...")   # base64 PSBT
print(report.score)              # 34
print(report.findings)           # list of Finding objects

# With labels
import_labels("sparrow-labels.json", source="sparrow")
report = score("cHNidP8BA...")   # H8 now fires if tainted UTXO present

# Access individual findings
for f in report.findings:
    print(f.heuristic_id, f.severity.value, f.title)
    print(f"  {f.detail}")
    print(f"  Fix: {f.suggestion}")

That is the entire public API. One function, one return type. Everything else is internal.
Phase 4 exit criteria: library installable via pip install . from the repo. Import works in a clean virtualenv. All 8 heuristics fire correctly on test vectors.

Phase 5 — Sparrow Wallet integration test (Day 2, hours 4–8)
Goal: demonstrate the library working against real PSBTs exported from Sparrow Wallet. This is the validation that the library is practically useful, not just theoretically correct.
Steps:
In Sparrow, create a watch-only wallet on testnet or signet.
Receive funds to several addresses — deliberately reuse one.
Construct a transaction in Sparrow with mixed script type outputs and a round payment amount.
Before signing: File → Export PSBT → save as base64.
Run: btc-privacy-check --psbt <exported_b64>
Observe: H1 (script mismatch), H2 (round amount), H3 (address reuse) should all fire.
Export Sparrow's label file: Wallet → Labels → Export.
Run: btc-privacy-check --psbt <exported_b64> --import-sparrow sparrow-labels.json
Observe: H8 fires for any labelled UTXO tagged as tainted in Sparrow.
Document exact Sparrow version, PSBT, and output. This becomes the demo script for the presentation.
This is also the integration test. If the library parses Sparrow's PSBT output correctly and the label import round-trips cleanly, the library is Sparrow-compatible by demonstration.
Phase 5 exit criteria: documented end-to-end test with real Sparrow PSBT, all relevant heuristics firing, label import working. Screen recording of the demo loop captured for the presentation.

Phase 6 — Hackathon submission and presentation (Day 2, hours 8–12)
Devpost write-up covers:
The problem (one paragraph, no jargon)
The demo GIF or video clip (paste PSBT → score 34 → fix → score 81)
The library API (three lines of code)
The Sparrow integration test result
The roadmap to production (silent payments recommendation, Payjoin v2 detection, hardware wallet PSBT flow)
Presentation structure (5 minutes):
The problem — one sentence: "You can't unsend a Bitcoin transaction, but every wallet lets you build a private one without telling you how private it actually is."
Live demo — paste the prepared PSBT into the web UI. Score 34. Walk through two findings. Fix one live if time allows.
The library — show the three-line import. "Any wallet developer can add this in an afternoon."
Sparrow validation — show the label import working. Connect to KYCC: "coin history travels forward into construction decisions."
What's next — silent payments recommendation, Payjoin v2 detection.

Future roadmap (post-hackathon)
v0.2 — Silent payments recommendation When H3 (address reuse) fires, instead of just flagging it, detect whether the recipient supports silent payments (BIP-352 static address format). If so, recommend switching to a silent payment instead of a regular address. Address reuse becomes optional rather than inevitable.
v0.3 — Payjoin v2 detection and suggestion Detect when a transaction would benefit from Payjoin (BIP-77). If the payment destination has a BIP-77 endpoint in their BIP-21 URI, suggest initiating a Payjoin instead. Payjoin breaks the CIOH assumption entirely.
v0.4 — Hardware wallet PSBT flow Direct integration with SeedSigner and Coldcard PSBT export formats. Both use slightly different PSBT packaging — Coldcard uses a .psbt file, SeedSigner encodes in QR. Add file and QR input modes to the web UI.
v0.5 — Wallet plugin architecture Define a plugin interface so wallet projects can register the scorer as a pre-sign hook. Sparrow (Java), Specter (Python), and BTCPay Server (C#) each get a thin wrapper calling the scorer's API. The heuristic engine stays in one place; the UI integration is per-wallet.
v1.0 — Production library Full test coverage. Mainnet-safe (no accidental broadcast). Published to PyPI. Documented integration guide for wallet developers. MIT licensed.


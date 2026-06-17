This came out really well — the design spec translated almost perfectly. The score gauge, finding cards with left border severity colours, coin labels with tainted/coinjoin/clean tags, and the "What to do next" footer are all exactly right.

Here is the Claude Code prompt:

---

```markdown
# SiriScore — Frontend Implementation

## Context
Build the complete frontend for SiriScore, a Bitcoin transaction privacy scorer.
The UI is already designed and validated. Implement it exactly as specified below.
Reference screenshots show the target output — match them precisely.

## Tech stack
- Vanilla HTML, CSS, JavaScript — single `index.html` file
- No frameworks, no build step
- Font: Inter (Google Fonts), JetBrains Mono (Google Fonts) for monospace
- Must be fully self-contained and downloadable as a single file

## Colour tokens (use as CSS variables)
```css
:root {
  --bg:           #F9F7F4;
  --surface:      #FFFFFF;
  --border:       #E2E8F0;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted:   #94A3B8;

  --orange:       #EA580C;
  --orange-light: #FFF7ED;
  --orange-dark:  #C2410C;

  --green:        #16A34A;
  --green-light:  #DCFCE7;

  --red:          #DC2626;
  --red-light:    #FEF2F2;

  --amber:        #D97706;
  --amber-light:  #FFFBEB;

  --slate:        #475569;
  --slate-light:  #F8FAFC;
}
```

## Typography
```css
body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text-primary); }
.mono { font-family: 'JetBrains Mono', monospace; }
```
Weights used: 400, 500, 600 only. Never bold (700).

## Layout
- Max content width: 780px, horizontally centred
- Full-width header bar, fixed at top, height 56px
- Page padding-top: 56px to clear fixed header
- Section vertical spacing: 32px between zones

---

## Header
Fixed top bar. White background. Bottom border 1px var(--border).
Height: 56px. Padding: 0 24px.

Left: SiriScore wordmark.
- Orange filled circle (28px), white lock icon SVG inside
- "Siri" in var(--orange) weight 600 20px + "Score" in var(--text-primary) weight 600 20px
- No space between — "SiriScore" as one word, split by colour only

Right: "Docs" and "GitHub" links. var(--text-secondary) 14px 400.
On hover: var(--orange). Transition 150ms.

---

## Input zone
Padding: 48px 0 32px.

Heading: "Check your transaction" — 20px 600 var(--text-primary)
Subheading: "Paste a PSBT, raw transaction hex, or txid. Your data never leaves your browser."
— 14px 400 var(--text-muted). Margin-top 4px.

### Input type selector (pill tabs)
Three pills: "PSBT", "Raw Tx", "Txid"
- Container: flex row, gap 8px, margin-top 20px
- Inactive pill: white bg, var(--border) border 1px, var(--text-secondary) text,
  border-radius 20px, padding 6px 16px, 14px 500, cursor pointer
- Active pill: var(--orange) bg, white text, no border
- Click toggles active state, updates textarea placeholder

### Textarea
- Margin-top: 12px
- Width: 100%, box-sizing border-box
- Height: 120px, resize: vertical
- Font: JetBrains Mono 13px
- Border: 1px solid var(--border), border-radius 8px
- Padding: 12px
- Background: var(--surface)
- Placeholder colour: var(--text-muted)
- Focus: outline none, border-color var(--orange)
- Placeholders per tab:
  - PSBT: "cHNidP8BAH0CAAAAAbxLLf9+AYfqfF69QAQuETnL..."
  - Raw Tx: "0200000001abc123..."
  - Txid: "a4f1c9d2e3b5a6f7..."

### Analyse button
- Margin-top: 12px, width 100%, height 48px
- Background: var(--orange), color white
- Border-radius: 8px, border: none
- Font: 15px 600
- Cursor: pointer
- Hover: background var(--orange-dark), transition 150ms
- Active: transform scale(0.98)
- Loading state: text becomes "Analysing...", disabled, opacity 0.8

### Import labels link
- Margin-top: 16px
- Small orange tag icon SVG + "Import labels from Sparrow Wallet"
- var(--orange) 13px 500, cursor pointer
- Click: triggers hidden file input (accept .json)
- No visible file input element

---

## Results zone
Hidden on load. Appears after scoring with opacity transition 0→1 over 200ms.

### Score card
White surface, border-radius 12px, border 1px var(--border), padding 32px.
Two-column flex layout. Left: 180px fixed. Right: flex 1.

#### Left column — score display
Score number: 64px 600.
Colour rules:
- 70–100: var(--green)
- 40–69: var(--amber)
- 0–39: var(--red)

Below number: "Privacy Score" — 12px 400 var(--text-muted), margin-top 4px.
Below that: verdict pill — "Good" / "Fair" / "Poor"
- Pill: border-radius 12px, padding 2px 10px, 13px 500
- Good: var(--green-light) bg, var(--green) text
- Fair: var(--amber-light) bg, var(--amber) text
- Poor: var(--red-light) bg, var(--red) text

#### Right column — gauge + metadata
Gauge bar: height 8px, border-radius 4px, width 100%.
Built as three adjacent segments:
- 0–39% width (39/100): var(--red) background
- 40–69% width (30/100): var(--amber) background
- 70–100% width (31/100): var(--green) background
All three in a flex row with no gap.

Score indicator dot: 12px circle, white fill, 2px solid border in score colour.
Position: absolute, on the gauge bar at left% = score value.
Translate: -50% horizontal to centre on position.
Wrap gauge in position:relative div.

Metadata chips: flex row, gap 8px, margin-top 16px.
Each chip: var(--slate-light) bg, var(--border) border 1px, border-radius 12px,
padding 3px 10px, 12px 400 var(--text-secondary).
Display: "N inputs", "N outputs", "PSBT v0" or "PSBT v2".

---

### Findings section
Margin-top: 32px.

Header row: flex, align-items center, gap 10px.
- "Findings" — 20px 600 var(--text-primary)
- Count badge: "N issues" — var(--orange) bg, white text, 12px 500,
  border-radius 12px, padding 2px 10px

Each finding card:
- White bg, border-radius 8px
- Left border: 3px solid (red for critical, amber for warning, slate-300 for info)
- Other borders: 1px solid var(--border)
- Padding: 16px 20px
- Margin-bottom: 8px

Finding card internal layout (top to bottom):

Row 1: flex space-between
- Left: severity badge pill (11px 500)
  - Critical: var(--red-light) bg, var(--red) text
  - Warning: var(--amber-light) bg, var(--amber) text
  - Info: var(--slate-light) bg, var(--slate) text
  Padding: 2px 8px, border-radius 10px
- Right: heuristic ID — JetBrains Mono 11px var(--text-muted). E.g. "H1"

Row 2: finding title — 15px 600 var(--text-primary), margin-top 8px

Row 3: detail text — 14px 400 var(--text-secondary), margin-top 4px, line-height 1.6

Row 4: suggestion — margin-top 8px
- "→ " + suggestion text — 13px 500 var(--orange)
- The arrow is a literal → character, not an icon

---

### Coin labels section
Margin-top: 32px.
Section heading: "Coin labels" — 20px 600 var(--text-primary).
Only render this section if labels array is non-empty.

Each label row:
- White bg, border-radius 8px, border 1px var(--border)
- Padding: 12px 16px, margin-bottom 6px
- Flex row, align-items center

Row layout:
- Left: small orange tag icon SVG (14px)
- UTXO identifier: JetBrains Mono 12px var(--text-secondary), margin-left 8px
  Format: first 8 chars + "…" + last 4 chars of txid + ":" + vout
  E.g. "a4f1c9d2…a5b6:0"
- Label text: 13px 500 var(--text-primary), margin-left 12px, flex 1
- Tag pill right-aligned: 12px 500, border-radius 10px, padding 2px 8px
  - tainted: var(--red-light) bg, var(--red) text
  - coinjoin: var(--green-light) bg, var(--green) text
  - clean: var(--green-light) bg, var(--green) text
  - unknown: var(--slate-light) bg, var(--slate) text

If a label has tag "tainted" AND that UTXO is in the transaction inputs:
- Card background: var(--orange-light) instead of white
- Below the row: "This UTXO is flagged as tainted and is included in your
  transaction inputs." — 12px 400 var(--text-secondary), margin-top 4px

---

### What to do next card
Margin-top: 24px.
Background: var(--orange-light), left border 3px solid var(--orange),
other borders none, border-radius 8px, padding 16px 20px.

"What to do next" — 14px 600 var(--text-primary)
Numbered list below: ol with margin-top 8px.
Each item: 13px 400 var(--text-secondary), line-height 1.7.
Pull items from critical findings suggestions first, then warnings. Max 3 items.

---

## Mock data for demo
Hardcode this result object. The "Analyse Transaction" button uses it after a
700ms fake delay (simulates API call) rather than making a real network request.
This makes the demo work offline with no backend.

```javascript
const MOCK_RESULT = {
  score: 34,
  psbt_version: 2,
  input_count: 3,
  output_count: 2,
  findings: [
    {
      id: "H1",
      severity: "critical",
      title: "Script type mismatch",
      detail: "Your inputs use P2WPKH but at least one output is P2TR. Mixing script types makes your change output trivially identifiable to a chain analyst.",
      suggestion: "Send change to the same script type as your inputs (P2WPKH)."
    },
    {
      id: "H3",
      severity: "warning",
      title: "Round-number payment amount",
      detail: "Output #1 pays exactly 0.05000000 BTC. Round numbers strongly suggest the human-entered amount, which reveals which output is the payment and which is change.",
      suggestion: "Add a small random offset to the payment amount when possible."
    },
    {
      id: "H5",
      severity: "info",
      title: "Non-standard nLockTime",
      detail: "nLockTime is set to 0. Most wallets set it to the current block height as an anti-fee-sniping measure. The absence is a wallet fingerprint.",
      suggestion: "Use a wallet that sets nLockTime to the current tip height."
    }
  ],
  labels: [
    {
      txid: "a4f1c9d2e3b5a6f7890abc12",
      vout: 0,
      short_id: "a4f1c9d2…a5b6:0",
      label: "Kraken withdrawal",
      tag: "tainted",
      in_inputs: true
    },
    {
      txid: "9c8b7a6d5e4f3a2b1c0d9e8f",
      vout: 1,
      short_id: "9c8b7a6d…0493:1",
      label: "Whirlpool 0.01 pool",
      tag: "coinjoin",
      in_inputs: false
    },
    {
      txid: "11223344556677889900aabb",
      vout: 2,
      short_id: "11223344…5566:2",
      label: "Self-transfer cold storage",
      tag: "clean",
      in_inputs: false
    }
  ]
};
```

Also add a second mock for a high-scoring transaction (score 96) that fires
when the user pastes anything starting with "cHNidP8" (PSBT prefix):

```javascript
const MOCK_GOOD = {
  score: 96,
  psbt_version: 2,
  input_count: 3,
  output_count: 2,
  findings: [
    {
      id: "H1",
      severity: "critical",
      title: "Script type mismatch",
      detail: "Your inputs use P2WPKH but at least one output is P2TR.",
      suggestion: "Send change to the same script type as your inputs (P2WPKH)."
    }
  ],
  labels: []
};
```

Logic: if input starts with "cHNidP8" → use MOCK_GOOD, else → use MOCK_RESULT.
Both triggered only when input is non-empty on button click.

---

## Download button
After results render, show a "Download report" button below the "What to do next" card.
- Style: outlined, var(--orange) border 1px, var(--orange) text, white bg
- Hover: var(--orange-light) bg
- Border-radius 8px, padding 10px 20px, 14px 500
- On click: generate a plain-text report and trigger browser download as
  `siriscore-report.txt`

Report format:
```
SiriScore Privacy Report
========================
Score: {score}/100 ({verdict})
Inputs: {n} | Outputs: {n} | {psbt_version}
Generated: {datetime}

FINDINGS
--------
[{severity}] {id} — {title}
{detail}
Fix: {suggestion}

(repeat for each finding)

COIN LABELS
-----------
{short_id}  {label}  [{tag}]
(repeat for each label)

WHAT TO DO NEXT
---------------
1. {suggestion from finding 1}
2. {suggestion from finding 2}
3. {suggestion from finding 3}
```

---

## Error state
If button clicked with empty input:
- Red banner between input zone and results: var(--red-light) bg,
  var(--red) left border 3px, padding 12px 16px, border-radius 8px
- Text: "Please paste a PSBT, raw transaction hex, or txid before analysing."
  13px var(--red)
- Banner disappears when user starts typing in the textarea

---

## Deliverable
Single `index.html` file. All CSS in a `<style>` tag in `<head>`.
All JavaScript in a `<script>` tag before `</body>`.
No external dependencies except Google Fonts (Inter + JetBrains Mono via @import).
File must open correctly in a browser by double-clicking — no server required.
```

---

One thing to flag: the score shows 96 in image 2 even though there are 3 findings including a critical. That is the mock data behaviour — the two mocks are intentionally separate (one for the PSBT prefix, one for everything else) so you can demonstrate both a good and a poor score during the presentation. You can adjust the threshold logic or the scores once the real scoring engine is wired up.
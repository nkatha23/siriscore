// ── Mock data ───────────────────────────────────────────────
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

// ── State ────────────────────────────────────────────────────
let activeTab = 'psbt';
let currentReport = null;

const PLACEHOLDERS = {
  psbt:  'cHNidP8BAH0CAAAAAbxLLf9+AYfqfF69QAQuETnL…',
  rawtx: '0200000001abc123…',
  txid:  'a4f1c9d2e3b5a6f7…'
};

const CAPTION_LOOKUP    = 'Input addresses are looked up via mempool.space. Your PSBT is never transmitted.';
const CAPTION_NO_LOOKUP = 'Network checks disabled. No data leaves your machine.';

// ── DOM refs ─────────────────────────────────────────────────
const txInput        = document.getElementById('tx-input');
const btnAnalyse     = document.getElementById('btn-analyse');
const errorBanner    = document.getElementById('error-banner');
const resultsZone    = document.getElementById('results-zone');
const scoreNumber    = document.getElementById('score-number');
const verdictPill    = document.getElementById('verdict-pill');
const gaugeDot       = document.getElementById('gauge-dot');
const metaChips      = document.getElementById('meta-chips');
const findingsCount  = document.getElementById('findings-count');
const findingsList   = document.getElementById('findings-list');
const checksCount    = document.getElementById('checks-count');
const checksList     = document.getElementById('checks-list');
const labelsSection  = document.getElementById('labels-section');
const labelsList     = document.getElementById('labels-list');
const nextList       = document.getElementById('next-list');
const btnDownload    = document.getElementById('btn-download');
const fileInput      = document.getElementById('file-input');
const networkCheckbox = document.getElementById('network-checks');
const privacyCaption  = document.getElementById('privacy-caption');

// ── Caption ──────────────────────────────────────────────────
function updateCaption() {
  privacyCaption.textContent = networkCheckbox.checked ? CAPTION_LOOKUP : CAPTION_NO_LOOKUP;
}
networkCheckbox.addEventListener('change', updateCaption);
updateCaption();

// ── Pill tabs ────────────────────────────────────────────────
document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeTab = pill.dataset.tab;
    txInput.placeholder = PLACEHOLDERS[activeTab];
  });
});

// ── Hide error banner on input ────────────────────────────────
txInput.addEventListener('input', () => {
  errorBanner.style.display = 'none';
});

// ── Import labels ─────────────────────────────────────────────
document.getElementById('import-labels-btn').addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/labels/import', { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      alert(`Imported ${data.imported} label(s) from ${file.name}`);
    }
  } catch (_) {
    alert(`Labels file "${file.name}" selected. Connect the API server to persist labels.`);
  }
  fileInput.value = '';
});

// ── Analyse ───────────────────────────────────────────────────
btnAnalyse.addEventListener('click', async () => {
  const lookup = networkCheckbox.checked;
  const value  = txInput.value.trim();
  errorBanner.style.display = 'none';
  currentReport = null;
  resultsZone.classList.remove('visible');

  if (!value) {
    errorBanner.textContent = 'Please paste a PSBT, raw transaction hex, or txid before analysing.';
    errorBanner.style.display = 'block';
    return;
  }

  btnAnalyse.disabled    = true;
  btnAnalyse.textContent = 'Analysing…';

  let report;
  try {
    report = await fetchScore(value, activeTab, lookup);
  } catch (err) {
    btnAnalyse.disabled    = false;
    btnAnalyse.textContent = 'Analyse Transaction';
    errorBanner.textContent = 'Error: ' + err.message;
    errorBanner.style.display = 'block';
    return;
  }

  btnAnalyse.disabled    = false;
  btnAnalyse.textContent = 'Analyse Transaction';
  currentReport = report;
  renderReport(report);
});

// ── Fetch ─────────────────────────────────────────────────────
async function fetchScore(value, inputType, lookup) {
  validateInput(value, inputType);

  try {
    const res = await fetch('/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: value, input_type: inputType, lookup }),
      signal: AbortSignal.timeout(30000)
    });
    if (res.ok) return await res.json();
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'The backend could not parse this input.');
  } catch (err) {
    const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
    const backendUnavailable = timedOut || err.message === 'Failed to fetch';
    if (!backendUnavailable || window.location.protocol !== 'file:') {
      if (timedOut) throw new Error('The backend took too long. Please try again.');
      throw err;
    }
  }

  // Offline mock
  await delay(700);
  return value.startsWith('cHNidP8') ? MOCK_GOOD : MOCK_RESULT;
}

function validateInput(value, inputType) {
  if (inputType === 'txid' && !/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error('Invalid txid. Expected 64 hexadecimal characters.');
  }
  if (inputType === 'rawtx' && (!/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0)) {
    throw new Error('Invalid raw transaction hex.');
  }
  if (inputType === 'psbt') {
    try {
      const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
      const ok = bytes.length >= 5
        && bytes[0] === 0x70 && bytes[1] === 0x73
        && bytes[2] === 0x62 && bytes[3] === 0x74
        && bytes[4] === 0xff;
      if (!ok) throw new Error();
    } catch (_) {
      throw new Error('Invalid PSBT. Expected base64 PSBT data.');
    }
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Render ────────────────────────────────────────────────────
function renderReport(report) {
  const { score, findings, checks, labels, input_count, output_count, psbt_version } = report;

  const { label: vLabel, cls: vCls, colour: vColour } = verdictFor(score);
  scoreNumber.textContent   = score;
  scoreNumber.style.color   = vColour;
  verdictPill.textContent   = vLabel;
  verdictPill.className     = 'verdict-pill verdict-' + vCls;
  gaugeDot.style.left       = score + '%';
  gaugeDot.style.borderColor = vColour;

  metaChips.innerHTML = [
    chip(input_count  + ' input'  + (input_count  !== 1 ? 's' : '')),
    chip(output_count + ' output' + (output_count !== 1 ? 's' : '')),
    chip('PSBT v' + psbt_version)
  ].join('');

  const orderedFindings = sortFindings(findings);
  findingsCount.textContent = findings.length + ' issue' + (findings.length !== 1 ? 's' : '');
  findingsList.innerHTML = orderedFindings.length > 0
    ? orderedFindings.map(renderFinding).join('')
    : '<div class="no-findings">No issues found</div>';

  const orderedChecks = sortChecks(checks || checksFromFindings(findings));
  checksCount.textContent = orderedChecks.length + ' checks';
  checksList.innerHTML = orderedChecks.map(renderCheck).join('');

  if (labels && labels.length > 0) {
    labelsSection.style.display = 'block';
    labelsList.innerHTML = labels.map(renderLabel).join('');
  } else {
    labelsSection.style.display = 'none';
  }

  nextList.innerHTML = orderedFindings.slice(0, 3)
    .map(f => `<li>${escHtml(f.suggestion)}</li>`)
    .join('') || '<li>No immediate action needed.</li>';

  resultsZone.classList.add('visible');
  resultsZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function verdictFor(score) {
  if (score >= 70) return { label: 'Good', cls: 'good', colour: 'var(--green)' };
  if (score >= 40) return { label: 'Fair', cls: 'fair', colour: 'var(--amber)' };
  return               { label: 'Poor', cls: 'poor', colour: 'var(--red)'   };
}

function chip(text) {
  return `<span class="chip">${escHtml(text)}</span>`;
}

function sortFindings(findings) {
  const rank = { critical: 0, warning: 1, info: 2 };
  return [...findings].sort((a, b) => {
    const d = (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3);
    return d || String(a.id).localeCompare(String(b.id));
  });
}

function sortChecks(checks) {
  const sr = { fail: 0, unavailable: 1, skipped: 2, pass: 3 };
  const sv = { critical: 0, warning: 1, info: 2 };
  return [...checks].sort((a, b) => {
    const d = (sr[a.status] ?? 4) - (sr[b.status] ?? 4);
    if (d) return d;
    const e = (sv[a.severity] ?? 3) - (sv[b.severity] ?? 3);
    return e || String(a.id).localeCompare(String(b.id));
  });
}

function checksFromFindings(findings) {
  return findings.map(f => ({ id: f.id, severity: f.severity, title: f.title, status: 'fail', reason: '' }));
}

function renderFinding(f) {
  const sev = f.severity.toLowerCase();
  return `
    <div class="finding-card ${sev}">
      <div class="finding-row1">
        <span class="severity-badge ${sev}">${escHtml(f.severity.toUpperCase())}</span>
        <span class="heuristic-id">${escHtml(f.id)}</span>
      </div>
      <div class="finding-title">${escHtml(f.title)}</div>
      <div class="finding-detail">${escHtml(f.detail)}</div>
      <div class="finding-suggestion">&rarr; ${escHtml(f.suggestion)}</div>
    </div>`;
}

function renderCheck(c) {
  const status = c.status || 'unavailable';
  return `
    <div class="check-row ${escHtml(status)}">
      <span class="check-id">${escHtml(c.id)}</span>
      <div class="check-title">
        <div class="check-name">${escHtml(c.title)}</div>
        ${c.reason ? `<div class="check-reason">${escHtml(c.reason)}</div>` : ''}
      </div>
      <span class="check-status ${escHtml(status)}">${escHtml(status)}</span>
    </div>`;
}

function renderLabel(l) {
  const taintedActive = l.tag === 'tainted' && l.in_inputs;
  return `
    <div class="label-row${taintedActive ? ' tainted-active' : ''}">
      <div class="label-row-inner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--orange)"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        <span class="label-utxo mono">${escHtml(l.short_id || shortId(l.txid, l.vout))}</span>
        <span class="label-text">${escHtml(l.label)}</span>
        <span class="tag-pill ${escHtml(l.tag)}">${escHtml(l.tag)}</span>
      </div>
      ${taintedActive ? `<div class="label-taint-warning">This UTXO is flagged as tainted and is included in your transaction inputs.</div>` : ''}
    </div>`;
}

function shortId(txid, vout) {
  return txid.slice(0, 8) + '…' + txid.slice(-4) + ':' + vout;
}

// ── Download ──────────────────────────────────────────────────
btnDownload.addEventListener('click', () => {
  if (!currentReport) return;
  const r = currentReport;
  const { label: vLabel } = verdictFor(r.score);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  let txt = 'SiriScore Privacy Report\n========================\n';
  txt += `Score: ${r.score}/100 (${vLabel})\n`;
  txt += `Inputs: ${r.input_count} | Outputs: ${r.output_count} | PSBT v${r.psbt_version}\n`;
  txt += `Generated: ${now}\n\n`;

  txt += 'FINDINGS\n--------\n';
  const rf = sortFindings(r.findings);
  if (!rf.length) txt += 'No issues found\n\n';
  for (const f of rf) {
    txt += `[${f.severity.toUpperCase()}] ${f.id} — ${f.title}\n${f.detail}\nFix: ${f.suggestion}\n\n`;
  }

  txt += 'CHECKS\n------\n';
  for (const c of sortChecks(r.checks || checksFromFindings(r.findings))) {
    txt += `[${c.status.toUpperCase()}] ${c.id} — ${c.title}`;
    if (c.reason) txt += ` (${c.reason})`;
    txt += '\n';
  }
  txt += '\n';

  if (r.labels && r.labels.length) {
    txt += 'COIN LABELS\n-----------\n';
    for (const l of r.labels) {
      txt += `${l.short_id || shortId(l.txid, l.vout)}  ${l.label}  [${l.tag}]\n`;
    }
    txt += '\n';
  }

  txt += 'WHAT TO DO NEXT\n---------------\n';
  rf.slice(0, 3).forEach((f, i) => { txt += `${i + 1}. ${f.suggestion}\n`; });
  if (!rf.length) txt += 'No immediate action needed.\n';

  const blob = new Blob([txt], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'siriscore-report.txt'; a.click();
  URL.revokeObjectURL(url);
});

// ── Util ──────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

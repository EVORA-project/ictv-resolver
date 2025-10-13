// ui.js — adapted for TailwindCSS v3 while preserving original behavior
export default function initUI(api) {
  const q = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);
  const isSmallScreen = () => window.matchMedia('(max-width: 1139px)').matches;

  // utils
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  const isUrlLike = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

  function mapDbLink(curie) {
    if (!curie || typeof curie !== 'string') return null;
    const lower = curie.toLowerCase();
    if (lower.startsWith('genbank:') || lower.startsWith('refseq:')) {
      const acc = curie.split(':')[1];
      return `https://www.ncbi.nlm.nih.gov/nuccore/${acc}`;
    }
    return null;
  }

  /* -------------------- Summary/status -------------------- */
  function renderSummary(data) {
    const el = q('summary');
    el.className = 'status block mb-4 text-md font-medium transition duration-300';

    if (data.status === 'not-found') {
      el.classList.add('err');

      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        el.innerHTML = `
          <div class="mb-2 font-semibold text-red-400">
            ❌ No match for <b>"${escapeHtml(data.input)}"</b>.
          </div>
          <div class="text-white text-md mb-1">Did you mean:</div>
          <ul class="space-y-1 pl-4 list-disc text-primary text-md">
            ${data.suggestions
            .map(s => `
                <li>
                  <a href="#" 
                     class="suggestion-link text-primary hover:text-white hover:underline transition-colors" 
                     data-sug="${escapeHtml(s)}">
                     ${escapeHtml(s)}
                  </a>
                </li>
              `).join('')}
          </ul>`;

        el.querySelectorAll('.suggestion-link').forEach(a => {
          a.addEventListener('click', ev => {
            ev.preventDefault();
            const term = a.dataset.sug;
            q('q').value = term;
            onResolve();
          });
        });
      } else {
        el.innerHTML = `❌ No match for <b>${escapeHtml(data.input)}</b>.`;
      }
      return;
    }

    if (data.status === 'current') {
      el.classList.add('ok');
      el.innerHTML = `✅ Current ICTV taxon: <b>${escapeHtml(
        data.current.label
      )}</b> — ${escapeHtml(data.current.ictv_id)} (${escapeHtml(
        data.current.msl
      )})`;
    } else if (data.status === 'obsolete') {
      el.classList.add('warn');
      el.innerHTML = `⚠️ Obsolete in ${escapeHtml(
        data.obsolete.msl
      )}${data.obsolete.obsolescence_reason
          ? ` (Reason: <b>${escapeHtml(data.obsolete.obsolescence_reason)}</b>)`
          : ''
        }`;
    } else if (data.status === 'ok' && data.history) {
      el.classList.add('warn');
      el.innerHTML = `📜 History entries: <b>${data.history.length}</b><br><small><i>Each ICTV MSL release date is available on the <a href="https://ictv.global/taxonomy/history" target="_blank" aria-label="View ICTV release history">ICTV release history page</a></i></small>`;
    } else {
      el.classList.add('ok');
      el.textContent = 'Ready.';
    }
  }

  /* -------------------- Table rendering -------------------- */
  function compactColumns(rows) {
    if (!rows.length) return { cols: [], rows: [] };
    const keys = new Set();
    rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
    const cols = [];
    for (const k of keys) {
      const any = rows.some(r => {
        const v = r[k];
        if (v === null || v === undefined) return false;
        if (typeof v === 'boolean') return v;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return Object.keys(v).length > 0;
        const s = String(v).trim().toLowerCase();
        return s !== '' && s !== 'false' && s !== 'null' && s !== 'undefined';
      });
      if (any) cols.push(k);
    }
    return { cols, rows };
  }

  function formatCell(v, col, row) {
    if (v == null) return '';
    const renderList = arr => `<ul class="space-y-0.5">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;

    if (col === 'label' && row.iri) {
      return `<a href="${row.iri}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(v)}</a>`;
    }
    if (col === 'rank_label' && row.rank_iri) {
      return `<a href="${row.rank_iri}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(v)}</a>`;
    }
    if (col === 'direct_parent_label' && row.direct_parent_iri) {
      return `<a href="${row.direct_parent_iri}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(v)}</a>`;
    }
    if (col === 'ictv_id' && row.iri) {
      return `<a href="${row.iri}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(v)}</a>`;
    }
    if (col === 'ncbi') {
      if (!Array.isArray(v) || v.length === 0) return '';
      const links = v.map(x => {
        const id = x.ncbiCurie || x.id || '';
        const label = x.label || id;
        const taxid = id.replace(/^ncbitaxon:/i, '');
        const url = `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${taxid}`;
        return `<a href="${url}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(label)} (${escapeHtml(id)})</a>`;
      });
      return renderList(links);
    }
    if (col === 'narrow_match') {
      if (!Array.isArray(v) || v.length === 0) return '';
      const links = v.map(x => {
        const text = typeof x.value === 'string' ? x.value : JSON.stringify(x.value);
        const url = x.url || (isUrlLike(text) ? text : null);
        if (url) return `<a href="${url}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(text)}</a>`;
        return escapeHtml(text);
      });
      return renderList(links);
    }
    if (col === 'lineage' && Array.isArray(v)) {
      const ancestors = Array.isArray(row.ancestors_iris) ? [...row.ancestors_iris].reverse() : [];
      const labels = [...v].reverse();
      const parts = labels.map((label, i) => {
        const iri = ancestors[i] || null;
        if (iri && isUrlLike(iri)) {
          return `<a href="${iri}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(label)}</a>`;
        }
        return escapeHtml(label);
      });
      // Append the current taxon label (row.label)
      const currentLabel = row.label
        ? `<span class="font-semibold text-white">${escapeHtml(row.label)}</span>`
        : '';
      return parts.concat(currentLabel).join(' › ');
    }
    if (Array.isArray(v)) {
      if (v.length === 0) return '';
      const links = v.map(x => {
        const dbUrl = mapDbLink(x);
        if (dbUrl) return `<a href="${dbUrl}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(x)}</a>`;
        return escapeHtml(String(x));
      });
      return renderList(links);
    }
    if (typeof v === 'boolean') return v ? 'true' : '';
    if (isUrlLike(v)) return `<a href="${v}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(v)}</a>`;
    return escapeHtml(String(v));
  }

  function renderLineage(row) {
    if (!row.lineage || !Array.isArray(row.lineage) || row.lineage.length === 0) {
      return '<div class="text-gray-400 text-md italic">No lineage data available.</div>';
    }
    const ancestors = Array.isArray(row.ancestors_iris) ? [...row.ancestors_iris].reverse() : [];
    const labels = [...row.lineage].reverse();
    const items = labels.map((label, i) => {
      const iri = ancestors[i] || null;
      if (iri && isUrlLike(iri)) {
        return `<a href="${iri}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(label)}</a>`;
      }
      return escapeHtml(label);
    });
    // Append the current taxon label (row.label)
    const currentLabel = row.label
      ? `<span class="font-semibold"><a href="${row.iri}" target="_blank" rel="noopener" class="text-white hover:underline">${escapeHtml(row.label)}</a></span>`
      : '';
    return `<div class="lineage-detail text-sm text-gray-300"><b>lineage:</b><br>${items.concat(currentLabel).join(' › ')}</div>`;
  }

  function renderTable(objects) {
    const slot = q('table-slot');
    if (!objects || objects.length === 0) {
      slot.innerHTML = '<div class="text-gray-400 text-md italic">No data.</div>';
      return;
    }

    const { cols, rows } = compactColumns(objects);
    const hidden = new Set(['iri', 'lineage', 'ictv_curie', 'direct_parent_iri', 'rank_iri', 'ancestors_iris', 'replaced_by', 'had_revision', 'is_obsolete']);
    const visibleCols = cols.filter(c => !hidden.has(c));

    const preferredOrder = [
      'rank_label', 'label', 'ictv_id', 'msl', 'direct_parent_label', 'was_revision_of', 'narrow_match', 'ncbi', 'synonyms'
    ];
    const ordered = preferredOrder.filter(c => visibleCols.includes(c));
    const remaining = visibleCols.filter(c => !ordered.includes(c));
    const finalCols = [...ordered, ...remaining];

    const headerLabels = {
      label: 'ICTV taxon',
      ictv_id: 'ICTV ID',
      msl: 'ICTV release',
      rank_label: 'Rank',
      direct_parent_label: 'Direct parent taxon',
      was_revision_of: 'Was revision of',
      narrow_match: 'Narrow match',
      ncbi: 'NCBI bridge',
      synonyms: 'Synonyms',
    };

    const th = finalCols.map(k => `<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wide text-gray-200 bg-white/5">${escapeHtml(headerLabels[k] || k)}</th>`).join('');
    const tr = rows.map(r => {
      const tds = finalCols.map(k => {
        const content = formatCell(r[k], k, r);
        return `<td data-label="${escapeHtml(headerLabels[k] || k)}" class="px-3 py-2 text-sm text-gray-100 align-top">${content}</td>`;
      }).join('');
      return `<tr>${tds}</tr>
              <tr class="lineage-row hidden">
                <td colspan="${finalCols.length}" class="px-3 py-2 bg-black/30 text-gray-200"></td>
              </tr>`;
    }).join('');

    slot.innerHTML = `
      <div class="overflow-x-auto border border-white/10 rounded-lg">
        <table class="ictv-table">
          <thead>
            <tr>${th}</tr>
          </thead>
          <tbody class="divide-y divide-white/10">${tr}</tbody>
        </table>
      </div>
    `;

    // lineage button
    const table = slot.querySelector('table');
    table.querySelectorAll('tbody tr:nth-child(odd)').forEach((row, i) => {
      const lineageRow = row.nextElementSibling;
      lineageRow.classList.add('hidden');
      lineageRow.setAttribute('hidden', 'true');
      const btn = document.createElement('button');
      btn.className = "mt-2 text-xs px-2 py-1 rounded-md border border-[#2a3745] bg-[#16202b] text-[#edf1f5] hover:bg-[#1e2935] transition-colors duration-200 active:translate-y-[1px]";
      btn.textContent = 'Show full lineage';

      const inline = document.createElement('div');
      inline.className = 'lineage-inline  mt-2 text-sm text-gray-300 space-y-1';
      /*
            btn.addEventListener('click', () => {
              if (isSmallScreen()) {
                if (inline.classList.contains('open')) {
                  inline.classList.remove('open');
                  inline.innerHTML = '';
                  btn.textContent = 'Show full lineage';
                } else {
                  inline.classList.add('open');
                  inline.innerHTML = renderLineage(rows[i]);
                  btn.textContent = 'Hide lineage';
                }
              } else {
                const detail = lineageRow.querySelector('td');
                if (lineageRow.classList.contains('hidden')) {
                  lineageRow.classList.remove('hidden');
                  detail.innerHTML = renderLineage(rows[i]);
                  btn.textContent = 'Hide lineage';
                } else {
                  lineageRow.classList.add('hidden');
                  btn.textContent = 'Show full lineage';
                }
              }
            });
      */
      btn.className = "ictv-lineage-btn ...";
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-expanded', 'false');
      btn.dataset.state = 'closed';

      const toggle = () => {
        if (isSmallScreen()) {
          // inline open / close
          if (btn.dataset.state === 'open') {
            btn.dataset.state = 'closed';
            btn.setAttribute('aria-expanded', 'false');
            btn.textContent = 'Show full lineage';
            inline.classList.add('hidden');
            inline.setAttribute('hidden', 'true');
            inline.innerHTML = '';
          } else {
            btn.dataset.state = 'open';
            btn.setAttribute('aria-expanded', 'true');
            btn.textContent = 'Hide lineage';
            inline.classList.remove('hidden');
            inline.removeAttribute('hidden');
            inline.innerHTML = renderLineage(rows[i]);
          }
        } else {
          // table open / close
          inline.classList.add('hidden');
          inline.setAttribute('hidden', 'true');
          inline.innerHTML = '';
          const detailCell = lineageRow.querySelector('td');
          if (btn.dataset.state === 'open') {
            btn.dataset.state = 'closed';
            btn.setAttribute('aria-expanded', 'false');
            btn.textContent = 'Show full lineage';
            lineageRow.classList.add('hidden');
            lineageRow.setAttribute('hidden', 'true');
            detailCell.innerHTML = '';
          } else {
            btn.dataset.state = 'open';
            btn.setAttribute('aria-expanded', 'true');
            btn.textContent = 'Hide lineage';
            lineageRow.classList.remove('hidden');
            lineageRow.removeAttribute('hidden');
            detailCell.innerHTML = renderLineage(rows[i]);
          }
        }
      };
      btn.addEventListener('click', toggle);


      const parentIdx = finalCols.indexOf('direct_parent_label');
      const parentCell = parentIdx >= 0 ? row.querySelector(`td:nth-child(${parentIdx + 1})`) : null;
      if (parentCell) {
        parentCell.appendChild(document.createElement('br'));
        parentCell.appendChild(btn);
        parentCell.appendChild(inline);
      }
    });
  }

  function renderJSON(data) {
    q('json-pre').textContent = JSON.stringify(data, null, 2);
  }

  /* -------------------- Orchestration -------------------- */
  async function onResolve() {
    const input = q('q').value.trim();
    const mode = q('mode').value;
    q('summary').className = 'status warn';
    q('summary').textContent = 'Working…';

    try {
      if (mode === 'history') {
        const data = await api.getHistory(input);
        renderSummary(data);
        if (data.status === 'not-found') {
          renderTable([]); renderJSON(data); return;
        }
        renderTable(data.history);
        renderJSON(data);
      } else {
        const data = await api.resolveToLatest(input);
        renderSummary(data);

        if (data.status === 'not-found') {
          renderTable([]); renderJSON(data); return;
        }

        if (data.status === 'current') {
          const ncbi = data.current.ictv_curie ? await api.getNcbiForIctvCurie(data.current.ictv_curie) : [];
          renderTable([{ ...data.current, ncbi }]);
          renderJSON({ input: data.input, result: data.current, ncbi });
        } else if (data.status === 'obsolete') {
          const rows = [];
          if (data.obsolete) {
            rows.push({
              ...data.obsolete,
              status: 'obsolete',
              ncbi: data.obsolete.ictv_curie ? await api.getNcbiForIctvCurie(data.obsolete.ictv_curie) : []
            });
          }
          if (Array.isArray(data.replacements)) {
            for (const r of data.replacements) {
              rows.push({
                ...r,
                status: 'replacement',
                ncbi: r.ictv_curie ? await api.getNcbiForIctvCurie(r.ictv_curie) : []
              });
            }
          }
          renderTable(rows);
          renderJSON(data);
        }
      }
    } catch (e) {
      q('summary').className = 'status text-red-400';
      q('summary').textContent = `Error: ${e.message || e}`;
      renderTable([]);
      renderJSON({ error: String(e) });
    }
  }

  q('go').addEventListener('click', onResolve);
  q('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') onResolve(); });
  q('show-json').addEventListener('change', (e) => {
    const table = q('table-slot');
    const json = q('json-slot');
    if (e.target.checked) {
      table.classList.add('hidden');
      json.classList.remove('hidden');
    } else {
      json.classList.add('hidden');
      table.classList.remove('hidden');
    }
  });

  // -------- resize: normalize all lineage UIs when switching modes --------
  let wasSmall = isSmallScreen();
  window.addEventListener('resize', () => {
    const nowSmall = isSmallScreen();
    if (nowSmall === wasSmall) return;

    // Hide all lineage rows (table mode)
    document.querySelectorAll('.lineage-row').forEach(row => {
      row.classList.add('hidden');
      row.setAttribute('hidden', 'true');
      const td = row.querySelector('td');
      if (td) td.innerHTML = '';
    });

    // Hide all inline lineage (card mode)
    document.querySelectorAll('.lineage-inline').forEach(div => {
      div.classList.add('hidden');
      div.innerHTML = '';
    });

    // Reset all buttons state/text
    document.querySelectorAll('.ictv-lineage-btn').forEach(btn => {
      btn.dataset.state = 'closed';
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'Show full lineage';
    });

    wasSmall = nowSmall;
  });

  // initial state
  renderTable([]);
  renderJSON({ tip: 'Enter an ICTV id/IRI, label, synonym, or NCBI taxid.' });
}

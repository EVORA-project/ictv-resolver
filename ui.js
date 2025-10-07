// ui.js — consumes an ICTVApi instance while keeping your previous UI behavior

export default function initUI(api) {
  const q  = id  => document.getElementById(id);
  const qs = sel => document.querySelector(sel);
  const isSmallScreen = () => window.matchMedia('(max-width: 1100px)').matches;

  // utils copied locally to avoid coupling UI to the helper internals
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  const isUrlLike = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

  function mapDbLink(curie) {
    if (!curie || typeof curie !== 'string') return null;
    const lower = curie.toLowerCase();
    if (lower.startsWith('genbank:')) {
      const acc = curie.split(':')[1];
      return `https://www.ncbi.nlm.nih.gov/nuccore/${acc}`;
    }
    if (lower.startsWith('refseq:')) {
      const acc = curie.split(':')[1];
      return `https://www.ncbi.nlm.nih.gov/nuccore/${acc}`;
    }
    return null;
  }

  /* -------------------- Summary/status -------------------- */
  function renderSummary(data) {
    const el = q('summary');
    el.className = 'status';

    if (data.status === 'not-found') {
      el.classList.add('err');

      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        el.innerHTML = `
          ❌ No match for <b>"${escapeHtml(data.input)}"</b>.
          <div>Did you mean:</div>
          <ul class="suggest-list">
            ${data.suggestions
              .map(s => `
                <li>
                  <a href="#" class="suggestion-link" data-sug="${escapeHtml(s)}">${escapeHtml(s)}</a>
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
      )}${
        data.obsolete.obsolescence_reason
          ? ` (Reason: <b>${escapeHtml(data.obsolete.obsolescence_reason)}</b>)`
          : ''
      }.`;
    } else if (data.status === 'ok' && data.history) {
      el.innerHTML = `📜 History entries: <b>${data.history.length}</b>`;
    } else {
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
    const renderList = arr => `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;

    if (col === 'label' && row.iri) {
      return `<a href="${row.iri}" target="_blank" rel="noopener">${escapeHtml(v)}</a>`;
    }
    if (col === 'rank_label' && row.rank_iri) {
      return `<a href="${row.rank_iri}" target="_blank" rel="noopener">${escapeHtml(v)}</a>`;
    }
    if (col === 'direct_parent_label' && row.direct_parent_iri) {
      return `<a href="${row.direct_parent_iri}" target="_blank" rel="noopener">${escapeHtml(v)}</a>`;
    }
    if (col === 'ictv_id' && row.iri) {
      return `<a href="${row.iri}" target="_blank" rel="noopener">${escapeHtml(v)}</a>`;
    }
    if (col === 'ncbi') {
      if (!Array.isArray(v) || v.length === 0) return '';
      const links = v.map(x => {
        const id = x.ncbiCurie || x.id || '';
        const label = x.label || id;
        const taxid = id.replace(/^ncbitaxon:/i, '');
        const url = `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${taxid}`;
        return `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(label)} (${escapeHtml(id)})</a>`;
      });
      return renderList(links);
    }
    if (col === 'narrow_match') {
      if (!Array.isArray(v) || v.length === 0) return '';
      const links = v.map(x => {
        const text = typeof x.value === 'string' ? x.value : JSON.stringify(x.value);
        const url = x.url || (isUrlLike(text) ? text : null);
        if (url) return `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
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
          return `<a href="${iri}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
        }
        return escapeHtml(label);
      });
      return parts.join(' › ');
    }
    if (Array.isArray(v)) {
      if (v.length === 0) return '';
      const links = v.map(x => {
        const dbUrl = mapDbLink(x);
        if (dbUrl) return `<a href="${dbUrl}" target="_blank" rel="noopener">${escapeHtml(x)}</a>`;
        return escapeHtml(String(x));
      });
      return renderList(links);
    }
    if (typeof v === 'boolean') return v ? 'true' : '';
    if (isUrlLike(v)) return `<a href="${v}" target="_blank" rel="noopener">${escapeHtml(v)}</a>`;
    return escapeHtml(String(v));
  }

  function renderLineage(row) {
    if (!row.lineage || !Array.isArray(row.lineage) || row.lineage.length === 0) {
      return '<div class="small">No lineage data available.</div>';
    }
    const ancestors = Array.isArray(row.ancestors_iris) ? [...row.ancestors_iris].reverse() : [];
    const labels = [...row.lineage].reverse();
    const items = labels.map((label, i) => {
      const iri = ancestors[i] || null;
      if (iri && isUrlLike(iri)) {
        return `<a href="${iri}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
      }
      return escapeHtml(label);
    });
    return `<div class="lineage-detail"><b>Lineage:</b><br>${items.join(' › ')}</div>`;
  }

  function renderTable(objects) {
    const slot = q('table-slot');
    if (!objects || objects.length === 0) {
      slot.innerHTML = '<div class="small">No data.</div>';
      return;
    }

    const { cols, rows } = compactColumns(objects);
    const hidden = new Set(['iri','lineage','ictv_curie','direct_parent_iri','rank_iri','ancestors_iris','replaced_by','had_revision']);
    const visibleCols = cols.filter(c => !hidden.has(c));

    const preferredOrder = [
      'rank_label','label','ictv_id','msl','direct_parent_label','was_revision_of','narrow_match','ncbi','synonyms'
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

    const th = finalCols.map(k => `<th>${escapeHtml(headerLabels[k] || k)}</th>`).join('');
    const tr = rows.map(r => {
      const tds = finalCols.map(k => {
        const content = formatCell(r[k], k, r);
        return `<td data-label="${escapeHtml(headerLabels[k] || k)}">${content}</td>`;
      }).join('');
      return `<tr>${tds}</tr>
              <tr class="lineage-row" style="display:none;">
                <td colspan="${finalCols.length}" class="lineage-detail"></td>
              </tr>`;
    }).join('');

    slot.innerHTML = `
      <table>
        <thead><tr>${th}</tr></thead>
        <tbody>${tr}</tbody>
      </table>
    `;

    // “Show full lineage” buttons under parent column
    const table = slot.querySelector('table');
    table.querySelectorAll('tbody tr:nth-child(odd)').forEach((row, i) => {
      const lineageRow = row.nextElementSibling;
      const btn = document.createElement('button');
      btn.className = 'lineage-btn';
      btn.textContent = 'Show full lineage';

      const inline = document.createElement('div');
      inline.className = 'lineage-inline';

      btn.addEventListener('click', () => {
        if (isSmallScreen()) {
          if (inline.classList.contains('open')) {
            inline.classList.remove('open'); inline.innerHTML = ''; btn.textContent = 'Show full lineage';
          } else {
            inline.classList.add('open'); inline.innerHTML = renderLineage(rows[i]); btn.textContent = 'Hide lineage';
          }
        } else {
          const detail = lineageRow.querySelector('.lineage-detail');
          if (lineageRow.style.display === 'none') {
            lineageRow.style.display = '';
            detail.innerHTML = renderLineage(rows[i]);
            btn.textContent = 'Hide lineage';
          } else {
            lineageRow.style.display = 'none';
            btn.textContent = 'Show full lineage';
          }
        }
      });

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
    const mode  = q('mode').value;
    q('summary').className = 'status';
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
      q('summary').className = 'status err';
      q('summary').textContent = `Error: ${e.message || e}`;
      renderTable([]);
      renderJSON({ error: String(e) });
    }
  }

  q('go').addEventListener('click', onResolve);
  q('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') onResolve(); });
  q('show-json').addEventListener('change', (e) => {
    if (e.target.checked) { q('table-slot').style.display = 'none'; q('json-slot').style.display = ''; }
    else { q('table-slot').style.display = ''; q('json-slot').style.display = 'none'; }
  });

  // initial state
  renderTable([]);
  renderJSON({ tip: 'Enter an ICTV id/IRI, label, synonym, or NCBI taxid.' });
}

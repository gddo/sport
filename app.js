const KEY = 'sport.v1', PLAN_KEY = 'sport.plan';
const VERSION = 'r26.2.0'; // tenere allineato con sw.js
const { DAYS, SLOTS, dateKey, fromKey, addDays, dayIndex, mondayOf, currentSlot, nextSlot, slotId, monthPrefix, monthCounts, lastDone, rank, validPlan } = L;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const now = () => (window.__NOW ? new Date(window.__NOW) : new Date());

const HOLE = 'fill="var(--t-bg)"';
const LINE = 'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
const CUT = 'fill="none" stroke="var(--t-bg)" stroke-width="2.6" stroke-linecap="round"';
const BIKE = `<circle cx="11" cy="31" r="8" ${LINE}/><circle cx="37" cy="31" r="8" ${LINE}/><path d="M11 31 19 16h13l5 15M19 16l7 15h-15M14 12h7M29 11h6" ${LINE}/>`;
const KB = `<path d="M15 19c-4-14 22-14 18 0" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="24" cy="29" r="15"/>`;
const ICONS = {
  corsa: `<path d="M4 30c0-3 1-9 3-14 3 1 6 1 8-1l5 7c3 3 8 4 13 5 5 1 11 3 11 7v1H4z"/><path d="M4 37h40v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>`,
  ripetute: `<circle cx="24" cy="28" r="16"/><rect x="19" y="3" width="10" height="5" rx="2"/><rect x="22" y="7" width="4" height="6"/><path d="M24 28V18M24 28l6 4" ${CUT}/>`,
  forza: `<rect x="4" y="18" width="6" height="12" rx="2"/><rect x="10" y="12" width="7" height="24" rx="2"/><rect x="17" y="21" width="14" height="6"/><rect x="31" y="12" width="7" height="24" rx="2"/><rect x="38" y="18" width="6" height="12" rx="2"/>`,
  kb: KB, kettlebell: KB,
  pt: `<circle cx="24" cy="12" r="8"/><path d="M8 43c0-12 7-19 16-19s16 7 16 19z"/>`,
  bici: BIKE,
  rulli: `${BIKE}<path d="M3 44h42" ${LINE}/>`,
  pattini: `<path d="M12 5h14v16c0 3 8 4 12 6 3 1 5 3 5 6v3H12z"/><circle cx="17" cy="41" r="4.500"/><circle cx="37" cy="41" r="4.500"/>`,
  sci: `<path d="M9 5 39 43M39 5 9 43" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`,
  nuoto: `<path d="M4 16c5-5 8-5 13 0s8 5 14 0 8-5 13 0M4 27c5-5 8-5 13 0s8 5 14 0 8-5 13 0M4 38c5-5 8-5 13 0s8 5 14 0 8-5 13 0" ${LINE}/>`,
  basket: `<circle cx="24" cy="24" r="19"/><path d="M5 24h38M24 5v38M11 10c7 8 7 20 0 28M37 10c-7 8-7 20 0 28" ${CUT}/>`,
  calcetto: `<circle cx="24" cy="24" r="19"/><path d="m24 15 8.500 6-3 10h-11l-3-10z" ${HOLE}/><path d="M24 15V6M32.500 21l8-3M29.500 31l5 7M18.500 31l-5 7M15.500 21l-8-3" ${CUT}/>`,
  montagna: `<path d="M3 41 18 12l8 13 5-7 14 23z"/>`,
  altro: `<circle cx="10" cy="24" r="5.500"/><circle cx="24" cy="24" r="5.500"/><circle cx="38" cy="24" r="5.500"/>`,
};
const icon = item => `<svg class="ic" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">${ICONS[item.icona] || ICONS[item.id] || ICONS[item.gruppo] || ICONS.altro}</svg>`;

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
let state = { logs: {}, ...load(KEY, {}) };
let plan = load(PLAN_KEY, null);
let tab = 'home', toastTimer = null, picker = null, chooser = null, altroOpen = false, editor = null;
const sheetOpen = () => picker || chooser || altroOpen || editor;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { showToast('Salvataggio non riuscito: la memoria del browser è bloccata.'); }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

const groupOf = item => (['corsa', 'forza'].includes(item.gruppo) ? item.gruppo : 'altro');
const allItems = () => [...plan.piano, ...(plan.altro || [])];
// Le voci eliminate restano in archivio: i giorni già segnati continuano a mostrare nome e icona.
const find = id => [...allItems(), ...(plan.archivio || [])].find(x => x.id === id) || { id, nome: id };
const MON3 = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const cap = s => s[0].toUpperCase() + s.slice(1);
function slotName(date, slot, today) {
  const m = SLOTS[slot].toLowerCase();
  const tom = dateKey(addDays(fromKey(today), 1)), yest = dateKey(addDays(fromKey(today), -1));
  if (date === today) return `${m} di oggi`;
  if (date === tom) return `${m} di domani`;
  if (date === yest) return `${m} di ieri`;
  const d = fromKey(date);
  return `${m} di ${DAYS[dayIndex(d)].toLowerCase()} ${d.getDate()}`;
}

function tile(r, i, cls = '') {
  return `<button class="tile g-${groupOf(r.item)} ${cls}" id="t-${esc(r.id)}" type="button" data-src="${esc(r.id)}">
    ${i != null ? `<span class="rk">${i + 1}</span>` : ''}${icon(r.item)}
    <span class="nm">${esc(r.item.nome)}</span><span class="cnt">${r.done} di ${r.target}</span>
  </button>`;
}
function renderHome() {
  const R = rank(plan, state.logs, now());
  const altro = plan.altro && plan.altro.length
    ? `<button class="tile g-altro" id="t-altro" type="button" data-altro="1">${icon({ id: 'altro' })}<span class="nm">Altro</span></button>` : '';
  let h = `<section class="grid" aria-label="Da fare, dal più indietro">${R.todo.map((r, i) => tile(r, i)).join('')}${altro}</section>`;
  if (R.covered.length) h += `<h2 class="sec">Già fatti questo mese</h2><section class="grid done">${R.covered.map(r => tile(r, null, 'low')).join('')}</section>`;
  return h;
}

function renderCalendar(today) {
  const start = addDays(mondayOf(now()), -7), cur = currentSlot(now());
  let cells = ['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(d => `<span class="h">${d}</span>`).join('');
  for (let i = 0; i < 14; i++) {
    const day = addDays(start, i), k = dateKey(day);
    const slot = s => {
      const id = state.logs[slotId(k, s)], item = id && find(id);
      const fut = k > today || (k === today && s === 'S' && cur === 'P');
      return `<button type="button" id="s-${k}-${s}" class="slot ${fut ? 'fut' : ''} ${item ? `full g-${groupOf(item)}` : 'empty'}" data-slot="${k}|${s}" aria-label="${SLOTS[s]} del ${day.getDate()}: ${item ? esc(item.nome) : 'vuoto'}">${item ? icon(item) : ''}</button>`;
    };
    cells += `<div class="cal-d ${k === today ? 't' : ''}"><span class="n">${day.getDate()}</span>${slot('P')}${slot('S')}</div>`;
  }
  return `<div class="cal">${cells}</div>`;
}
function renderStats() {
  const n = now(), today = dateKey(n), counts = monthCounts(state.logs, n);
  const row = item => {
    const t = item.aMese, d = counts[item.id] || 0, last = lastDone(state.logs, item.id, today);
    const lastTxt = last ? `Ultima volta il ${fromKey(last).getDate()} ${MON3[fromKey(last).getMonth()]}` : 'Mai fatto';
    return `<div class="row g-${groupOf(item)}"><span class="i">${icon(item)}</span>
      <div class="n">${esc(item.nome)}<small>${lastTxt}</small>${t ? `<div class="bar"><i style="width:${Math.min(d / t, 1) * 100}%"></i></div>` : ''}</div>
      <span class="val">${t ? `${d} di ${t}` : d}</span></div>`;
  };
  const rare = (plan.altro || []).filter(x => counts[x.id]);
  const dark = isDark();
  return `<section class="card"><h2>Calendario</h2>${renderCalendar(today)}</section>
  <section class="card"><h2>${MONTHS[n.getMonth()]}</h2>${plan.piano.map(row).join('')}${rare.map(row).join('')}</section>
  <section class="card"><h2>Sfondo</h2>
    <div class="seg"><button class="btn alt" id="theme-light" type="button" data-theme-set="light" aria-pressed="${!dark}">Chiaro</button><button class="btn alt" id="theme-dark" type="button" data-theme-set="dark" aria-pressed="${dark}">Scuro</button></div>
  </section>
  <section class="card"><h2>Copia di sicurezza</h2>
    <p class="sub">I dati stanno solo su questo telefono. Scaricali ogni tanto: servono anche per ripristinarli se cambi telefono.</p>
    <div class="btns"><button class="btn alt" id="export" type="button">Scarica i dati</button><button class="btn alt" id="import" type="button">Ripristina</button></div>
  </section>
  <p class="ver">${VERSION}</p>`;
}

function isDark() { return state.theme ? state.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme() {
  if (state.theme) document.documentElement.dataset.theme = state.theme;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name=theme-color]').forEach(m => { m.content = bg; });
}
function render() {
  if (!plan) { $('#view').innerHTML = '<p class="sec">Il file allenamenti.json non si carica: apri l\'app una volta con la connessione attiva.</p>'; return; }
  $('#view').innerHTML = tab === 'home' ? renderHome() : tab === 'prog' ? renderProg() : renderStats();
  document.querySelectorAll('.tabs button').forEach(b => b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (altroOpen) renderAltro();
  if (picker) renderPicker();
  if (chooser) renderChooser();
}

const ICON_NAMES = ['corsa', 'ripetute', 'forza', 'kettlebell', 'pt', 'bici', 'rulli', 'montagna', 'nuoto', 'pattini', 'sci', 'basket', 'calcetto', 'altro'];
const ICON_GROUP = { corsa: 'corsa', ripetute: 'corsa', forza: 'forza', kettlebell: 'forza', kb: 'forza', pt: 'forza' };
const iconName = item => [item.icona, item.id, item.gruppo].find(n => n && ICONS[n]) || 'altro';
const savePlan = () => { try { localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); } catch (e) { showToast('Salvataggio non riuscito: la memoria del browser è bloccata.'); } };

function renderProg() {
  const edit = (x, list) => `<button class="pick-row" type="button" id="e-${esc(x.id)}" data-edit="${esc(x.id)}" data-list="${list}" aria-label="Modifica ${esc(x.nome)}"><span class="i g-${groupOf(x)}">${icon(x)}</span><span class="n">${esc(x.nome)}</span></button>`;
  const rows = plan.piano.map(x => `<div class="prow">${edit(x, 'piano')}
    <div class="step"><button type="button" id="m-${esc(x.id)}" data-adj="${esc(x.id)}" data-d="-1" aria-label="Una volta in meno al mese">−</button><b>${x.aMese || 1}</b><button type="button" id="p-${esc(x.id)}" data-adj="${esc(x.id)}" data-d="1" aria-label="Una volta in più al mese">+</button></div></div>`).join('');
  const tot = plan.piano.reduce((a, x) => a + (x.aMese || 1), 0);
  return `<section class="card"><h2>Allenamenti del mese</h2>
    <p class="sub">${tot} al mese in totale. Tocca un nome per modificarlo.</p>
    ${rows}<button class="btn alt" id="add-piano" type="button">Aggiungi allenamento</button></section>
  <section class="card"><h2>Altro</h2>
    <p class="sub">Sport senza obiettivo mensile.</p>
    ${(plan.altro || []).map(x => `<div class="prow">${edit(x, 'altro')}</div>`).join('')}
    <button class="btn alt" id="add-altro" type="button">Aggiungi sport</button></section>`;
}
function renderEditor() {
  const e = editor;
  $('#sheet').innerHTML = `<div class="sheet-in">
    <div class="sh-head"><h2>${e.id ? 'Modifica' : 'Nuovo'}</h2><button class="close" id="close" type="button" aria-label="Chiudi">×</button></div>
    <label class="fld" for="ed-name">Nome<input id="ed-name" type="text" maxlength="40" autocomplete="off" value="${esc(e.nome)}" placeholder="Corsa 10 km"></label>
    <div class="fld">Dove<div class="seg"><button class="btn alt" id="ed-piano" type="button" data-ed-list="piano" aria-pressed="${e.list === 'piano'}">Nel mese</button><button class="btn alt" id="ed-altro" type="button" data-ed-list="altro" aria-pressed="${e.list === 'altro'}">In Altro</button></div></div>
    <div class="fld">Icona<div class="icons">${ICON_NAMES.map(n => `<button type="button" id="ic-${n}" data-ed-icon="${n}" class="g-${e.list === 'altro' ? 'altro' : ICON_GROUP[n] || 'altro'}" aria-label="${n}" aria-pressed="${e.icona === n}">${icon({ icona: n })}</button>`).join('')}</div></div>
    <button class="btn" id="ed-save" type="button">Salva</button>
    ${e.id ? '<button class="btn alt" id="ed-del" type="button">Elimina</button>' : ''}
  </div>`;
}
function openEditor(id, list) {
  const x = id && (plan[list] || []).find(i => i.id === id);
  editor = { id, list, nome: x ? x.nome : '', icona: x ? iconName(x) : (list === 'piano' ? 'corsa' : 'altro') };
  renderEditor(); showSheet();
}
function changePlan(fn, text) {
  const before = JSON.stringify(plan);
  fn(); savePlan(); closeSheet(); render();
  showToast(text, () => { plan = JSON.parse(before); savePlan(); render(); });
}
function saveEditor() {
  const e = editor, nome = $('#ed-name').value.trim();
  if (!nome) return showToast('Scrivi un nome.');
  changePlan(() => {
    plan.altro = plan.altro || [];
    const from = e.id ? (plan.piano.some(x => x.id === e.id) ? 'piano' : 'altro') : e.list;
    const i = e.id ? plan[from].findIndex(x => x.id === e.id) : -1;
    const old = i >= 0 ? plan[from][i] : {};
    const item = { id: e.id || `x${Date.now().toString(36)}`, nome, icona: e.icona };
    if (e.list === 'piano') { item.gruppo = ICON_GROUP[e.icona] || 'altro'; item.aMese = old.aMese || 4; }
    if (from === e.list && i >= 0) plan[from][i] = item;
    else { if (i >= 0) plan[from].splice(i, 1); plan[e.list].push(item); }
  }, `Salvato: ${nome}`);
}
function deleteItem() {
  const e = editor, item = find(e.id);
  changePlan(() => {
    plan[e.list] = plan[e.list].filter(x => x.id !== e.id);
    plan.archivio = [...(plan.archivio || []), item];
  }, `Eliminato: ${item.nome}`);
}

function cellHtml(k, s, today, cur) {
  const id = state.logs[slotId(k, s)], item = id && find(id);
  const time = k < today ? 'past' : (k > today || (k === today && s === 'S' && cur.slot === 'P')) ? 'fut' : '';
  const isCur = k === cur.date && s === cur.slot;
  return `<button type="button" id="c-${k}-${s}" class="cell ${time} ${item ? `full g-${groupOf(item)}` : 'empty'} ${isCur ? 'cur' : ''}" data-date="${k}" data-slot-p="${s}" aria-label="${cap(slotName(k, s, today))}: ${item ? esc(item.nome) : 'vuoto'}">${item ? `${icon(item)}<span>${esc(item.nome)}</span>` : '+'}</button>`;
}
function quick(sl, today, label, main) {
  const id = state.logs[slotId(sl.date, sl.slot)];
  return `<button type="button" id="q-${main ? 'now' : 'next'}" class="q ${main ? 'main' : ''}" data-date="${sl.date}" data-slot-p="${sl.slot}"><small>${label}</small><b>${cap(slotName(sl.date, sl.slot, today))}</b><span>${id ? `C'è già: ${esc(find(id).nome)}` : ''}</span></button>`;
}
function renderPicker() {
  const n = now(), today = dateKey(n), item = find(picker.id);
  const cur = { date: today, slot: currentSlot(n) }, nx = nextSlot(today, cur.slot);
  const a = picker.monday, b = addDays(a, 6);
  const rows = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(a, i), k = dateKey(d);
    return `<div class="d ${k === today ? 't' : ''}">${DAYS[i].slice(0, 3)}<small>${d.getDate()}</small></div>${cellHtml(k, 'P', today, cur)}${cellHtml(k, 'S', today, cur)}`;
  }).join('');
  $('#sheet').innerHTML = `<div class="sheet-in">
    <div class="sh-head g-${groupOf(item)}">${icon(item)}<h2>${esc(item.nome)}</h2><button class="close" id="close" type="button" aria-label="Chiudi">×</button></div>
    <div class="quick">${quick(cur, today, 'Adesso', true)}${quick(nx, today, 'Prossimo', false)}</div>
    <div class="wk-nav"><button id="wk-prev" type="button" aria-label="Settimana precedente">‹</button><b>${a.getDate()} ${MON3[a.getMonth()]} – ${b.getDate()} ${MON3[b.getMonth()]}</b><button id="wk-next" type="button" aria-label="Settimana successiva">›</button></div>
    <div class="wk"><span></span><span class="h">Pausa pranzo</span><span class="h">Sera</span>${rows}</div>
    <p class="hint">Un riquadro già pieno viene sostituito. Tocca un riquadro con ${esc(item.nome.toLowerCase())} per toglierlo.</p>
  </div>`;
}
const pickTile = (item, attr, sel) => `<button class="tile pick g-${groupOf(item)} ${sel ? 'sel' : ''}" type="button" id="ch-${esc(item.id)}" ${attr}="${esc(item.id)}">${icon(item)}<span class="nm">${esc(item.nome)}</span></button>`;
function renderAltro() {
  $('#sheet').innerHTML = `<div class="sheet-in">
    <div class="sh-head"><h2>Altro</h2><button class="close" id="close" type="button" aria-label="Chiudi">×</button></div>
    <div class="grid choose">${plan.altro.map(x => pickTile(x, 'data-src', false)).join('')}</div></div>`;
}
function renderChooser() {
  const { date, slot } = chooser, d = fromKey(date), curId = state.logs[slotId(date, slot)];
  $('#sheet').innerHTML = `<div class="sheet-in">
    <div class="sh-head"><h2>${SLOTS[slot]} di ${DAYS[dayIndex(d)].toLowerCase()} ${d.getDate()}</h2><button class="close" id="close" type="button" aria-label="Chiudi">×</button></div>
    <div class="grid choose">${allItems().map(x => pickTile(x, 'data-pick', x.id === curId)).join('')}</div>
    ${curId ? `<button class="btn alt" id="clear-slot" type="button">Togli ${esc(find(curId).nome.toLowerCase())}</button>` : ''}
  </div>`;
}
function showSheet() {
  $('#toast').hidden = true; $('#sheet').hidden = false; $('#sheet').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeSheet() { picker = null; chooser = null; altroOpen = false; editor = null; $('#sheet').hidden = true; document.body.style.overflow = ''; }

function showToast(text, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(text)}</span>${undo ? '<button id="undo" type="button">Annulla</button>' : ''}`;
  t.hidden = false;
  t.onclick = e => { if (e.target.id === 'undo') { undo(); t.hidden = true; } };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 6000);
}
function mark(id, date, slot) {
  const key = slotId(date, slot), prev = state.logs[key], where = slotName(date, slot, dateKey(now()));
  const nome = find(id).nome;
  let text;
  if (prev === id) { delete state.logs[key]; text = `Tolto ${nome.toLowerCase()} da ${where}`; }
  else { state.logs[key] = id; text = `${nome}: ${where}${prev ? `, al posto di ${find(prev).nome.toLowerCase()}` : ''}`; }
  save(); closeSheet(); render();
  showToast(text, () => { if (prev) state.logs[key] = prev; else delete state.logs[key]; save(); render(); });
}

async function exportData() {
  const name = `sport-${dateKey(now())}.json`;
  const file = new File([JSON.stringify({ ...state, plan }, null, 1)], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function importData(file) {
  try {
    const d = JSON.parse(await file.text());
    if (!d.logs) throw 0;
    const before = state, beforePlan = plan;
    const { plan: p, ...rest } = d;
    state = { logs: {}, ...rest }; if (validPlan(p)) { plan = p; savePlan(); } save(); render();
    showToast(`Ripristinati ${Object.keys(d.logs).length} allenamenti`, () => { state = before; plan = beforePlan; savePlan(); save(); render(); });
  } catch (e) { showToast('Il file non è una copia di Sport: scegli il file sport-….json.'); }
}

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.edit) return openEditor(b.dataset.edit, b.dataset.list);
  if (b.dataset.edIcon) { editor.nome = $('#ed-name').value; editor.icona = b.dataset.edIcon; return renderEditor(); }
  if (b.dataset.edList) { editor.nome = $('#ed-name').value; editor.list = b.dataset.edList; return renderEditor(); }
  if (b.dataset.adj) {
    const x = plan.piano.find(i => i.id === b.dataset.adj), v = (x.aMese || 1) + +b.dataset.d;
    if (v < 1) return;
    x.aMese = v; savePlan(); return render();
  }
  if (b.dataset.tab) { tab = b.dataset.tab; render(); window.scrollTo(0, 0); return; }
  if (b.dataset.altro) { altroOpen = true; renderAltro(); return showSheet(); }
  if (b.dataset.src) { altroOpen = false; picker = { id: b.dataset.src, monday: mondayOf(now()) }; renderPicker(); return showSheet(); }
  if (b.dataset.date) return mark(picker.id, b.dataset.date, b.dataset.slotP);
  if (b.dataset.slot) { const [date, slot] = b.dataset.slot.split('|'); chooser = { date, slot }; renderChooser(); return showSheet(); }
  if (b.dataset.pick) return mark(b.dataset.pick, chooser.date, chooser.slot);
  if (b.dataset.themeSet) { state.theme = b.dataset.themeSet; save(); applyTheme(); return render(); }
  switch (b.id) {
    case 'close': return closeSheet();
    case 'add-piano': return openEditor(null, 'piano');
    case 'add-altro': return openEditor(null, 'altro');
    case 'ed-save': return saveEditor();
    case 'ed-del': return deleteItem();
    case 'wk-prev': picker.monday = addDays(picker.monday, -7); return renderPicker();
    case 'wk-next': picker.monday = addDays(picker.monday, 7); return renderPicker();
    case 'clear-slot': return mark(state.logs[slotId(chooser.date, chooser.slot)], chooser.date, chooser.slot);
    case 'import': return $('#json-input').click();
    case 'export': return exportData();
  }
});
$('#json-input').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importData(f); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !sheetOpen()) render(); });
setInterval(() => { if (!document.hidden && !sheetOpen()) render(); }, 60000);

/* allenamenti.json serve solo alla prima apertura: dopo il piano vive nell'app. */
async function loadPlan() {
  if (plan) return;
  try {
    const p = await (await fetch('allenamenti.json', { cache: 'no-cache' })).json();
    if (!validPlan(p)) throw new Error('schema');
    plan = p; savePlan();
  } catch (e) { /* render mostra il messaggio */ }
  render();
}

/* Aggiornamenti: la versione nuova resta in attesa finché non tocchi Aggiorna. */
function showUpdate(worker) {
  const u = $('#update');
  u.hidden = false;
  u.querySelector('button').onclick = () => worker.postMessage('skipWaiting');
}
if ('serviceWorker' in navigator) {
  let hadController = !!navigator.serviceWorker.controller, reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloading) { reloading = true; location.reload(); }
    hadController = true;
  });
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w); });
    });
    const check = () => { if (!document.hidden) reg.update().catch(() => {}); };
    check();
    document.addEventListener('visibilitychange', check);
  }).catch(() => {});
}

applyTheme();
if (plan) render();
loadPlan();

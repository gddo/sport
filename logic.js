/* Logica pura: nessun accesso al DOM, così si può provare anche fuori dal browser. */
(function (root) {
  const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const SLOTS = { P: 'Pausa pranzo', S: 'Sera' };
  const CUT = 16 * 60 + 30; // dalle 16:30 l'allenamento corrente è quello di sera

  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
  const dayIndex = d => (d.getDay() + 6) % 7;
  const mondayOf = d => addDays(d, -dayIndex(d));
  const currentSlot = now => (now.getHours() * 60 + now.getMinutes() < CUT ? 'P' : 'S');
  const nextSlot = (k, s) => (s === 'P' ? { date: k, slot: 'S' } : { date: dateKey(addDays(fromKey(k), 1)), slot: 'P' });
  const prevSlot = (k, s) => (s === 'S' ? { date: k, slot: 'P' } : { date: dateKey(addDays(fromKey(k), -1)), slot: 'S' });
  const slotId = (date, slot) => `${date}|${slot}`;
  const monthPrefix = d => dateKey(d).slice(0, 7);

  function monthCounts(logs, now) {
    const pre = monthPrefix(now), c = {};
    for (const [k, id] of Object.entries(logs)) if (k.startsWith(pre)) c[id] = (c[id] || 0) + 1;
    return c;
  }
  function lastDone(logs, id, today) {
    let best = null;
    for (const [slot, v] of Object.entries(logs)) {
      if (v !== id) continue;
      const k = slot.split('|')[0];
      if (k <= today && (!best || k > best)) best = k;
    }
    return best;
  }

  /* Ordine: prima ciò che è più indietro rispetto al passo del mese,
     così un allenamento saltato sale finché non lo recuperi.
     Chi è stato fatto nell'ultimo spazio perde un punto, per alternare. */
  function rank(plan, logs, now) {
    const today = dateKey(now), slot0 = currentSlot(now);
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const pace = now.getDate() / days;
    const counts = monthCounts(logs, now);
    const free = logs[slotId(today, slot0)] ? nextSlot(today, slot0) : { date: today, slot: slot0 };
    const p = prevSlot(free.date, free.slot), prevId = logs[slotId(p.date, p.slot)];
    const rows = plan.piano.map((item, order) => {
      const target = item.aMese || 0, done = counts[item.id] || 0, last = lastDone(logs, item.id, today);
      return { item, id: item.id, target, done, rem: target - done, order,
        score: target * pace - done - (item.id === prevId ? 1 : 0),
        age: last ? (fromKey(today) - fromKey(last)) / 864e5 : 9999 };
    });
    const cmp = (a, b) => b.score - a.score || b.rem - a.rem || b.age - a.age || a.order - b.order;
    return { todo: rows.filter(r => r.rem > 0).sort(cmp), covered: rows.filter(r => r.rem <= 0), counts, today, slot: slot0 };
  }

  function validPlan(p) {
    const ok = a => Array.isArray(a) && a.every(x => x && typeof x.id === 'string' && typeof x.nome === 'string');
    if (!p || !ok(p.piano) || !ok(p.altro || [])) return false;
    const ids = [...p.piano, ...(p.altro || [])].map(x => x.id);
    return new Set(ids).size === ids.length;
  }

  const api = { DAYS, SLOTS, dateKey, fromKey, addDays, dayIndex, mondayOf, currentSlot, nextSlot, slotId, monthPrefix, monthCounts, lastDone, rank, validPlan };
  if (typeof module !== 'undefined') module.exports = api; else root.L = api;
})(this);

import { useMemo, useState } from 'react';
import { plural } from '../lib/format';
import { FIELDS, catalogueFieldNamed, customKey, fieldFor, type Field } from '../lib/measurements';
import { PlusIcon } from './Icons';

const MAX_NAME = 40;

/**
 * "Add another measurement": tick any number of catalogue measurements that aren't shown yet,
 * and/or type custom names separated by commas. One "Add" adds them all.
 */
export function AddMeasurement({ existing, onAdd }: { existing: string[]; onAdd(keys: string[]): void }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');

  const groups = useMemo(() => {
    const have = new Set(existing);
    const out: { group: string; fields: Field[] }[] = [];
    for (const f of FIELDS) {
      if (have.has(f.key)) continue;
      const g = f.group ?? 'Length';
      const last = out[out.length - 1];
      if (last && last.group === g) last.fields.push(f);
      else out.push({ group: g, fields: [f] });
    }
    return out;
  }, [existing]);

  const customNames = custom.split(',').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
  const count = picked.size + customNames.length;

  function reset() { setOpen(false); setPicked(new Set()); setCustom(''); setError(''); }

  function toggle(key: string) {
    setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
    setError('');
  }

  function add() {
    const keys = FIELDS.filter((f) => picked.has(f.key)).map((f) => f.key);
    const taken = new Set([...existing, ...keys].map((k) => fieldFor(k)?.full.toLowerCase()));
    for (const name of customNames) {
      if (name.length > MAX_NAME) { setError(`“${name.slice(0, 24)}…” is too long. Keep each name under ${MAX_NAME} characters.`); return; }
      const key = catalogueFieldNamed(name)?.key ?? customKey(name);
      const full = fieldFor(key)!.full;
      if (taken.has(full.toLowerCase())) { setError(`${full} is already in the list.`); return; }
      taken.add(full.toLowerCase());
      keys.push(key);
    }
    if (!keys.length) { setError('Tick at least one measurement, or type a name.'); return; }
    onAdd(keys);
    reset();
  }

  if (!open) {
    return (
      <button type="button" className="add-meas-btn" onClick={() => setOpen(true)}>
        <PlusIcon /> Add another measurement
      </button>
    );
  }
  return (
    <div className="add-meas" role="group" aria-labelledby="add-meas-title">
      <p className="add-meas-title" id="add-meas-title">Add measurements</p>
      {groups.length > 0 && (
        <div className="add-meas-list">
          {groups.map((g) => (
            <div className="add-meas-group" key={g.group} role="group" aria-label={g.group}>
              <span className="m-legend">{g.group}</span>
              <div className="pick-chips">
                {g.fields.map((f) => (
                  <label className="pick" key={f.key}>
                    <input type="checkbox" checked={picked.has(f.key)} onChange={() => toggle(f.key)} aria-label={f.full} />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="field">
        <label htmlFor="add-custom">Not in the list? Type names, separated by commas</label>
        <input
          id="add-custom"
          className="text-input"
          placeholder="e.g. Slit length, Dart point"
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="add-meas-actions">
        <button type="button" className="btn" onClick={reset}>Cancel</button>
        <button type="button" className="btn primary" onClick={add}>{count ? `Add ${plural(count, 'measurement')}` : 'Add'}</button>
      </div>
    </div>
  );
}

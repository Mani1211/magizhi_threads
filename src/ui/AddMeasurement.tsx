import { useMemo, useState } from 'react';
import { FIELDS, catalogueFieldNamed, customKey, fieldFor } from '../lib/measurements';
import { PlusIcon } from './Icons';

const CUSTOM = '__custom';

/** "Add another measurement": any catalogue measurement not shown yet, or one with a custom name. */
export function AddMeasurement({ existing, onAdd }: { existing: string[]; onAdd(key: string): void }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const groups = useMemo(() => {
    const have = new Set(existing);
    const out: { group: string; fields: typeof FIELDS }[] = [];
    for (const f of FIELDS) {
      if (have.has(f.key)) continue;
      const g = f.group ?? 'Length';
      const last = out[out.length - 1];
      if (last && last.group === g) last.fields.push(f);
      else out.push({ group: g, fields: [f] });
    }
    return out;
  }, [existing]);

  function reset() { setOpen(false); setChoice(''); setName(''); setError(''); }

  function add() {
    if (!choice) { setError('Choose a measurement.'); return; }
    let key = choice;
    if (choice === CUSTOM) {
      const trimmed = name.trim();
      if (!trimmed) { setError('Type a name for the measurement.'); return; }
      if (trimmed.length > 40) { setError('Keep the name under 40 characters.'); return; }
      key = catalogueFieldNamed(trimmed)?.key ?? customKey(trimmed);
    }
    const lower = (k: string) => fieldFor(k)?.full.toLowerCase();
    if (existing.includes(key) || existing.some((k) => lower(k) === lower(key))) {
      setError(`${fieldFor(key)?.full ?? 'This measurement'} is already in the list.`);
      return;
    }
    onAdd(key);
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
    <div className="add-meas" role="group" aria-label="Add another measurement">
      <select
        className="text-input"
        aria-label="Measurement to add"
        value={choice}
        autoFocus
        onChange={(e) => { setChoice(e.target.value); setError(''); }}
      >
        <option value="">Choose a measurement…</option>
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.fields.map((f) => <option key={f.key} value={f.key}>{f.full}</option>)}
          </optgroup>
        ))}
        <option value={CUSTOM}>Other — type a name…</option>
      </select>
      {choice === CUSTOM && (
        <input
          className="text-input"
          aria-label="Name of the measurement"
          placeholder="e.g. Slit length"
          value={name}
          autoFocus
          maxLength={40}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
      )}
      <div className="add-meas-actions">
        <button type="button" className="btn" onClick={reset}>Cancel</button>
        <button type="button" className="btn primary" onClick={add}>Add</button>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}

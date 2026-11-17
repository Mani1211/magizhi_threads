import { Fragment, type ReactNode } from 'react';
import { FIELDS, LENGTH_KEYS, formatInch, type Field, type Measurements } from '../lib/measurements';

type Block = { field: Field } | { group: string; fields: Field[] };

/** Fields in catalogue order; consecutive fields of a group (Neck, Chest…) are kept together. */
function blocks(keys: string[]): Block[] {
  const set = new Set(keys);
  const fs = FIELDS.filter((f) => set.has(f.key));
  const out: Block[] = [];
  for (let i = 0; i < fs.length;) {
    const f = fs[i];
    if (f.group) {
      const fields: Field[] = [];
      while (i < fs.length && fs[i].group === f.group) fields.push(fs[i++]);
      out.push({ group: f.group, fields });
    } else {
      out.push({ field: f });
      i++;
    }
  }
  return out;
}

function Grid({ keys, cell }: { keys: string[]; cell(f: Field): ReactNode }) {
  return (
    <div className="m-grid">
      {blocks(keys).map((b) =>
        'group' in b ? (
          <div className="m-group" role="group" aria-label={b.group} key={b.group}>
            <div className="m-legend">{b.group}</div>
            <div className="m-sub">{b.fields.map((f) => <Fragment key={f.key}>{cell(f)}</Fragment>)}</div>
          </div>
        ) : (
          <Fragment key={b.field.key}>{cell(b.field)}</Fragment>
        ),
      )}
    </div>
  );
}

/** Read-only values. With `body`, values that differ from the body measurement are highlighted. */
export function MeasurementView({ keys, values, body }: { keys: string[]; values: Measurements; body?: Measurements }) {
  return (
    <Grid keys={keys} cell={(f) => {
      const v = values[f.key];
      const b = body && !LENGTH_KEYS.has(f.key) ? body[f.key] : undefined;
      const diff = v != null && b != null && Math.abs(b - v) > 0.001;
      return (
        <div className={`m-cell view${v == null ? ' is-empty' : ''}${diff ? ' diff' : ''}`}>
          <span className="m-label">{f.label}</span>
          <span className="m-val">{formatInch(v)}</span>
          {diff && <span className="m-was">Body {formatInch(b)}</span>}
        </div>
      );
    }} />
  );
}

/** Inputs for each key. `hint` shows under a value, e.g. the body measurement it was changed from. */
export function MeasurementEdit({ keys, values, invalid, onChange, hint }: {
  keys: string[];
  values: Record<string, string>;
  invalid: Set<string>;
  onChange(key: string, value: string): void;
  hint?(key: string): string;
}) {
  return (
    <Grid keys={keys} cell={(f) => (
      <label className={`m-cell${invalid.has(f.key) ? ' invalid' : ''}`} htmlFor={`m-${f.key}`}>
        <span className="m-label">{f.label}</span>
        <span className="m-input">
          <input
            id={`m-${f.key}`}
            data-key={f.key}
            inputMode="decimal"
            autoComplete="off"
            placeholder="—"
            value={values[f.key] ?? ''}
            onChange={(e) => onChange(f.key, e.target.value)}
            aria-invalid={invalid.has(f.key) || undefined}
          />
          <span className="unit">in</span>
        </span>
        <span className="m-hint">{hint?.(f.key) ?? ''}</span>
      </label>
    )} />
  );
}

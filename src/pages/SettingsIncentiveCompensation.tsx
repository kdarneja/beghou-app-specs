import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SvgIcon } from '@progress/kendo-react-common';
import { Button } from '@progress/kendo-react-buttons';
import { NumericTextBox, type NumericTextBoxChangeEvent, Switch, Checkbox, type CheckboxChangeEvent } from '@progress/kendo-react-inputs';
import { Upload } from '@progress/kendo-react-upload';
import { arrowLeftIcon } from '@progress/kendo-svg-icons';
import { TERRITORIES } from '../data/territories';
import { SaveNotification } from '../components/SaveNotification';

// Settings → Incentive Compensation config page. Three sections:
//   1. Upload plan document (Kendo Upload, PDF/DOCX)
//   2. Goal Refinement (% adjusted limit + negative-growth toggle)
//   3. Territory Goal Limits (editable grid + inline bulk-apply) — per the mini PRD
// All mocked; Save actions show a green success Notification below the AppBar.

interface LimitRow {
  id: string;
  name: string;
  min: number | null;
  max: number | null;
}

// A few seeded caps to illustrate (rest uncapped), keyed to the shared T1–T8.
const SEED_LIMITS: Record<string, { min: number | null; max: number | null }> = {
  '0001': { min: 200, max: 450 },
  '0003': { min: null, max: 520 },
  '0005': { min: 120, max: null },
  '0007': { min: 150, max: 300 },
};

export default function SettingsIncentiveCompensation() {
  // --- Goal Refinement settings ---
  // Default 10% to match the ±10% guardrail the app demonstrates.
  const [pctLimit, setPctLimit] = useState<number | null>(10);
  const [negativeGrowth, setNegativeGrowth] = useState(false);
  // Last-saved snapshot; Save enables only when the current values differ.
  const [grSaved, setGrSaved] = useState({ pctLimit: 10 as number | null, negativeGrowth: false });
  const grDirty = pctLimit !== grSaved.pctLimit || negativeGrowth !== grSaved.negativeGrowth;

  // --- Territory Goal Limits ---
  const initialRows = useMemo<LimitRow[]>(
    () => TERRITORIES.map((t) => ({ id: t.id, name: t.name, min: SEED_LIMITS[t.id]?.min ?? null, max: SEED_LIMITS[t.id]?.max ?? null })),
    [],
  );
  const [rows, setRows] = useState<LimitRow[]>(initialRows);
  const [limitsSaved, setLimitsSaved] = useState(() => JSON.stringify(initialRows));
  const limitsDirty = JSON.stringify(rows) !== limitsSaved;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMin, setBulkMin] = useState<number | null>(null);
  const [bulkMax, setBulkMax] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2600);
  };

  const setRowValue = (id: string, key: 'min' | 'max', value: number | null) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const toggleRow = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });

  const applyBulk = () => {
    // Overwrites Min/Max on every selected row with the entered values (PRD).
    setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, min: bulkMin, max: bulkMax } : r)));
    setSelected(new Set());
    setBulkMin(null);
    setBulkMax(null);
  };
  const clearSelection = () => setSelected(new Set());

  const selectedCount = selected.size;
  const num = useMemo(() => ({ spinners: false as const, format: 'n0' as const }), []);

  return (
    <div className="beghou-page set-page">
      <Link to="/settings" className="set-back">
        <SvgIcon icon={arrowLeftIcon} /> back to settings
      </Link>

      <div className="set-ic-grid">
        {/* Left column */}
        <div className="set-ic-col">
          {/* Upload plan document */}
          <section className="set-card set-card--panel">
            <h2 className="set-panel-title">Upload plan document</h2>
            <Upload
              batch={false}
              multiple={false}
              autoUpload={false}
              defaultFiles={[]}
              restrictions={{ allowedExtensions: ['.pdf', '.docx'] }}
              // No saveUrl — mock only; files just list locally.
            />
            <p className="set-upload-hint">Only PDF or DOCX</p>
          </section>

          {/* Goal Refinement */}
          <section className="set-card set-card--panel">
            <h2 className="set-panel-title">Goal Refinement</h2>
            <label className="set-field-label" htmlFor="pct-limit">% Adjusted limit to Proposed Goal (1-100%)</label>
            <NumericTextBox
              id="pct-limit"
              className="set-pct-input"
              value={pctLimit}
              onChange={(e: NumericTextBoxChangeEvent) => setPctLimit(e.value)}
              min={1}
              max={100}
              spinners={false}
              placeholder="e.g., 5%"
            />
            <div className="set-toggle-row">
              <span className="set-field-label">Negative Growth Allowed</span>
              <Switch checked={negativeGrowth} onChange={(e) => setNegativeGrowth(e.value)} onLabel="ON" offLabel="OFF" />
            </div>
            <div className="set-card__actions">
              <Button themeColor="primary" disabled={!grDirty} onClick={() => { setGrSaved({ pctLimit, negativeGrowth }); showToast('Goal Refinement settings saved'); }}>Save</Button>
            </div>
          </section>
        </div>

        {/* Right column — Territory Goal Limits */}
        <section className="set-card set-card--panel set-tgl">
          <h2 className="set-panel-title">Territory Goal Limits</h2>
          <p className="set-panel-desc">
            Set min/max volume goal caps for territories under this district. Limits are optional — leave a row blank to apply no cap.
          </p>
          <p className="set-panel-hint">Select one or more territories to apply limits in bulk.</p>

          {selectedCount > 0 && (
            <div className="set-bulk-bar">
              <span className="set-bulk-label">Set for {selectedCount} territor{selectedCount === 1 ? 'y' : 'ies'}:</span>
              <NumericTextBox className="set-bulk-input" value={bulkMin} onChange={(e: NumericTextBoxChangeEvent) => setBulkMin(e.value)} placeholder="Min" {...num} />
              <NumericTextBox className="set-bulk-input" value={bulkMax} onChange={(e: NumericTextBoxChangeEvent) => setBulkMax(e.value)} placeholder="Max" {...num} />
              <Button themeColor="primary" onClick={applyBulk}>Apply</Button>
              <button type="button" className="set-bulk-clear" onClick={clearSelection}>Clear selection</button>
            </div>
          )}

          <table className="set-tgl-grid">
            <thead>
              <tr>
                <th className="set-tgl-check" />
                <th className="set-tgl-left">Territory ID</th>
                <th className="set-tgl-left">Territory Name</th>
                <th>Min Volume Goal</th>
                <th>Max Volume Goal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={selected.has(r.id) ? 'set-tgl-row--sel' : undefined}>
                  <td className="set-tgl-check">
                    <Checkbox checked={selected.has(r.id)} onChange={(e: CheckboxChangeEvent) => toggleRow(r.id, !!e.value)} />
                  </td>
                  <td className="set-tgl-left set-tgl-id">{r.id}</td>
                  <td className="set-tgl-left">{r.name}</td>
                  <td>
                    <NumericTextBox className="set-tgl-input" value={r.min} onChange={(e: NumericTextBoxChangeEvent) => setRowValue(r.id, 'min', e.value)} placeholder="No min" {...num} />
                  </td>
                  <td>
                    <NumericTextBox className="set-tgl-input" value={r.max} onChange={(e: NumericTextBoxChangeEvent) => setRowValue(r.id, 'max', e.value)} placeholder="No max" {...num} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="set-card__actions">
            <Button themeColor="primary" disabled={!limitsDirty} onClick={() => { setLimitsSaved(JSON.stringify(rows)); showToast('Territory goal limits saved'); }}>Save</Button>
          </div>
        </section>
      </div>

      <SaveNotification text={toast} onClose={() => setToast(null)} />
    </div>
  );
}

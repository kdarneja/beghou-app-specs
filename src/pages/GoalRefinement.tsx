import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SvgIcon } from '@progress/kendo-react-common';
import { Button } from '@progress/kendo-react-buttons';
import { SaveNotification } from '../components/SaveNotification';
import { NumericTextBox, type NumericTextBoxChangeEvent, TextArea, type TextAreaChangeEvent, RadioButton } from '@progress/kendo-react-inputs';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { DropDownList, type DropDownListChangeEvent } from '@progress/kendo-react-dropdowns';
import { Grid, GridColumn, type GridCustomCellProps, type GridDetailExpandChangeEvent, type GridDetailRowProps } from '@progress/kendo-react-grid';
import {
  Chart,
  ChartArea,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartValueAxisTitle,
  ChartSeries,
  ChartSeriesItem,
  ChartLegend,
  ChartTooltip,
} from '@progress/kendo-react-charts';
import {
  downloadIcon,
  eyeIcon,
  arrowsSwapIcon,
  fileReportIcon,
  xIcon,
  pencilIcon,
  commentIcon,
  chevronLeftIcon,
  chevronRightIcon,
  warningTriangleIcon,
} from '@progress/kendo-svg-icons';

// ============================================================================
// Goal Refinement — Incentive Compensation → Goal Settings (DM/TM view).
// Self-contained page; all data mocked. Built per Goal_Refinement_PRD_v1.md.
// Guardrails: (1) per-territory +/-10% band; (2) district total exact match.
// ============================================================================

interface VolumePoint {
  period: string;
  volume: number;
}

interface TerritoryGoalRow {
  territoryNumber: string;
  territoryName: string;
  baselineVolume: number;
  lastQuarterVolume: number;
  lastQuarterGoal: number;
  lastQuarterTRx: number; // dialog-only
  proposedGoal: number;
  adjustedGoal: number; // editable; reset baseline is proposedGoal
  volumeHistory: VolumePoint[];
  comment: string; // saved from the Territory Profile dialog; drives the grid flag
}

const HISTORY_MONTHS = [
  "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25", "Dec '25",
  "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "Jun '26",
];

// Monthly history ramping up to the given prev-quarter volume (profile chart).
const histTo = (v: number): VolumePoint[] => {
  const start = Math.round(v * 0.78);
  return HISTORY_MONTHS.map((period, i) => ({ period, volume: Math.round(start + ((v - start) * i) / 11) }));
};

// DM view = DM1's 8 territories (T1–T8), the same IDs/names/metrics as the RM
// view's DM1 and the admin Territory Goal Limits grid, so values stay consistent
// across the app (KD). Metrics mirror RM_SEED DM1: prev-quarter volume, baseline,
// prev-quarter goal, proposed (= RM "Proposed"/calculated goal). A few adjusted
// values are pre-seeded off-proposed to demo the guardrail colouring + validations;
// proposedGoal stays the Reset baseline. T3 carries the shared comment (flag).
const SEED_COMMENTS: Record<string, string> = {
  '0003': 'Territory lost two key accounts this quarter.',
};

const SEED_ROWS: Omit<TerritoryGoalRow, 'comment'>[] = [
  { territoryNumber: '0001', territoryName: 'Territory 1', baselineVolume: 302, lastQuarterVolume: 270, lastQuarterGoal: 339, lastQuarterTRx: 512, proposedGoal: 388, adjustedGoal: 400, volumeHistory: histTo(270) },
  { territoryNumber: '0002', territoryName: 'Territory 2', baselineVolume: 379, lastQuarterVolume: 385, lastQuarterGoal: 347, lastQuarterTRx: 705, proposedGoal: 165, adjustedGoal: 165, volumeHistory: histTo(385) },
  { territoryNumber: '0003', territoryName: 'Territory 3', baselineVolume: 148, lastQuarterVolume: 311, lastQuarterGoal: 158, lastQuarterTRx: 588, proposedGoal: 462, adjustedGoal: 500, volumeHistory: histTo(311) },
  { territoryNumber: '0004', territoryName: 'Territory 4', baselineVolume: 255, lastQuarterVolume: 159, lastQuarterGoal: 408, lastQuarterTRx: 333, proposedGoal: 165, adjustedGoal: 165, volumeHistory: histTo(159) },
  { territoryNumber: '0005', territoryName: 'Territory 5', baselineVolume: 444, lastQuarterVolume: 255, lastQuarterGoal: 202, lastQuarterTRx: 498, proposedGoal: 151, adjustedGoal: 175, volumeHistory: histTo(255) },
  { territoryNumber: '0006', territoryName: 'Territory 6', baselineVolume: 449, lastQuarterVolume: 425, lastQuarterGoal: 109, lastQuarterTRx: 812, proposedGoal: 364, adjustedGoal: 364, volumeHistory: histTo(425) },
  { territoryNumber: '0007', territoryName: 'Territory 7', baselineVolume: 405, lastQuarterVolume: 371, lastQuarterGoal: 474, lastQuarterTRx: 704, proposedGoal: 245, adjustedGoal: 300, volumeHistory: histTo(371) },
  { territoryNumber: '0008', territoryName: 'Territory 8', baselineVolume: 123, lastQuarterVolume: 119, lastQuarterGoal: 316, lastQuarterTRx: 266, proposedGoal: 361, adjustedGoal: 361, volumeHistory: histTo(119) },
];

// National Average — static external benchmark, non-editable, not a guardrail
// (PRD §4.5). Values taken from the mock; does not recompute with edits.
const NATIONAL_AVERAGE = {
  lastQuarterVolume: 186,
  lastQuarterGoal: 208,
  proposedGoal: 372,
  adjustedGoal: 262,
};
// Same formula as every row: VtMG = Adjusted − Proposed.
const NAT_AVG_VTMG = NATIONAL_AVERAGE.adjustedGoal - NATIONAL_AVERAGE.proposedGoal;

const GUARDRAIL_BAND = 0.1; // +/-10% per-territory band (PRD §5.1)

// ASSUMPTION (SME updates): Product is a new data-granularity dimension. In this
// mock the dropdown selects one product and every row shows it in the Product
// column; changing it is display-only (real backend key change is noted in the
// SME's memo, out of scope for the mock). Realistic pharma placeholder names.
const PRODUCTS = ['Dylura', 'Renvexa', 'Cardizol XR'];

// ---- Derivations (computed live, not stored — PRD §7) ----------------------
const pctAdjusted = (r: TerritoryGoalRow) =>
  r.proposedGoal === 0 ? 0 : (r.adjustedGoal - r.proposedGoal) / r.proposedGoal;

const isEdited = (r: TerritoryGoalRow) => r.adjustedGoal !== r.proposedGoal;

// Boundary is inclusive — exactly +/-10% is WITHIN the guardrail (PRD §9).
const withinBand = (r: TerritoryGoalRow) => Math.abs(pctAdjusted(r)) <= GUARDRAIL_BAND + 1e-9;

type RowStatus = 'default' | 'ok' | 'violation';
const rowStatus = (r: TerritoryGoalRow): RowStatus =>
  !isEdited(r) ? 'default' : withinBand(r) ? 'ok' : 'violation';

// Volume to Meet Goal = Adjusted Goal − Proposed Goal (confirmed by KD).
// % Growth to Meet Goal expresses that same delta as a share of the Proposed
// Goal, so the two columns are consistent (VtMG absolute, % relative, same base).
// NOTE: with these definitions % Growth to Meet Goal is numerically identical to
// % Adjusted — flag for KD if % Growth should use a different denominator.
// "Volume Adjusted" column (SME) = Adjusted − Proposed (same value the old
// Volume-to-Meet-Goal computed).
const volumeToMeetGoal = (r: TerritoryGoalRow) => r.adjustedGoal - r.proposedGoal;
const pctGrowthToMeetGoal = (r: TerritoryGoalRow) =>
  r.proposedGoal === 0 ? 0 : volumeToMeetGoal(r) / r.proposedGoal;
// ASSUMPTION (SME): Prev Quarter Attainment = Prev Quarter Volume / Prev Quarter Goal.
const prevQuarterAttainment = (r: TerritoryGoalRow) =>
  r.lastQuarterGoal === 0 ? 0 : r.lastQuarterVolume / r.lastQuarterGoal;

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const fmt = (n: number) => n.toLocaleString('en-US');
const fmtPct = (p: number) => {
  const v = Math.round(p * 1000) / 10; // one decimal
  return v < 0 ? `(${Math.abs(v)})%` : `${v}%`;
};

// ---- Validation rules — data-driven so more can be added without touching the
// dialog (PRD §6.7 / §11.5). ------------------------------------------------
interface ValidationRule {
  id: string;
  message: string;
  isFailing: (rows: TerritoryGoalRow[]) => boolean;
}
const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'per-territory-band',
    message: 'Adjusted Goals must be within 10% of the Proposed Goals.',
    isFailing: (rows) => rows.some((r) => rowStatus(r) === 'violation'),
  },
  {
    id: 'district-total-match',
    message: 'District Proposed and Adjusted Goals must be same.',
    isFailing: (rows) => sum(rows.map((r) => r.adjustedGoal)) !== sum(rows.map((r) => r.proposedGoal)),
  },
];

type RedistributeMode = 'proportionate' | 'equal';

// ---- Auto Redistribute = "resolve to all-green" ----------------------------
// Produces a fully valid state: every row within ±10% of its Proposed goal AND
// the group total back to the Proposed total. Two steps:
//   1) Clamp each row into its ±10% band (clears individual band violations,
//      including rows the user pushed too far).
//   2) The clamp shifts the total; redistribute that residual across the rows
//      that still have band headroom until the total matches Proposed again.
// `mode` governs how the residual is spread: proportionate (weighted by each
// row's Proposed goal) or equal. Feasible because all-at-Proposed is a valid
// all-green solution, so there is always enough in-band headroom to net out.
function rebalanceWithinBand(items: { proposed: number; adjusted: number }[], mode: RedistributeMode): number[] {
  const lo = items.map((it) => Math.ceil(it.proposed * (1 - GUARDRAIL_BAND)));
  const hi = items.map((it) => Math.floor(it.proposed * (1 + GUARDRAIL_BAND)));
  const clamped = items.map((it, i) => Math.min(hi[i], Math.max(lo[i], it.adjusted)));
  const target = sum(items.map((it) => it.proposed));
  const need = target - sum(clamped); // signed amount still to apply
  if (need === 0) return clamped;
  const add = need > 0;
  const caps = clamped.map((v, i) => (add ? hi[i] - v : v - lo[i])); // capacity in the needed direction
  const weights = items.map((it) => (mode === 'proportionate' ? it.proposed : 1));
  const totalW = items.reduce((s, _it, i) => s + (caps[i] > 0 ? weights[i] : 0), 0) || 1;
  const give = new Array(items.length).fill(0);
  let remaining = Math.abs(need);
  // Proportional/equal pass, capped at each row's headroom.
  for (let i = 0; i < items.length && remaining > 0; i++) {
    if (caps[i] <= 0) continue;
    const g = Math.min(caps[i], remaining, Math.round(Math.abs(need) * (weights[i] / totalW)));
    give[i] = g;
    remaining -= g;
  }
  // Greedy fill any leftover from rounding / capped rows.
  for (let i = 0; i < items.length && remaining > 0; i++) {
    const room = caps[i] - give[i];
    if (room <= 0) continue;
    const g = Math.min(room, remaining);
    give[i] += g;
    remaining -= g;
  }
  return clamped.map((v, i) => v + (add ? give[i] : -give[i]));
}

function redistribute(rows: TerritoryGoalRow[], mode: RedistributeMode): TerritoryGoalRow[] {
  const next = rebalanceWithinBand(rows.map((r) => ({ proposed: r.proposedGoal, adjusted: r.adjustedGoal })), mode);
  return rows.map((r, i) => ({ ...r, adjustedGoal: next[i] }));
}

// Chart colours — mock uses navy (Proposed) + light blue (Adjusted).
const PROPOSED_COLOR = '#020434';
const ADJUSTED_COLOR = '#008DE7'; // "Sky Pulse" accent from the token file

// ============================================================================
// Comparison chart (grouped columns, live)
// ============================================================================
function ComparisonChart({ rows }: { rows: TerritoryGoalRow[] }) {
  const categories = rows.map((r) => r.territoryName);
  const proposed = rows.map((r) => r.proposedGoal);
  const adjusted = rows.map((r) => r.adjustedGoal);
  return (
    <div className="gr-chart-card">
      <Chart style={{ height: 340 }} transitions={false}>
        <ChartArea background="#ffffff" />
        <ChartTooltip shared />
        <ChartCategoryAxis>
          <ChartCategoryAxisItem categories={categories} majorGridLines={{ visible: false }} />
        </ChartCategoryAxis>
        <ChartValueAxis>
          <ChartValueAxisItem max={500} majorUnit={100} majorGridLines={{ color: '#e5e7eb' }}>
            <ChartValueAxisTitle text="Units" />
          </ChartValueAxisItem>
        </ChartValueAxis>
        <ChartSeries>
          <ChartSeriesItem type="column" name="Proposed Goal" data={proposed} color={PROPOSED_COLOR} gap={1.5} spacing={0.3} />
          <ChartSeriesItem type="column" name="Adjusted Goal" data={adjusted} color={ADJUSTED_COLOR} gap={1.5} spacing={0.3} />
        </ChartSeries>
        <ChartLegend position="bottom" />
      </Chart>
    </div>
  );
}

// ============================================================================
// Territory Profile dialog — read-only fields + editable Adjusted Goal (wired
// to the same row state), volume-history chart, and pagination.
// ============================================================================
function VolumeHistoryChart({ row }: { row: TerritoryGoalRow }) {
  const cats = [...row.volumeHistory.map((p) => p.period), 'Next Q'];
  const volume = [...row.volumeHistory.map((p) => p.volume), null];
  const atGoal = (v: number) => cats.map((_, i) => (i === cats.length - 1 ? v : null));
  return (
    <Chart style={{ height: 260 }} transitions={false}>
      <ChartArea background="#ffffff" />
      <ChartTooltip shared />
      <ChartCategoryAxis>
        <ChartCategoryAxisItem categories={cats} labels={{ rotation: 'auto', font: '10px Inter' }} />
      </ChartCategoryAxis>
      <ChartValueAxis>
        <ChartValueAxisItem>
          <ChartValueAxisTitle text="Volume" />
        </ChartValueAxisItem>
      </ChartValueAxis>
      <ChartSeries>
        <ChartSeriesItem type="line" name="Volume" data={volume as number[]} color="#2F4F4F" markers={{ visible: true, size: 5 }} />
        <ChartSeriesItem type="line" name="Adjusted Goal" data={atGoal(row.adjustedGoal) as number[]} color={ADJUSTED_COLOR} markers={{ visible: true, size: 8 }} />
        <ChartSeriesItem type="line" name="Proposed Goal" data={atGoal(row.proposedGoal) as number[]} color={PROPOSED_COLOR} markers={{ visible: true, size: 8 }} />
        <ChartSeriesItem type="line" name="Last Quarter Goal" data={atGoal(row.lastQuarterGoal) as number[]} color="#C5C5CF" markers={{ visible: true, size: 8 }} />
      </ChartSeries>
      <ChartLegend position="bottom" />
    </Chart>
  );
}

function ProfileField({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="gr-pf-field">
      <span className="gr-pf-label">{label}</span>
      <span className={`gr-pf-value${strong ? ' gr-pf-value--strong' : ''}`}>{value}</span>
    </div>
  );
}

function TerritoryProfileDialog({
  rows, index, product, onIndex, onAdjust, onComment, onClose,
}: {
  rows: TerritoryGoalRow[];
  index: number;
  product: string;
  onIndex: (i: number) => void;
  onAdjust: (territoryNumber: string, value: number) => void;
  onComment: (territoryNumber: string, comment: string) => void;
  onClose: () => void;
}) {
  const row = rows[index];
  const status = rowStatus(row);
  // Comment draft; resync when paging to another territory.
  const [commentDraft, setCommentDraft] = useState(row.comment);
  useEffect(() => setCommentDraft(row.comment), [row.territoryNumber, row.comment]);
  const commentDirty = commentDraft !== row.comment;
  return (
    <Dialog title="Territory Profile" onClose={onClose} width={720} className="gr-dialog gr-profile-dialog">
      <div className="gr-pf-grid">
        <ProfileField label="Territory ID" value={row.territoryNumber} />
        <ProfileField label="Territory Name" value={row.territoryName} />
        <ProfileField label="Product" value={product} />
        <ProfileField label="Prev Quarter Volume" value={fmt(row.lastQuarterVolume)} />
        <ProfileField label="Prev Quarter Goal" value={fmt(row.lastQuarterGoal)} />
        <ProfileField label="Prev Quarter Attainment" value={fmtPct(prevQuarterAttainment(row))} />
        <ProfileField label="Last Quarter TRx" value={fmt(row.lastQuarterTRx)} />
        <ProfileField label="Baseline Volume" value={fmt(row.baselineVolume)} />
        <ProfileField label="Proposed Goal" value={fmt(row.proposedGoal)} />
        <div className="gr-pf-field">
          <span className="gr-pf-label">
            Adjusted Goal
            {/* ASSUMPTION (PRD §11.3): field is always editable; the pencil is a
                decorative/redundant affordance, not an edit toggle. */}
            <SvgIcon icon={pencilIcon} className="gr-pf-pencil" />
          </span>
          <span className="gr-pf-value">
            <span className={`gr-adj-wrap gr-adj-wrap--${status}`}>
              <NumericTextBox
                value={row.adjustedGoal}
                onChange={(e: NumericTextBoxChangeEvent) => onAdjust(row.territoryNumber, e.value ?? 0)}
                spinners
                format="n0"
                width={130}
              />
            </span>
          </span>
        </div>
        <ProfileField label="Volume Adjusted" value={fmt(volumeToMeetGoal(row))} />
        <ProfileField label="% Adjusted" value={<span className={status === 'violation' ? 'gr-neg' : undefined}>{fmtPct(pctAdjusted(row))}</span>} />
        <ProfileField label="% Growth over Prev Quarter" value={fmtPct(pctGrowthToMeetGoal(row))} />
      </div>

      <div className="gr-pf-chart">
        <div className="gr-pf-chart-title">Volume History</div>
        <VolumeHistoryChart row={row} />
      </div>

      <div className="gr-pf-comment">
        <div className="gr-pf-comment-head">
          <span className="gr-pf-comment-title">Comment</span>
          <Button
            size="small"
            themeColor="primary"
            disabled={!commentDirty}
            onClick={() => onComment(row.territoryNumber, commentDraft.trim())}
          >
            Save Comment
          </Button>
        </div>
        <TextArea
          value={commentDraft}
          onChange={(e: TextAreaChangeEvent) => setCommentDraft(String(e.value ?? ''))}
          rows={3}
          placeholder="Add a note explaining this adjustment…"
        />
      </div>

      <div className="gr-pf-footer">
        <div className="gr-pf-pager">
          <button className="gr-icon-btn" disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Previous territory">
            <SvgIcon icon={chevronLeftIcon} />
          </button>
          <span className="gr-pf-pager-label">{index + 1} of {rows.length} items</span>
          <button className="gr-icon-btn" disabled={index === rows.length - 1} onClick={() => onIndex(index + 1)} aria-label="Next territory">
            <SvgIcon icon={chevronRightIcon} />
          </button>
        </div>
        <Button themeColor="primary" onClick={onClose}>OK</Button>
      </div>
    </Dialog>
  );
}

// ============================================================================
// Confirm + Validations dialogs
// ============================================================================
function ConfirmDialog({
  title, body, confirmLabel, onConfirm, onCancel,
}: {
  title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog title={title} onClose={onCancel} width={440} className="gr-dialog">
      <p className="gr-dialog-body">{body}</p>
      <DialogActionsBar>
        <Button onClick={onCancel}>Cancel</Button>
        <Button themeColor="primary" onClick={onConfirm}>{confirmLabel}</Button>
      </DialogActionsBar>
    </Dialog>
  );
}

function AutoRedistributeDialog({
  mode, onMode, onConfirm, onCancel,
  unit = 'territories', unitSingular = 'territory', scope = 'district',
}: {
  mode: RedistributeMode;
  onMode: (m: RedistributeMode) => void;
  onConfirm: () => void;
  onCancel: () => void;
  unit?: string;
  unitSingular?: string;
  scope?: string;
}) {
  return (
    <Dialog title="Auto Redistribute" onClose={onCancel} width={500} className="gr-dialog">
      <p className="gr-dialog-body">
        This will bring every {unitSingular} within 10% of its Proposed goal and
        rebalance so the {scope} total matches Proposed. Choose how to spread the correction.
      </p>
      <div className="gr-redist-options">
        <label className="gr-redist-opt">
          <RadioButton name="redist-mode" checked={mode === 'proportionate'} onChange={() => onMode('proportionate')} />
          <span className="gr-redist-text">
            <span className="gr-redist-title">Proportionate</span>
            <span className="gr-redist-desc">Weighted by each {unitSingular}'s Proposed goal.</span>
          </span>
        </label>
        <label className="gr-redist-opt">
          <RadioButton name="redist-mode" checked={mode === 'equal'} onChange={() => onMode('equal')} />
          <span className="gr-redist-text">
            <span className="gr-redist-title">Equal</span>
            <span className="gr-redist-desc">Split evenly across {unit} with room to change.</span>
          </span>
        </label>
      </div>
      <DialogActionsBar>
        <Button onClick={onCancel}>Cancel</Button>
        <Button themeColor="primary" onClick={onConfirm}>Yes, redistribute</Button>
      </DialogActionsBar>
    </Dialog>
  );
}

function ValidationsDialog({ failing, onClose }: { failing: { id: string; message: string }[]; onClose: () => void }) {
  return (
    <Dialog title="Validations" onClose={onClose} width={460} className="gr-dialog">
      <div className="gr-msgbox">
        <SvgIcon icon={warningTriangleIcon} className="gr-msgbox__icon" />
        <ul className="gr-validations-list">
          {failing.map((r) => (
            <li key={r.id}>{r.message}</li>
          ))}
        </ul>
      </div>
      <DialogActionsBar>
        <Button themeColor="primary" onClick={onClose}>OK</Button>
      </DialogActionsBar>
    </Dialog>
  );
}

// ============================================================================
// Main page
// ============================================================================
function DmView({ product }: { product: string }) {
  const [rows, setRows] = useState<TerritoryGoalRow[]>(() =>
    SEED_ROWS.map((r) => ({ ...r, comment: SEED_COMMENTS[r.territoryNumber] ?? '' })),
  );
  const [profileIndex, setProfileIndex] = useState<number | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [showRedistribute, setShowRedistribute] = useState(false);
  const [redistributeMode, setRedistributeMode] = useState<RedistributeMode>('proportionate');
  const [showValidations, setShowValidations] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    // ASSUMPTION (PRD §11.4): toast copy not specified — placeholder strings.
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2600);
  };

  const setAdjusted = (territoryNumber: string, value: number) => {
    setRows((prev) => prev.map((r) => (r.territoryNumber === territoryNumber ? { ...r, adjustedGoal: value } : r)));
  };
  const clearRow = (territoryNumber: string) => {
    setRows((prev) => prev.map((r) => (r.territoryNumber === territoryNumber ? { ...r, adjustedGoal: r.proposedGoal } : r)));
  };
  const setComment = (territoryNumber: string, comment: string) => {
    setRows((prev) => prev.map((r) => (r.territoryNumber === territoryNumber ? { ...r, comment } : r)));
  };

  const failingRules = useMemo(() => VALIDATION_RULES.filter((rule) => rule.isFailing(rows)), [rows]);
  const isValid = failingRules.length === 0;

  const totals = useMemo(() => {
    const proposed = sum(rows.map((r) => r.proposedGoal));
    const adjusted = sum(rows.map((r) => r.adjustedGoal));
    return {
      baseline: sum(rows.map((r) => r.baselineVolume)),
      lastQuarterVolume: sum(rows.map((r) => r.lastQuarterVolume)),
      lastQuarterGoal: sum(rows.map((r) => r.lastQuarterGoal)),
      proposed,
      adjusted,
      pctAdjusted: proposed === 0 ? 0 : (adjusted - proposed) / proposed,
      // District VtMG = Σ(Adjusted − Proposed) = ΣAdjusted − ΣProposed, and its %
      // is that over ΣProposed — same formula as each row, so the column sums check out.
      volumeToMeetGoal: adjusted - proposed,
      pctGrowth: proposed === 0 ? 0 : (adjusted - proposed) / proposed,
      match: adjusted === proposed,
    };
  }, [rows]);

  const onSave = () => showToast('Progress saved'); // no validation (PRD §6.1)
  const onSubmit = () => {
    // Always re-check validity here, never trust the warning label (PRD §9).
    if (VALIDATION_RULES.some((r) => r.isFailing(rows))) {
      setShowValidations(true);
    } else {
      showToast('Goals submitted successfully');
    }
  };
  const onResetConfirm = () => {
    setRows((prev) => prev.map((r) => ({ ...r, adjustedGoal: r.proposedGoal })));
    setShowReset(false);
  };
  const onRedistributeConfirm = () => {
    setRows((prev) => redistribute(prev, redistributeMode));
    setShowRedistribute(false);
  };

  const openProfile = (territoryNumber: string) => {
    setProfileIndex(rows.findIndex((r) => r.territoryNumber === territoryNumber));
  };

  return (
    <>
      {/* Data grid — custom table styled to the Beghou/Kendo look. Chosen over
          the Kendo Grid component because this grid needs inline steppers,
          per-cell guardrail tints, computed columns, and two spanning summary
          rows — all far cleaner in a purpose-built table. */}
      <div className="gr-grid-card">
        <table className="gr-grid">
          <thead>
            <tr>
              <th className="gr-th-left">Territory ID</th>
              <th className="gr-th-left">Territory Name</th>
              <th className="gr-th-left">Product</th>
              <th>Prev Quarter Volume</th>
              <th>Prev Quarter Goal</th>
              <th>Prev Quarter Attainment</th>
              <th>Baseline Volume</th>
              <th>Proposed Goal</th>
              <th>Adjusted Goal</th>
              <th>Volume Adjusted</th>
              <th>% Adjusted</th>
              <th>% Growth over Prev Quarter</th>
              <th className="gr-th-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = rowStatus(r);
              const pa = pctAdjusted(r);
              return (
                <tr key={r.territoryNumber}>
                  <td className="gr-td-left">
                    <button className="gr-link" onClick={() => openProfile(r.territoryNumber)}>
                      {r.territoryNumber}
                      {r.comment.trim() !== '' && (
                        <SvgIcon icon={commentIcon} className="gr-comment-flag" size="small" aria-label="Has comment" />
                      )}
                    </button>
                  </td>
                  <td className="gr-td-left">{r.territoryName}</td>
                  <td className="gr-td-left">{product}</td>
                  <td>{fmt(r.lastQuarterVolume)}</td>
                  <td>{fmt(r.lastQuarterGoal)}</td>
                  <td>{fmtPct(prevQuarterAttainment(r))}</td>
                  <td>{fmt(r.baselineVolume)}</td>
                  <td>{fmt(r.proposedGoal)}</td>
                  <td className="gr-td-adj">
                    <span className={`gr-adj-wrap gr-adj-wrap--${status}`}>
                      <NumericTextBox
                        value={r.adjustedGoal}
                        onChange={(e: NumericTextBoxChangeEvent) => setAdjusted(r.territoryNumber, e.value ?? 0)}
                        spinners
                        format="n0"
                        width={112}
                      />
                      <button className="gr-clear-btn" onClick={() => clearRow(r.territoryNumber)} aria-label="Reset to Proposed Goal">
                        <SvgIcon icon={xIcon} />
                      </button>
                    </span>
                  </td>
                  <td>{fmt(volumeToMeetGoal(r))}</td>
                  <td className={status === 'violation' ? 'gr-neg' : undefined}>{fmtPct(pa)}</td>
                  <td>{fmtPct(pctGrowthToMeetGoal(r))}</td>
                  <td className="gr-td-center">
                    <button className="gr-icon-btn" onClick={() => openProfile(r.territoryNumber)} aria-label="Open territory profile">
                      <SvgIcon icon={fileReportIcon} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="gr-sum-row">
              <td className="gr-sum-label" colSpan={3}>National Average</td>
              <td>{fmt(NATIONAL_AVERAGE.lastQuarterVolume)}</td>
              <td>{fmt(NATIONAL_AVERAGE.lastQuarterGoal)}</td>
              <td>{fmtPct(NATIONAL_AVERAGE.lastQuarterGoal === 0 ? 0 : NATIONAL_AVERAGE.lastQuarterVolume / NATIONAL_AVERAGE.lastQuarterGoal)}</td>
              <td>-</td>
              <td>{fmt(NATIONAL_AVERAGE.proposedGoal)}</td>
              <td>{fmt(NATIONAL_AVERAGE.adjustedGoal)}</td>
              <td>{fmt(NAT_AVG_VTMG)}</td>
              <td>-</td>
              <td>{fmtPct(NAT_AVG_VTMG / NATIONAL_AVERAGE.proposedGoal)}</td>
              <td />
            </tr>
            <tr className="gr-sum-row gr-sum-row--total">
              <td className="gr-sum-label" colSpan={3}>District Total</td>
              <td>{fmt(totals.lastQuarterVolume)}</td>
              <td>{fmt(totals.lastQuarterGoal)}</td>
              <td>{fmtPct(totals.lastQuarterGoal === 0 ? 0 : totals.lastQuarterVolume / totals.lastQuarterGoal)}</td>
              <td>{fmt(totals.baseline)}</td>
              <td>{fmt(totals.proposed)}</td>
              <td className={totals.match ? undefined : 'gr-total-adj--bad'}>{fmt(totals.adjusted)}</td>
              <td>{fmt(totals.volumeToMeetGoal)}</td>
              <td className={totals.match ? undefined : 'gr-neg'}>{fmtPct(totals.pctAdjusted)}</td>
              <td>{fmtPct(totals.pctGrowth)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer action row */}
      <div className="gr-footer-actions">
        {!isValid && (
          <button className="gr-resolve" onClick={() => setShowValidations(true)}>
            <SvgIcon icon={warningTriangleIcon} /> Resolve Validations
          </button>
        )}
        <Button onClick={() => setShowRedistribute(true)}>
          <SvgIcon icon={arrowsSwapIcon} /> Auto Redistribute
        </Button>
        <Button onClick={() => setShowReset(true)}>Reset</Button>
        <Button onClick={onSave}>Save</Button>
        <Button themeColor="primary" onClick={onSubmit}>Submit</Button>
      </div>

      <ComparisonChart rows={rows} />

      {/* Dialogs */}
      {profileIndex !== null && (
        <TerritoryProfileDialog
          rows={rows}
          index={profileIndex}
          product={product}
          onIndex={setProfileIndex}
          onAdjust={setAdjusted}
          onComment={setComment}
          onClose={() => setProfileIndex(null)}
        />
      )}
      {showReset && (
        <ConfirmDialog
          title="Reset Adjusted Goals"
          body="This action will remove all adjusted goals and reset the values to be the same as Proposed Goals. Do you want to proceed?"
          confirmLabel="Yes, Reset"
          onConfirm={onResetConfirm}
          onCancel={() => setShowReset(false)}
        />
      )}
      {showRedistribute && (
        <AutoRedistributeDialog
          mode={redistributeMode}
          onMode={setRedistributeMode}
          onConfirm={onRedistributeConfirm}
          onCancel={() => setShowRedistribute(false)}
        />
      )}
      {showValidations && (
        <ValidationsDialog failing={failingRules} onClose={() => setShowValidations(false)} />
      )}

      <SaveNotification text={toast} onClose={() => setToast(null)} />
    </>
  );
}

// ============================================================================
// RM (Regional Manager) view — hierarchical: Region total → Districts (DMs) →
// Territories. Territories are the editable leaves; District subtotals and the
// Region total roll up live. Per KD: BOTH the District Adjusted total and the
// territory Adjusted Goals are editable (editing a District redistributes its
// delta across its territories, proportional to their current adjusted, so the
// District always equals the sum of its territories). The ±10% band is
// admin-configured (GUARDRAIL_BAND); Region Calculated and Adjusted totals must
// match. Columns/values are the SME's example CSV — illustrative, layout-first.
// ============================================================================
interface RmTerritory {
  id: string;
  name: string;
  prevQuarterSales: number;
  baselineSales: number;
  prevQuarterGoals: number;
  currentQuarterSales: number; // retained in data but hidden per SME ("doesn't make sense")
  calculatedGoals: number;
  comment: string;
}
// Per SME: the RM edits the DISTRICT-level Adjusted Goal (the master row). The
// territories under a district are a READ-ONLY reference breakdown; each
// territory's shown adjusted derives proportionally from the district's
// adjustment. A district's adjustedGoals starts at its Calculated total.
interface RmDistrict {
  id: string;
  name: string;
  adjustedGoals: number; // editable at the district level
  territories: RmTerritory[];
}
type RmSumKey = 'prevQuarterSales' | 'baselineSales' | 'prevQuarterGoals' | 'currentQuarterSales' | 'calculatedGoals';

// v = [prevQSales, baselineSales, prevQGoals, currQSales, calculatedGoals].
const rt = (id: string, name: string, v: number[], comment = ''): RmTerritory => ({
  id, name, prevQuarterSales: v[0], baselineSales: v[1], prevQuarterGoals: v[2],
  currentQuarterSales: v[3], calculatedGoals: v[4], comment,
});
// District builder — adjusted defaults to the Calculated total (untouched) unless overridden.
const mkDm = (id: string, name: string, territories: RmTerritory[], adjusted?: number): RmDistrict => ({
  id, name, territories, adjustedGoals: adjusted ?? territories.reduce((s, t) => s + t.calculatedGoals, 0),
});

// From the SME's RM example CSV (numbers illustrative). DM1 is pre-adjusted
// outside the ±10% band (to show a district-level validation + an imbalance);
// DM2/DM3 sit at their Calculated total, so Auto Redistribute has untouched
// districts to spread the imbalance onto.
const RM_SEED: RmDistrict[] = [
  mkDm('DM1', 'Great Lakes', [
    rt('0001', 'Territory 1', [270, 302, 339, 190, 388]),
    rt('0002', 'Territory 2', [385, 379, 347, 275, 165]),
    rt('0003', 'Territory 3', [311, 148, 158, 412, 462], 'Territory lost two key accounts this quarter.'),
    rt('0004', 'Territory 4', [159, 255, 408, 221, 165]),
    rt('0005', 'Territory 5', [255, 444, 202, 274, 151]),
    rt('0006', 'Territory 6', [425, 449, 109, 164, 364]),
    rt('0007', 'Territory 7', [371, 405, 474, 480, 245]),
    rt('0008', 'Territory 8', [119, 123, 316, 134, 361]),
  ], 2050),
  mkDm('DM2', 'Mid-Atlantic', [
    rt('0009', 'Territory 9', [172, 444, 389, 426, 347]),
    rt('0010', 'Territory 10', [468, 148, 374, 498, 307]),
    rt('0011', 'Territory 11', [356, 325, 212, 464, 393]),
    rt('0012', 'Territory 12', [392, 445, 474, 452, 222]),
    rt('0013', 'Territory 13', [368, 478, 176, 357, 265]),
    rt('0014', 'Territory 14', [349, 482, 165, 272, 499]),
    rt('0015', 'Territory 15', [249, 407, 328, 350, 338]),
    rt('0016', 'Territory 16', [215, 211, 206, 481, 494]),
  ]),
  mkDm('DM3', 'Southeast', [
    rt('0017', 'Territory 17', [478, 295, 365, 382, 449]),
    rt('0018', 'Territory 18', [120, 481, 216, 412, 268]),
    rt('0019', 'Territory 19', [407, 192, 179, 316, 377]),
    rt('0020', 'Territory 20', [149, 359, 469, 237, 342]),
    rt('0021', 'Territory 21', [387, 192, 420, 203, 155]),
    rt('0022', 'Territory 22', [447, 363, 311, 295, 383]),
    rt('0023', 'Territory 23', [464, 152, 380, 408, 247]),
    rt('0024', 'Territory 24', [335, 387, 141, 389, 110]),
  ]),
];

const dSum = (d: RmDistrict, key: RmSumKey) => sum(d.territories.map((t) => t[key]));
const dCalc = (d: RmDistrict) => dSum(d, 'calculatedGoals');
const rSum = (data: RmDistrict[], key: RmSumKey) => sum(data.map((d) => dSum(d, key)));
const rCalc = (data: RmDistrict[]) => sum(data.map(dCalc));
const rAdj = (data: RmDistrict[]) => sum(data.map((d) => d.adjustedGoals));
// % Growth over Prev Quarter = (Adjusted − Prev Quarter Goals) / Prev Quarter Goals.
const rmGrowth = (adjusted: number, prevQGoals: number) => (prevQGoals === 0 ? 0 : (adjusted - prevQGoals) / prevQGoals);
// Prev Quarter Attainment = Prev Quarter Volume / Prev Quarter Goal.
const rmAttainment = (prevQVolume: number, prevQGoals: number) => (prevQGoals === 0 ? 0 : prevQVolume / prevQGoals);
// ±band status of an adjusted value against its calculated goal.
const rmStatus = (adjusted: number, calculated: number): RowStatus =>
  adjusted === calculated ? 'default'
    : calculated !== 0 && Math.abs((adjusted - calculated) / calculated) <= GUARDRAIL_BAND + 1e-9 ? 'ok' : 'violation';

const cloneRm = (data: RmDistrict[]) => data.map((d) => ({ ...d, territories: d.territories.map((t) => ({ ...t })) }));

// Auto Redistribute (region-wide) — "resolve to all-green": clamp every DISTRICT
// into its ±10% band and redistribute the residual across districts so the region
// total matches Proposed again. Spreads across ALL districts (not within one).
function rmRedistribute(data: RmDistrict[], mode: RedistributeMode): RmDistrict[] {
  const next = rebalanceWithinBand(data.map((d) => ({ proposed: dCalc(d), adjusted: d.adjustedGoals })), mode);
  return data.map((d, i) => ({ ...d, adjustedGoals: next[i] }));
}

// RM comparison chart — Calculated vs Adjusted per District.
function RmChart({ data }: { data: RmDistrict[] }) {
  const categories = data.map((d) => d.id);
  const calc = data.map(dCalc);
  const adj = data.map((d) => d.adjustedGoals);
  return (
    <div className="gr-chart-card">
      <Chart style={{ height: 300 }} transitions={false}>
        <ChartArea background="#ffffff" />
        <ChartTooltip shared />
        <ChartCategoryAxis>
          <ChartCategoryAxisItem categories={categories} majorGridLines={{ visible: false }} />
        </ChartCategoryAxis>
        <ChartValueAxis>
          <ChartValueAxisItem majorGridLines={{ color: '#e5e7eb' }}>
            <ChartValueAxisTitle text="Goals" />
          </ChartValueAxisItem>
        </ChartValueAxis>
        <ChartSeries>
          <ChartSeriesItem type="column" name="Calculated Goals" data={calc} color={PROPOSED_COLOR} gap={1.5} spacing={0.3} />
          <ChartSeriesItem type="column" name="Adjusted Goals" data={adj} color={ADJUSTED_COLOR} gap={1.5} spacing={0.3} />
        </ChartSeries>
        <ChartLegend position="bottom" />
      </Chart>
    </div>
  );
}

// RM Territory Profile dialog — parity with the DM profile (fields, editable
// Adjusted, comment + grid flag, sales/goals chart, pagination).
// Read-only territory reference (RM edits at the district level, not here).
// Comments are still editable — they're notes, not the goal.
function RmProfileDialog({
  territories, index, product, adjustedById, onIndex, onComment, onClose,
}: {
  territories: RmTerritory[];
  index: number;
  product: string;
  adjustedById: Record<string, number>; // derived (proportional) adjusted per territory
  onIndex: (i: number) => void;
  onComment: (id: string, comment: string) => void;
  onClose: () => void;
}) {
  const t = territories[index];
  const adjusted = adjustedById[t.id] ?? t.calculatedGoals;
  const [draft, setDraft] = useState(t.comment);
  useEffect(() => setDraft(t.comment), [t.id, t.comment]);
  const dirty = draft !== t.comment;
  return (
    <Dialog title="Territory Profile" onClose={onClose} width={640} className="gr-dialog gr-profile-dialog">
      <div className="gr-pf-grid">
        <ProfileField label="Territory ID" value={t.id} />
        <ProfileField label="Territory Name" value={t.name} />
        <ProfileField label="Product" value={product} />
        <ProfileField label="Prev Quarter Volume" value={fmt(t.prevQuarterSales)} />
        <ProfileField label="Prev Quarter Goal" value={fmt(t.prevQuarterGoals)} />
        <ProfileField label="Prev Quarter Attainment" value={fmtPct(rmAttainment(t.prevQuarterSales, t.prevQuarterGoals))} />
        <ProfileField label="Baseline Volume" value={fmt(t.baselineSales)} />
        <ProfileField label="Proposed Goal" value={fmt(t.calculatedGoals)} />
        <ProfileField label="Adjusted Goal" value={fmt(adjusted)} />
        <ProfileField label="Volume Adjusted" value={fmt(adjusted - t.calculatedGoals)} />
        <ProfileField label="% Growth over Prev Quarter" value={fmtPct(rmGrowth(adjusted, t.prevQuarterGoals))} />
      </div>

      <div className="gr-pf-chart">
        <div className="gr-pf-chart-title">Volume & Goals</div>
        <Chart style={{ height: 220 }} transitions={false}>
          <ChartArea background="#ffffff" />
          <ChartCategoryAxis>
            <ChartCategoryAxisItem categories={['Prev Q Volume', 'Proposed', 'Adjusted']} />
          </ChartCategoryAxis>
          <ChartValueAxis><ChartValueAxisItem /></ChartValueAxis>
          <ChartSeries>
            <ChartSeriesItem type="column" data={[t.prevQuarterSales, t.calculatedGoals, adjusted]} color={PROPOSED_COLOR} />
          </ChartSeries>
        </Chart>
      </div>

      <div className="gr-pf-comment">
        <div className="gr-pf-comment-head">
          <span className="gr-pf-comment-title">Comment</span>
          <Button size="small" themeColor="primary" disabled={!dirty} onClick={() => onComment(t.id, draft.trim())}>Save Comment</Button>
        </div>
        <TextArea value={draft} onChange={(e: TextAreaChangeEvent) => setDraft(String(e.value ?? ''))} rows={3} placeholder="Add a note about this territory…" />
      </div>

      <div className="gr-pf-footer">
        <div className="gr-pf-pager">
          <button className="gr-icon-btn" disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Previous territory"><SvgIcon icon={chevronLeftIcon} /></button>
          <span className="gr-pf-pager-label">{index + 1} of {territories.length} items</span>
          <button className="gr-icon-btn" disabled={index === territories.length - 1} onClick={() => onIndex(index + 1)} aria-label="Next territory"><SvgIcon icon={chevronRightIcon} /></button>
        </div>
        <Button themeColor="primary" onClick={onClose}>OK</Button>
      </div>
    </Dialog>
  );
}

// Aggregated master row (a District rolled up from its territories).
interface RmMasterRow {
  id: string;
  name: string;
  product: string;
  prevQuarterSales: number;
  baselineSales: number;
  prevQuarterGoals: number;
  currentQuarterSales: number;
  calculatedGoals: number;
  adjustedGoals: number;
  district: RmDistrict;
}

// Context lets the module-level (stable) master cell reach RmView's handlers
// without RmView re-creating it — recreating the cell would remount the
// NumericTextBox and drop focus mid-edit.
interface RmDetailCtx {
  onDmAdjust: (id: string, v: number) => void;
  onOpenProfile: (id: string) => void;
  onDistrictAction: (id: string) => void;
}
const RmDetailContext = createContext<RmDetailCtx | null>(null);

// Shared right-aligned numeric cell (reads props.field on master row or territory).
const rmNumCell = (p: GridCustomCellProps) => (
  <td {...p.tdProps} className={`${p.tdProps?.className ?? ''} gr-num`}>{fmt(Number(p.dataItem[p.field ?? ''] ?? 0))}</td>
);
// Left-aligned plain text cell (Name, Product).
const rmTextCell = (p: GridCustomCellProps) => (
  <td {...p.tdProps}>{String(p.dataItem[p.field ?? ''] ?? '')}</td>
);
// Prev Quarter Attainment = Prev Quarter Volume / Prev Quarter Goal.
const rmAttainmentCell = (p: GridCustomCellProps) => (
  <td {...p.tdProps} className={`${p.tdProps?.className ?? ''} gr-num`}>{fmtPct(rmAttainment(Number(p.dataItem.prevQuarterSales ?? 0), Number(p.dataItem.prevQuarterGoals ?? 0)))}</td>
);
// Volume Adjusted = Adjusted − Proposed (Calculated).
const rmVolAdjCell = (p: GridCustomCellProps) => (
  <td {...p.tdProps} className={`${p.tdProps?.className ?? ''} gr-num`}>{fmt(Number(p.dataItem.adjustedGoals ?? 0) - Number(p.dataItem.calculatedGoals ?? 0))}</td>
);
// % Adjusted = (Adjusted − Calculated) / Calculated; red text outside the band.
const rmPctAdjCell = (p: GridCustomCellProps) => {
  const adj = Number(p.dataItem.adjustedGoals ?? 0);
  const calc = Number(p.dataItem.calculatedGoals ?? 0);
  const status = rmStatus(adj, calc);
  const pct = calc === 0 ? 0 : (adj - calc) / calc;
  return <td {...p.tdProps} className={`${p.tdProps?.className ?? ''} gr-num${status === 'violation' ? ' gr-neg' : ''}`}>{fmtPct(pct)}</td>;
};

// Shared column widths for the master + detail grids — sum exceeds the capped
// content column, so both grids scroll horizontally (and stay aligned).
const RM_W = { id: 150, name: 170, product: 150, pqv: 160, pqg: 160, pqa: 160, base: 150, proposed: 150, adj: 180, voladj: 150, pctAdj: 120, growth: 210, action: 90 };
// % Growth over Prev Quarter — computed at any level.
const rmGrowthCell = (p: GridCustomCellProps) => (
  <td {...p.tdProps} className={`${p.tdProps?.className ?? ''} gr-num`}>{fmtPct(rmGrowth(Number(p.dataItem.adjustedGoals ?? 0), Number(p.dataItem.prevQuarterGoals ?? 0)))}</td>
);
// District (master) Adjusted — EDITABLE (the RM sets the district goal here),
// with the ±10% band tint.
const rmDmAdjCell = (p: GridCustomCellProps) => {
  const row = p.dataItem as RmMasterRow;
  const ctx = useContext(RmDetailContext)!;
  const status = rmStatus(row.adjustedGoals, row.calculatedGoals);
  return (
    <td {...p.tdProps} className={`${p.tdProps?.className ?? ''} gr-td-adj`}>
      <span className={`gr-adj-wrap gr-adj-wrap--${status}`}>
        <NumericTextBox value={row.adjustedGoals} onChange={(e: NumericTextBoxChangeEvent) => ctx.onDmAdjust(row.id, e.value ?? 0)} spinners format="n0" width={120} />
      </span>
    </td>
  );
};
// District ID (master) — link opens/drills the district (comment flag reserved).
const rmDistrictIdCell = (p: GridCustomCellProps) => {
  const row = p.dataItem as RmMasterRow;
  const ctx = useContext(RmDetailContext)!;
  return (
    <td {...p.tdProps}>
      <button className="gr-link" onClick={() => ctx.onDistrictAction(row.id)}>{row.id}</button>
    </td>
  );
};
// District (master) Action — ASSUMPTION (SME "same as DM view"): there is no
// district-level profile in this build, so the Action drills into the district
// (expands/collapses its territories), the natural district-level "callout".
const rmDistrictActionCell = (p: GridCustomCellProps) => {
  const row = p.dataItem as RmMasterRow;
  const ctx = useContext(RmDetailContext)!;
  return (
    <td {...p.tdProps} className={`${p.tdProps?.className ?? ''} gr-td-center`}>
      <button className="gr-icon-btn" onClick={() => ctx.onDistrictAction(row.id)} aria-label="Drill into district">
        <SvgIcon icon={fileReportIcon} />
      </button>
    </td>
  );
};
// Territory (detail) ID — link to the read-only profile callout + comment flag.
const rmTerrLabelCell = (p: GridCustomCellProps) => {
  const t = p.dataItem as RmTerritory;
  const ctx = useContext(RmDetailContext)!;
  return (
    <td {...p.tdProps}>
      <button className="gr-link" onClick={() => ctx.onOpenProfile(t.id)}>
        {t.id}
        {t.comment.trim() !== '' && <SvgIcon icon={commentIcon} className="gr-comment-flag" size="small" aria-label="Has comment" />}
      </button>
    </td>
  );
};

// Detail grid — the expanded District's READ-ONLY territories. Each territory's
// shown Adjusted derives proportionally from the district's adjustment (SME).
// No Action column here — the Territory ID link is the callout.
function RmTerritoryDetail(props: GridDetailRowProps) {
  const row = props.dataItem as RmMasterRow;
  const ratio = row.calculatedGoals === 0 ? 1 : row.adjustedGoals / row.calculatedGoals;
  const territories = row.district.territories.map((t) => ({
    ...t, product: row.product, adjustedGoals: Math.round(t.calculatedGoals * ratio),
  }));
  return (
    <div className="gr-rm-detail">
      <Grid data={territories}>
        <GridColumn field="id" title="Territory ID" cells={{ data: rmTerrLabelCell }} width={RM_W.id} />
        <GridColumn field="name" title="Territory Name" cells={{ data: rmTextCell }} width={RM_W.name} />
        <GridColumn field="product" title="Product" cells={{ data: rmTextCell }} width={RM_W.product} />
        <GridColumn field="prevQuarterSales" title="Prev Quarter Volume" cells={{ data: rmNumCell }} width={RM_W.pqv} />
        <GridColumn field="prevQuarterGoals" title="Prev Quarter Goal" cells={{ data: rmNumCell }} width={RM_W.pqg} />
        <GridColumn title="Prev Quarter Attainment" cells={{ data: rmAttainmentCell }} width={RM_W.pqa} />
        <GridColumn field="baselineSales" title="Baseline Volume" cells={{ data: rmNumCell }} width={RM_W.base} />
        <GridColumn field="calculatedGoals" title="Proposed Goal" cells={{ data: rmNumCell }} width={RM_W.proposed} />
        <GridColumn field="adjustedGoals" title="Adjusted Goal" cells={{ data: rmNumCell }} width={RM_W.adj} />
        <GridColumn title="Volume Adjusted" cells={{ data: rmVolAdjCell }} width={RM_W.voladj} />
        <GridColumn title="% Adjusted" cells={{ data: rmPctAdjCell }} width={RM_W.pctAdj} />
        <GridColumn title="% Growth over Prev Quarter" cells={{ data: rmGrowthCell }} width={RM_W.growth} />
      </Grid>
    </div>
  );
}

// Validations grouped per District (DM1: …, DM2: …) plus a Region row.
function RmValidationsDialog({ groups, onClose }: { groups: { label: string; messages: string[] }[]; onClose: () => void }) {
  return (
    <Dialog title="Validations" onClose={onClose} width={480} className="gr-dialog">
      <div className="gr-msgbox">
        <SvgIcon icon={warningTriangleIcon} className="gr-msgbox__icon" />
        <div className="gr-val-groups">
          {groups.map((g) => (
            <div key={g.label} className="gr-val-group">
              <div className="gr-val-group__label">{g.label}</div>
              <ul className="gr-validations-list">
                {g.messages.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <DialogActionsBar>
        <Button themeColor="primary" onClick={onClose}>OK</Button>
      </DialogActionsBar>
    </Dialog>
  );
}

function RmView({ product }: { product: string }) {
  const [data, setData] = useState<RmDistrict[]>(() => cloneRm(RM_SEED));
  // Start all districts collapsed (empty descriptor).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [profileIndex, setProfileIndex] = useState<number | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [showRedistribute, setShowRedistribute] = useState(false);
  const [showValidations, setShowValidations] = useState(false);
  const [redistributeMode, setRedistributeMode] = useState<RedistributeMode>('proportionate');
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (text: string) => { setToast(text); window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2600); };

  const flatTerritories = useMemo(() => data.flatMap((d) => d.territories), [data]);

  const setDmAdjusted = (id: string, value: number) =>
    setData((prev) => prev.map((d) => (d.id === id ? { ...d, adjustedGoals: value } : d)));
  const setTerrComment = (id: string, comment: string) =>
    setData((prev) => prev.map((d) => ({ ...d, territories: d.territories.map((t) => (t.id === id ? { ...t, comment } : t)) })));

  const regionCalc = rCalc(data);
  const regionAdj = rAdj(data);
  const regionMatches = regionAdj === regionCalc;

  // Validations grouped by District (DM1: …, DM2: …) + a Region-level group.
  const validationGroups = useMemo(() => {
    const groups: { label: string; messages: string[] }[] = [];
    data.forEach((d) => {
      if (rmStatus(d.adjustedGoals, dCalc(d)) === 'violation') {
        groups.push({ label: d.id, messages: ['Adjusted Goal must be within 10% of the Calculated Goal.'] });
      }
    });
    if (rAdj(data) !== rCalc(data)) {
      groups.push({ label: 'Region', messages: ['Region Calculated and Adjusted Goals must be same.'] });
    }
    return groups;
  }, [data]);
  const isValid = validationGroups.length === 0;

  const onSave = () => showToast('Progress saved');
  const onSubmit = () => { if (!isValid) setShowValidations(true); else showToast('Goals submitted successfully'); };
  const onResetConfirm = () => { setData((prev) => prev.map((d) => ({ ...d, adjustedGoals: dCalc(d) }))); setShowReset(false); };
  const onRedistributeConfirm = () => { setData((prev) => rmRedistribute(prev, redistributeMode)); setShowRedistribute(false); };
  const openProfile = (id: string) => setProfileIndex(flatTerritories.findIndex((t) => t.id === id));
  const toggleDistrict = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Derived (proportional) adjusted per territory — for the profile callout.
  const adjustedById = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((d) => {
      const ratio = dCalc(d) === 0 ? 1 : d.adjustedGoals / dCalc(d);
      d.territories.forEach((t) => { map[t.id] = Math.round(t.calculatedGoals * ratio); });
    });
    return map;
  }, [data]);

  // Master rows = Districts (editable Adjusted Goal; other columns roll up).
  const master: RmMasterRow[] = data.map((d) => ({
    id: d.id,
    name: d.name,
    product,
    prevQuarterSales: dSum(d, 'prevQuarterSales'),
    baselineSales: dSum(d, 'baselineSales'),
    prevQuarterGoals: dSum(d, 'prevQuarterGoals'),
    currentQuarterSales: dSum(d, 'currentQuarterSales'),
    calculatedGoals: dCalc(d),
    adjustedGoals: d.adjustedGoals,
    district: d,
  }));
  const onDetailExpandChange = (e: GridDetailExpandChangeEvent) =>
    setExpanded(e.detailExpand as Record<string, boolean>);
  const num = (v: number) => <td className="gr-num">{fmt(v)}</td>;
  const regionVolAdj = regionAdj - regionCalc;

  return (
    <>
      {/* Master-detail grid: Districts have the editable Adjusted Goal and
          expand to their read-only territories; RM Total is the grid footer. */}
      <div className="gr-grid-card">
        <RmDetailContext.Provider value={{ onDmAdjust: setDmAdjusted, onOpenProfile: openProfile, onDistrictAction: toggleDistrict }}>
          <Grid
            data={master}
            detail={RmTerritoryDetail}
            dataItemKey="id"
            detailExpand={expanded}
            onDetailExpandChange={onDetailExpandChange}
            className="gr-rm-master"
          >
            <GridColumn field="id" title="District ID" width={RM_W.id} cells={{ data: rmDistrictIdCell, footerCell: () => <td className="gr-rm-total-label">RM Total</td> }} />
            <GridColumn field="name" title="District Name" width={RM_W.name} cells={{ data: rmTextCell, footerCell: () => <td /> }} />
            <GridColumn field="product" title="Product" width={RM_W.product} cells={{ data: rmTextCell, footerCell: () => <td /> }} />
            <GridColumn field="prevQuarterSales" title="Prev Quarter Volume" width={RM_W.pqv} cells={{ data: rmNumCell, footerCell: () => num(rSum(data, 'prevQuarterSales')) }} />
            <GridColumn field="prevQuarterGoals" title="Prev Quarter Goal" width={RM_W.pqg} cells={{ data: rmNumCell, footerCell: () => num(rSum(data, 'prevQuarterGoals')) }} />
            <GridColumn title="Prev Quarter Attainment" width={RM_W.pqa} cells={{ data: rmAttainmentCell, footerCell: () => <td className="gr-num">{fmtPct(rmAttainment(rSum(data, 'prevQuarterSales'), rSum(data, 'prevQuarterGoals')))}</td> }} />
            <GridColumn field="baselineSales" title="Baseline Volume" width={RM_W.base} cells={{ data: rmNumCell, footerCell: () => num(rSum(data, 'baselineSales')) }} />
            <GridColumn field="calculatedGoals" title="Proposed Goal" width={RM_W.proposed} cells={{ data: rmNumCell, footerCell: () => num(regionCalc) }} />
            <GridColumn title="Adjusted Goal" width={RM_W.adj} cells={{ data: rmDmAdjCell, footerCell: () => <td className={`gr-num${regionMatches ? '' : ' gr-total-adj--bad'}`}>{fmt(regionAdj)}</td> }} />
            <GridColumn title="Volume Adjusted" width={RM_W.voladj} cells={{ data: rmVolAdjCell, footerCell: () => num(regionVolAdj) }} />
            <GridColumn title="% Adjusted" width={RM_W.pctAdj} cells={{ data: rmPctAdjCell, footerCell: () => <td className={`gr-num${regionMatches ? '' : ' gr-neg'}`}>{fmtPct(regionCalc === 0 ? 0 : regionVolAdj / regionCalc)}</td> }} />
            <GridColumn title="% Growth over Prev Quarter" width={RM_W.growth} cells={{ data: rmGrowthCell, footerCell: () => <td className="gr-num">{fmtPct(rmGrowth(regionAdj, rSum(data, 'prevQuarterGoals')))}</td> }} />
            <GridColumn title="Action" width={RM_W.action} cells={{ data: rmDistrictActionCell, footerCell: () => <td /> }} />
          </Grid>
        </RmDetailContext.Provider>
      </div>

      <div className="gr-footer-actions">
        {!isValid && (
          <button className="gr-resolve" onClick={() => setShowValidations(true)}><SvgIcon icon={warningTriangleIcon} /> Resolve Validations</button>
        )}
        <Button onClick={() => setShowRedistribute(true)}><SvgIcon icon={arrowsSwapIcon} /> Auto Redistribute</Button>
        <Button onClick={() => setShowReset(true)}>Reset</Button>
        <Button onClick={onSave}>Save</Button>
        <Button themeColor="primary" onClick={onSubmit}>Submit</Button>
      </div>

      <RmChart data={data} />

      {profileIndex !== null && (
        <RmProfileDialog territories={flatTerritories} index={profileIndex} product={product} adjustedById={adjustedById} onIndex={setProfileIndex} onComment={setTerrComment} onClose={() => setProfileIndex(null)} />
      )}
      {showReset && (
        <ConfirmDialog title="Reset Adjusted Goals" body="This action will reset every district's Adjusted Goal back to its Calculated Goal. Do you want to proceed?" confirmLabel="Yes, Reset" onConfirm={onResetConfirm} onCancel={() => setShowReset(false)} />
      )}
      {showRedistribute && (
        <AutoRedistributeDialog mode={redistributeMode} onMode={setRedistributeMode} onConfirm={onRedistributeConfirm} onCancel={() => setShowRedistribute(false)} unit="districts" unitSingular="district" scope="region" />
      )}
      {showValidations && (
        <RmValidationsDialog groups={validationGroups} onClose={() => setShowValidations(false)} />
      )}
      <SaveNotification text={toast} onClose={() => setToast(null)} />
    </>
  );
}

// Page shell + the Impersonate role switch (a spec-conveyance mechanism, not
// production UI — hence the dashed "scaffold" treatment).
export default function GoalRefinement() {
  const [role, setRole] = useState<'District Manager' | 'Regional Manager'>('District Manager');
  const [product, setProduct] = useState<string>(PRODUCTS[0]);
  return (
    <div className="beghou-page gr-page">
      <div className="gr-topbar">
        <div className="gr-topbar__left">
          <div className="gr-impersonate" role="note" aria-label="Spec mechanism, not part of the UI">
            <span className="gr-impersonate__label">Impersonate</span>
            <DropDownList
              className="gr-impersonate__dd"
              data={['District Manager', 'Regional Manager']}
              value={role}
              onChange={(e: DropDownListChangeEvent) => setRole(e.value)}
            />
            <span className="gr-impersonate__hint">Spec mechanism — not part of the UI</span>
          </div>
          {/* Product selector — real UI. Selecting a product changes the data key
              (per SME memo); mock is display-only. */}
          <div className="gr-product">
            <span className="gr-product__label">Product</span>
            <DropDownList
              className="gr-product__dd"
              data={PRODUCTS}
              value={product}
              onChange={(e: DropDownListChangeEvent) => setProduct(e.value)}
            />
          </div>
        </div>
        {/* Export exports for the signed-in role (single button, no dropdown);
            both are placeholders — no behavior wired. */}
        <div className="gr-action-row">
          <Button className="gr-export-btn"><SvgIcon icon={downloadIcon} /> Export</Button>
          <Button themeColor="primary" className="gr-audit-btn"><SvgIcon icon={eyeIcon} /> View Audit Log</Button>
        </div>
      </div>
      {role === 'District Manager' ? <DmView product={product} /> : <RmView product={product} />}
    </div>
  );
}

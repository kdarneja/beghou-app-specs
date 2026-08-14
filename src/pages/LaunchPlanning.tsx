import { cloneElement, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Gantt,
  GanttMonthView,
  GanttYearView,
  GanttRow,
  type GanttColumnProps,
  type GanttRowProps,
} from '@progress/kendo-react-gantt';
import { Button, ButtonGroup } from '@progress/kendo-react-buttons';
import { DropDownList, type DropDownListChangeEvent } from '@progress/kendo-react-dropdowns';
import { DatePicker, type DatePickerChangeEvent } from '@progress/kendo-react-dateinputs';
import { Popup } from '@progress/kendo-react-popup';
import { SvgIcon } from '@progress/kendo-react-common';
import {
  imageIcon,
  fileExcelIcon,
  fullscreenIcon,
  arrowRotateCwIcon,
  paletteIcon,
} from '@progress/kendo-svg-icons';
import { ZonedDate } from '@progress/kendo-date-math';

/**
 * Page — Launch Planning (Systems Roadmap)
 *
 * A pharma launch roadmap built on the Kendo React Gantt. Each system is one
 * Gantt task spanning its full Requirements → Hypercare timeline; the six
 * implementation phases are painted as hard-stop segments of a single bar via
 * a per-task linear-gradient (the Gantt has no per-task-bar render hook, so we
 * key a generated stylesheet on the bar's `data-task-id` attribute). This
 * gives the wireframe's "one row, many colors" look while staying inside the
 * real Kendo task bar.
 *
 * Function groups are parent tasks; their summary bars are hidden so the group
 * rows read as labeled section bands. Launch gates (Today, Topline Data, NDA
 * Submission, …) render as vertical reference lines overlaid on the timeline's
 * scroll content and computed from the same date→pixel mapping the Gantt uses.
 *
 * Wired: status filter, function filter, view label, gate overlay. The export
 * buttons and Refresh are presentational (prototype scope).
 */

// ---- Phase model -----------------------------------------------------------

const PHASES = [
  'Discovery',
  'Selection',
  'Contracting',
  'Implementation',
  'Go-Live',
] as const;
type Phase = (typeof PHASES)[number];

// Phase palette (Beghou-named swatches).
const PHASE_COLORS: Record<Phase, string> = {
  Discovery: '#767676', // Grey
  Selection: '#008DE7', // Sky Pulse
  Contracting: '#61CE7D', // Green Signal
  Implementation: '#002889', // Deep Blueprint
  'Go-Live': '#4B0082', // Indigo
};

const GATE_COLOR = '#E60F65'; // Magenta

type Status = 'At risk' | 'Watch' | 'On track';

// ---- Timeline bounds (mirror the From/To pickers) --------------------------

const RANGE_START = new Date(2025, 11, 31); // Dec 31 2025 (From picker default)
const RANGE_END = new Date(2027, 11, 30); // Dec 30 2027 (To picker default)
const TODAY = new Date(2026, 5, 10); // workspace "today"

// Effective timeline the Gantt actually renders — snapped to whole-month
// boundaries (MonthView slots are per-month). Both the task bars and our gate
// overlay map dates linearly in time across this same span, so they align.
const EFFECTIVE_START = new Date(2025, 11, 1); // Dec 1 2025
const EFFECTIVE_END = new Date(2028, 0, 1); // Jan 1 2028
const ZONED_RANGE = {
  start: EFFECTIVE_START,
  end: EFFECTIVE_END,
  zonedStart: ZonedDate.fromLocalDate(EFFECTIVE_START),
  zonedEnd: ZonedDate.fromLocalDate(EFFECTIVE_END),
};

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ---- Data ------------------------------------------------------------------

type SystemDef = { name: string; status: Status; startOffset: number; durations: number[] };
type GroupDef = { fn: string; systems: SystemDef[] };

// Per-system phase durations (in months) for the five phases. Implementation is
// always the long middle bar. startOffset = months after RANGE_START the first
// phase begins. Hand-tuned so bars cascade like the wireframe.
const D = {
  short: [2, 2, 1, 4, 1],
  mid: [2, 2, 2, 5, 2],
  long: [3, 2, 2, 6, 2],
};

const GROUPS: GroupDef[] = [
  {
    fn: 'Medical Affairs',
    systems: [
      { name: 'MSL Platform', status: 'On track', startOffset: 4, durations: D.mid },
      { name: 'MSL CRM', status: 'On track', startOffset: 5, durations: D.short },
      { name: 'Medical Information Hub', status: 'Watch', startOffset: 2, durations: D.mid },
      { name: 'Grants Portal', status: 'On track', startOffset: 3, durations: D.short },
      { name: 'Ad Board Platform', status: 'On track', startOffset: 1, durations: D.short },
    ],
  },
  {
    fn: 'Commercial Operations',
    systems: [
      { name: 'Master Data Mgmt', status: 'At risk', startOffset: 2, durations: D.long },
      { name: 'Commercial Data Warehouse', status: 'Watch', startOffset: 3, durations: D.long },
      { name: 'Reporting & Analytics', status: 'On track', startOffset: 5, durations: D.mid },
      { name: 'IT Needs Assessment', status: 'On track', startOffset: 1, durations: D.short },
    ],
  },
  {
    fn: 'Sales and Sales Training',
    systems: [
      { name: 'Field CRM', status: 'At risk', startOffset: 4, durations: D.long },
      { name: 'IC Administration', status: 'On track', startOffset: 5, durations: D.mid },
      { name: 'Field Vehicle Program', status: 'On track', startOffset: 3, durations: D.short },
      { name: 'Roster Mgmt', status: 'Watch', startOffset: 4, durations: D.mid },
    ],
  },
  {
    fn: 'Marketing',
    systems: [
      { name: 'PromoMats / MLR', status: 'On track', startOffset: 3, durations: D.long },
      { name: 'Marketing Automation', status: 'On track', startOffset: 4, durations: D.mid },
      { name: 'Speaker Program Platform', status: 'On track', startOffset: 2, durations: D.short },
    ],
  },
  {
    fn: 'Market Access',
    systems: [
      { name: 'Contracting Platform', status: 'At risk', startOffset: 5, durations: D.long },
      { name: 'Patient Hub', status: 'At risk', startOffset: 4, durations: D.mid },
      { name: 'GPO Portal', status: 'On track', startOffset: 1, durations: D.short },
    ],
  },
  {
    fn: 'Information Technology',
    systems: [
      { name: 'SSO / Identity', status: 'On track', startOffset: 3, durations: D.mid },
      { name: 'Email & Collab', status: 'On track', startOffset: 4, durations: D.short },
      { name: 'Endpoint Mgmt', status: 'Watch', startOffset: 2, durations: D.mid },
    ],
  },
  {
    fn: 'Patient Services',
    systems: [
      { name: 'Patient Support Portal', status: 'At risk', startOffset: 4, durations: D.long },
      { name: 'Co-Pay Platform', status: 'On track', startOffset: 3, durations: D.mid },
    ],
  },
  {
    fn: 'Supply Chain',
    systems: [
      { name: 'Trade Mgmt System', status: 'Watch', startOffset: 5, durations: D.long },
      { name: 'Distribution Hub', status: 'On track', startOffset: 4, durations: D.mid },
    ],
  },
  {
    fn: 'Quality',
    systems: [
      { name: 'QMS Platform', status: 'On track', startOffset: 2, durations: D.mid },
      { name: 'Document Mgmt', status: 'On track', startOffset: 3, durations: D.short },
    ],
  },
  {
    fn: 'Pharmacovigilance',
    systems: [
      { name: 'AE Reporting System', status: 'On track', startOffset: 4, durations: D.mid },
      { name: 'Safety Database', status: 'On track', startOffset: 5, durations: D.mid },
    ],
  },
  {
    fn: 'Finance',
    systems: [
      { name: 'Adaptive Planning', status: 'On track', startOffset: 4, durations: D.mid },
      { name: 'ERP Integration', status: 'Watch', startOffset: 3, durations: D.long },
    ],
  },
  {
    fn: 'Human Resources',
    systems: [{ name: 'HRIS', status: 'On track', startOffset: 2, durations: D.mid }],
  },
  {
    fn: 'Legal & Compliance',
    systems: [
      { name: 'Contract Mgmt', status: 'On track', startOffset: 3, durations: D.mid },
      { name: 'Compliance Training', status: 'On track', startOffset: 4, durations: D.short },
    ],
  },
];

// Launch gates — the vertical reference lines anchored to dates each function
// needs to be live. `tone` flips the label chip so Today reads differently.
type Gate = { label: string; date: Date; tone: 'today' | 'gate' };
const GATES: Gate[] = [
  { label: 'Today', date: TODAY, tone: 'today' },
  { label: 'Topline Data', date: new Date(2026, 7, 15), tone: 'gate' },
  { label: 'NDA Submission', date: new Date(2026, 11, 10), tone: 'gate' },
  { label: 'File Acceptance', date: new Date(2027, 1, 20), tone: 'gate' },
  { label: 'Field Sales Onboard', date: new Date(2027, 3, 15), tone: 'gate' },
  { label: 'Launch Readiness', date: new Date(2027, 8, 1), tone: 'gate' },
  { label: 'PDUFA', date: new Date(2027, 10, 5), tone: 'gate' },
];

// ---- Task tree construction ------------------------------------------------

type PhaseSeg = { phase: Phase; start: Date; end: Date };
type GanttTask = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  expanded?: boolean;
  isGroup?: boolean;
  status?: Status;
  segments?: PhaseSeg[];
  shade?: string;
  children?: GanttTask[];
};

// Configurable label-cell shades. The admin UI to set these per system is out
// of scope, so each system gets one deterministically (hashed from its name so
// it stays stable across renders) — reads as a random spread across the rows.
const LABEL_SHADES = ['#E1F0FC', '#E4F6E9', '#FBE3E3', '#FCF3D4'];
function shadeFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return LABEL_SHADES[h % LABEL_SHADES.length];
}

function buildSegments(def: SystemDef): PhaseSeg[] {
  const segs: PhaseSeg[] = [];
  let cursor = addMonths(RANGE_START, def.startOffset);
  PHASES.forEach((phase, i) => {
    const end = addMonths(cursor, def.durations[i]);
    segs.push({ phase, start: cursor, end });
    cursor = end;
  });
  return segs;
}

function buildTree(): GanttTask[] {
  let n = 0;
  return GROUPS.map((g, gi) => {
    const children: GanttTask[] = g.systems.map((s) => {
      const segments = buildSegments(s);
      return {
        id: `sys-${n++}`,
        title: s.name,
        start: segments[0].start,
        end: segments[segments.length - 1].end,
        status: s.status,
        segments,
        shade: shadeFor(s.name),
      };
    });
    return {
      id: `grp-${gi}`,
      title: g.fn.toUpperCase(),
      isGroup: true,
      expanded: true,
      start: children.reduce((a, c) => (c.start < a ? c.start : a), children[0].start),
      end: children.reduce((a, c) => (c.end > a ? c.end : a), children[0].end),
      children,
    };
  });
}

const FULL_TREE = buildTree();
const ALL_SYSTEMS = GROUPS.flatMap((g) => g.systems);
const STATUS_COUNTS = {
  All: ALL_SYSTEMS.length,
  'At risk': ALL_SYSTEMS.filter((s) => s.status === 'At risk').length,
  Watch: ALL_SYSTEMS.filter((s) => s.status === 'Watch').length,
  'On track': ALL_SYSTEMS.filter((s) => s.status === 'On track').length,
};

// Linear-gradient with hard stops at each phase boundary, computed as a
// percentage of the bar's own width (which maps linearly to time).
function segmentGradient(segments: PhaseSeg[]): string {
  const total = segments[segments.length - 1].end.getTime() - segments[0].start.getTime();
  const base = segments[0].start.getTime();
  const stops: string[] = [];
  segments.forEach((seg) => {
    const from = ((seg.start.getTime() - base) / total) * 100;
    const to = ((seg.end.getTime() - base) / total) * 100;
    const c = PHASE_COLORS[seg.phase];
    stops.push(`${c} ${from}%`, `${c} ${to}%`);
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

// ---- Filter option lists ---------------------------------------------------

const FUNCTION_OPTIONS = ['All functions', ...GROUPS.map((g) => g.fn)];
const VIEW_OPTIONS = ['Monthly', 'Quarterly', 'Yearly'];

// ---- Component -------------------------------------------------------------

export default function LaunchPlanning() {
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
  const [functionFilter, setFunctionFilter] = useState('All functions');
  const [view, setView] = useState('Quarterly');
  const [from, setFrom] = useState<Date | null>(RANGE_START);
  const [to, setTo] = useState<Date | null>(RANGE_END);
  const [legendOpen, setLegendOpen] = useState(false);

  const ganttWrapRef = useRef<HTMLDivElement>(null);
  const legendAnchor = useRef<HTMLSpanElement>(null);

  // Filtered tree: drop the groups failing the function filter and the systems
  // failing the status filter, then drop any group left empty.
  const tree = useMemo<GanttTask[]>(() => {
    return FULL_TREE.filter(
      (grp) => functionFilter === 'All functions' || grp.title === functionFilter.toUpperCase(),
    )
      .map((grp) => {
        const kids = (grp.children ?? []).filter(
          (sys) => statusFilter === 'All' || sys.status === statusFilter,
        );
        return { ...grp, children: kids };
      })
      .filter((grp) => (grp.children ?? []).length > 0);
  }, [statusFilter, functionFilter]);

  // Per-system gradient stylesheet, keyed on the task bar's data-task-id.
  const gradientCss = useMemo(() => {
    const rules: string[] = [];
    tree.forEach((grp) =>
      (grp.children ?? []).forEach((sys) => {
        if (!sys.segments) return;
        rules.push(
          `.lp-gantt .k-task[data-task-id="${sys.id}"]{background:${segmentGradient(
            sys.segments,
          )} !important;border-color:rgba(2,4,52,0.15) !important;}`,
        );
      }),
    );
    return rules.join('\n');
  }, [tree]);

  const columns: GanttColumnProps[] = useMemo(
    () => [
      {
        field: 'title',
        title: 'FUNCTION / SYSTEM',
        width: 280,
        expandable: true,
      },
    ],
    [],
  );

  // Custom row component: tag group (function) rows so CSS can band them, and
  // mark system rows with their status. We delegate to the default GanttRow and
  // use its `render` hook to clone the built <tr> with extra classes.
  // Timeline header: center the year row, and in Quarterly view relabel the
  // month sub-row with quarter numbers (Q1 '26 at each quarter's first month).
  const TimelineHeaderCell = useMemo(() => {
    return (props: { type: string; range: { start: Date; end: Date }; text: string }) => {
      const { type, range, text } = props;
      // Use the cell's midpoint so a boundary tick (e.g. Jan 1 landing on
      // Dec 31 in local time) can't shift the year/month by one.
      const mid = new Date((range.start.getTime() + range.end.getTime()) / 2);
      if (type === 'year') {
        return <span className="lp-th-year">{mid.getFullYear()}</span>;
      }
      if (type === 'month' && view === 'Quarterly') {
        const m = mid.getMonth();
        if (m % 3 !== 0) return <span />;
        const yy = String(mid.getFullYear()).slice(2);
        return <span className="lp-th-quarter">{`Q${m / 3 + 1} '${yy}`}</span>;
      }
      return <span>{text}</span>;
    };
  }, [view]);

  const Row = (props: GanttRowProps) => (
    <GanttRow
      {...props}
      render={(tr: React.ReactElement<{ className?: string }>, p: GanttRowProps) => {
        const di = p.dataItem as GanttTask | undefined;
        const isGroup = di?.isGroup;
        const status = di?.status;
        const shadeIdx = di?.shade ? LABEL_SHADES.indexOf(di.shade) : -1;
        const className = [
          (tr.props as { className?: string }).className,
          isGroup ? 'lp-group-row' : 'lp-system-row',
          status ? `lp-status-${status.replace(/[^a-z]/gi, '').toLowerCase()}` : '',
          shadeIdx >= 0 ? `lp-shade-${shadeIdx}` : '',
        ]
          .filter(Boolean)
          .join(' ');
        return cloneElement(tr, { className });
      }}
    />
  );

  // ---- Launch-gate overlay -------------------------------------------------
  // Inject vertical reference lines into the Gantt's scrollable grid so they
  // track the date axis and scroll (both axes) with the bars. The timeline
  // starts after the sticky label column; bars map linearly in time across the
  // timeline width, so we mirror that exact mapping here.
  useLayoutEffect(() => {
    const wrap = ganttWrapRef.current;
    if (!wrap) return;
    let raf = 0;
    let overlay: HTMLDivElement | null = null;

    const place = () => {
      const grid = wrap.querySelector('.k-grid') as HTMLElement | null;
      const header = wrap.querySelector('.k-grid-header') as HTMLElement | null;
      const sticky = wrap.querySelector('.k-grid-header-sticky') as HTMLElement | null;
      const totalWidth = grid?.scrollWidth ?? 0;
      if (!grid || !header || !sticky || !totalWidth) {
        raf = requestAnimationFrame(place);
        return;
      }
      const labelW = sticky.getBoundingClientRect().width;
      const headerH = header.offsetHeight;
      const timelineW = totalWidth - labelW;
      // Small gap below the header so the gate labels/lines don't touch its border.
      const GAP = 5;
      const lineTop = headerH + GAP;
      const lineHeight = grid.scrollHeight - headerH - GAP;
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'lp-gates';
        grid.appendChild(overlay);
      }
      overlay.style.width = `${totalWidth}px`;
      overlay.style.height = `${grid.scrollHeight}px`;
      const span = EFFECTIVE_END.getTime() - EFFECTIVE_START.getTime();
      overlay.innerHTML = GATES.map((g) => {
        const frac = (g.date.getTime() - EFFECTIVE_START.getTime()) / span;
        const left = labelW + frac * timelineW;
        return `<div class="lp-gate lp-gate--${g.tone}" style="left:${left}px;top:${lineTop}px;height:${lineHeight}px">
          <span class="lp-gate__label">${g.label}</span>
        </div>`;
      }).join('');
    };

    raf = requestAnimationFrame(place);
    const ro = new ResizeObserver(() => place());
    ro.observe(wrap);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      overlay?.remove();
    };
  }, [tree, view]);

  const resetFilters = () => {
    setStatusFilter('All');
    setFunctionFilter('All functions');
    setView('Quarterly');
    setFrom(RANGE_START);
    setTo(RANGE_END);
  };

  return (
    <div className="beghou-page beghou-page--fill lp-page">
      <style dangerouslySetInnerHTML={{ __html: gradientCss }} />

      {/* Intro + primary actions */}
      <div className="lp-head">
        <div className="lp-intro">
          <p className="lp-subtitle">
            All system implementations across launch workstreams, with launch gates anchored to the
            dates each function needs to be live.
          </p>
          <p className="lp-source">Source: Smartsheet (one-way sync every 5 min).</p>
        </div>
        <div className="lp-actions">
          <Button fillMode="outline" size="medium" svgIcon={fullscreenIcon}>
            Presentation mode
          </Button>
          <Button fillMode="outline" size="medium" svgIcon={imageIcon}>
            Download PNG
          </Button>
          <Button fillMode="outline" size="medium" svgIcon={fileExcelIcon}>
            Export to XLSX
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="lp-filters">
        <label className="lp-field">
          <span className="lp-field__label">Function</span>
          <DropDownList
            data={FUNCTION_OPTIONS}
            value={functionFilter}
            fillMode="outline"
            size="medium"
            onChange={(e: DropDownListChangeEvent) => setFunctionFilter(e.value)}
          />
        </label>

        <div className="lp-field">
          <span className="lp-field__label">Status</span>
          <ButtonGroup>
            <Button
              togglable
              selected={statusFilter === 'All'}
              onClick={() => setStatusFilter('All')}
            >
              All {STATUS_COUNTS.All}
            </Button>
            <Button
              togglable
              selected={statusFilter === 'At risk'}
              onClick={() => setStatusFilter('At risk')}
            >
              At risk {STATUS_COUNTS['At risk']}
            </Button>
            <Button
              togglable
              selected={statusFilter === 'Watch'}
              onClick={() => setStatusFilter('Watch')}
            >
              Watch {STATUS_COUNTS.Watch}
            </Button>
            <Button
              togglable
              selected={statusFilter === 'On track'}
              onClick={() => setStatusFilter('On track')}
            >
              On track {STATUS_COUNTS['On track']}
            </Button>
          </ButtonGroup>
        </div>

        <label className="lp-field">
          <span className="lp-field__label">From</span>
          <DatePicker
            value={from}
            fillMode="outline"
            size="medium"
            onChange={(e: DatePickerChangeEvent) => setFrom(e.value)}
          />
        </label>

        <label className="lp-field">
          <span className="lp-field__label">to</span>
          <DatePicker
            value={to}
            fillMode="outline"
            size="medium"
            onChange={(e: DatePickerChangeEvent) => setTo(e.value)}
          />
        </label>

        <label className="lp-field">
          <span className="lp-field__label">View</span>
          <DropDownList
            data={VIEW_OPTIONS}
            value={view}
            fillMode="outline"
            size="medium"
            onChange={(e: DropDownListChangeEvent) => setView(e.value)}
          />
        </label>

        <Button className="lp-reset" fillMode="flat" size="medium" onClick={resetFilters}>
          Reset
        </Button>

        <span className="lp-sep" aria-hidden="true" />

        <span
          className="lp-legend-trigger"
          ref={legendAnchor}
          onMouseEnter={() => setLegendOpen(true)}
          onMouseLeave={() => setLegendOpen(false)}
          tabIndex={0}
          onFocus={() => setLegendOpen(true)}
          onBlur={() => setLegendOpen(false)}
          role="button"
          aria-label="Show phase legend"
        >
          <SvgIcon icon={paletteIcon} />
          Legend
        </span>
        <Popup
          anchor={legendAnchor.current}
          show={legendOpen}
          anchorAlign={{ horizontal: 'left', vertical: 'bottom' }}
          popupAlign={{ horizontal: 'left', vertical: 'top' }}
          popupClass="lp-legend-pop"
        >
          <div
            className="lp-legend-list"
            onMouseEnter={() => setLegendOpen(true)}
            onMouseLeave={() => setLegendOpen(false)}
          >
            {PHASES.map((p) => (
              <span key={p} className="lp-legend__item">
                <span className="lp-legend__swatch" style={{ background: PHASE_COLORS[p] }} />
                {p}
              </span>
            ))}
            <span className="lp-legend__item">
              <span
                className="lp-legend__swatch lp-legend__swatch--gate"
                style={{ background: GATE_COLOR }}
              />
              Launch gate
            </span>
          </div>
        </Popup>

        <div className="lp-sync">
          <span className="lp-sync__text">Synced 2 mins ago · last edit</span>
          <Button fillMode="flat" size="small" svgIcon={arrowRotateCwIcon} className="lp-sync__btn">
            Refresh now
          </Button>
        </div>
      </div>

      {/* Gantt roadmap */}
      <div
        className={`lp-gantt-wrap${view === 'Quarterly' ? ' lp-q' : ''}`}
        ref={ganttWrapRef}
      >
        <Gantt
          className="lp-gantt"
          taskData={tree as never}
          columns={columns}
          rowHeight={28}
          row={Row}
          taskModelFields={{
            id: 'id',
            start: 'start',
            end: 'end',
            title: 'title',
            children: 'children',
            isExpanded: 'expanded',
          }}
        >
          {view === 'Monthly' ? (
            <GanttMonthView
              slotWidth={64}
              dateRange={ZONED_RANGE}
              timelineHeaderCell={TimelineHeaderCell}
            />
          ) : (
            <GanttYearView
              slotWidth={56}
              dateRange={ZONED_RANGE}
              timelineHeaderCell={TimelineHeaderCell}
            />
          )}
        </Gantt>
      </div>
    </div>
  );
}

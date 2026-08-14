import { useRef, useState } from 'react';
import { Popup } from '@progress/kendo-react-popup';
import { infoCircleIcon } from '@progress/kendo-svg-icons';
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
  ChartSeriesLabels,
  ChartLegend,
  ChartLegendItem,
  ChartTooltip,
} from '@progress/kendo-react-charts';
import { DropDownList, type DropDownListChangeEvent } from '@progress/kendo-react-dropdowns';
import { DatePicker } from '@progress/kendo-react-dateinputs';
import { Button, ButtonGroup, SplitButton } from '@progress/kendo-react-buttons';
import { Grid, GridColumn, type GridCustomCellProps, type GridPageChangeEvent } from '@progress/kendo-react-grid';
import { Circle, Group, Text, geometry } from '@progress/kendo-drawing';

// Render each legend item as a plain filled circle + label in the series colour
// (Kendo's default line-series legend draws a line + marker "lollipop").
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const circleLegend = (e: any) => {
  const box = e.createVisual().bbox();
  const { x, y } = box.origin;
  const h = box.height();
  const color = e.series?.color ?? '#000';
  const label = String(e.options?.text ?? e.series?.name ?? '');
  const group = new Group();
  group.append(new Circle(new geometry.Circle(new geometry.Point(x + 6, y + h / 2), 6), { fill: { color }, stroke: { width: 0 } }));
  group.append(
    new Text(label, new geometry.Point(x + 18, y + h / 2 - 8), {
      fill: { color: '#3f3f46' },
      font: '13px Inter, sans-serif',
    }),
  );
  return group;
};

/**
 * App Visualizations — a dev-facing spec for how charts render inside an app.
 * Three example page views, switched via a DropDownList (the set pattern for
 * sub-view navigation within a page). All built with Kendo Charts on a grey
 * canvas with elevated white cards. Filters and drill-downs are visual only.
 */

const VIEW_OPTIONS = ['Example 1', 'Example 2', 'Example 3'];

const COLOR = {
  attainment: '#2e9b51',
  quota: '#e11d48',
  units: '#f97316',
  quotaLine: '#0d9488',
  dylura: '#f97316',
  menavida: '#4f86e8',
  extoneva: '#16a34a',
  pass: '#1a8a3c',
  fail: '#dc2626',
};

// ---------- Tab 1 data ----------
const QTD_CATS = ['1/05', '1/12', '1/19', '1/26', '2/02', '2/09', '2/16', '2/23', '3/02', '3/09'];
const QTD_ATTAINMENT = [180, 470, 690, 910, 1180, 1666, 1760, 2100, 2780, 3100];
const QTD_QUOTA = QTD_CATS.map(() => 3142); // flat quarter target

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHLY_UNITS = [692, 650, 586, 560, 620, 645, 590, 630, 600, 565, 660, 561];
const MONTHLY_QUOTA = [690, 648, 588, 562, 618, 648, 592, 628, 602, 560, 658, 560];

// Four distinct hues from the Beghou charting palette.
const PIE_COLORS = ['#1F77B4', '#008080', '#E60F65', '#8C7501']; // Mid Blue, Teal, Magenta, Dark Gold
const CRM_ENGAGEMENT = [
  { category: 'Face-to-face', value: 798, color: PIE_COLORS[0] },
  { category: 'Video', value: 312, color: PIE_COLORS[1] },
  { category: 'Email', value: 118, color: PIE_COLORS[2] },
  { category: 'Digital', value: 56, color: PIE_COLORS[3] },
];
const CRM_COVERAGE = [
  { category: 'Tier 1', value: 482, color: PIE_COLORS[0] },
  { category: 'Tier 2', value: 2029, color: PIE_COLORS[1] },
  { category: 'Tier 3', value: 1556, color: PIE_COLORS[2] },
];

type CrmView = 'engagement' | 'coverage';
const CRM_TABS: { key: CrmView; label: string }[] = [
  { key: 'engagement', label: 'Engagement' },
  { key: 'coverage', label: 'HCP Coverage' },
];

const TREND_CATS = ['5-JAN', '12-JAN', '19-Jan', '26-JAN', '2-FEB', '9-FEB', '16-FEB', '23-FEB', '2-MAR', '9-MAR', '16-MAR', '23-MAR', '30-MAR'];
const TREND = {
  Dylura: [715, 885, 830, 885, 800, 890, 875, 850, 815, 820, 830, 850, 885],
  Menavida: [260, 560, 445, 585, 535, 585, 495, 535, 515, 610, 618, 630, 645],
  Extoneva: [455, 715, 645, 600, 648, 640, 632, 695, 690, 675, 710, 675, 710],
};

// ---------- Tab 2 data ----------
type QualityRow = { vendor: string; deliverable: string; pass: number; fail: number };
const QUALITY_ROWS: QualityRow[] = [
  { vendor: 'IQVIA', deliverable: 'Xponent', pass: 3246, fail: 201 },
  { vendor: 'IQVIA', deliverable: 'DDD', pass: 3055, fail: 20 },
  { vendor: 'Komodo', deliverable: 'Clams', pass: 3375, fail: 179 },
  { vendor: 'Veeva', deliverable: 'CRM', pass: 3203, fail: 135 },
  { vendor: 'Symphony', deliverable: 'IDV', pass: 2980, fail: 64 },
  { vendor: 'IQVIA', deliverable: 'Plan Trak', pass: 3120, fail: 88 },
  { vendor: 'Komodo', deliverable: 'Claims', pass: 3410, fail: 142 },
  { vendor: 'Veeva', deliverable: 'Align', pass: 2890, fail: 31 },
  { vendor: 'Symphony', deliverable: 'Metys', pass: 3066, fail: 97 },
  { vendor: 'IQVIA', deliverable: 'LAAD', pass: 3290, fail: 54 },
];
const RESULTS_CATS = ['7/1/25', '7/2/25', '7/3/25'];
const RESULTS_PASS = [4050, 4150, 4700];
const RESULTS_FAIL = [150, 180, 210];

function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`av-card${className ? ` ${className}` : ''}`}>
      {(title || action) && (
        <header className="av-card__head">
          {title && <h2 className="av-card__title">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// A pass/fail ratio bar. Kendo has no labeled two-segment indicator, so this is
// a styled element; every actual chart on the page uses Kendo Charts.
function PassFailBar({ pass, fail, withPct }: { pass: number; fail: number; withPct?: boolean }) {
  const total = pass + fail;
  const pPct = Math.round((pass / total) * 100);
  return (
    <div className="av-pf">
      <span className="av-pf__seg av-pf__seg--pass" style={{ flexGrow: pass }}>
        {pass.toLocaleString()}{withPct ? ` - ${pPct}%` : ''}
      </span>
      <span className="av-pf__seg av-pf__seg--fail" style={{ flexGrow: fail }}>
        {fail.toLocaleString()}{withPct ? ` - ${100 - pPct}%` : ''}
      </span>
    </div>
  );
}

function QtdTracker({ dashed }: { dashed?: boolean }) {
  return (
    <Card className="av-card--qtd">
      <div className="av-card__heading">
        <h2 className="av-card__title">QTD Attainment Tracker</h2>
        <p className="av-card__sub">Quarter to date progress</p>
      </div>
      <Chart style={{ height: 300 }} transitions={false}>
        <ChartArea background="#ffffff" />
        <ChartTooltip shared />
        <ChartCategoryAxis>
          <ChartCategoryAxisItem
            categories={QTD_CATS}
            majorGridLines={dashed ? { visible: true, dashType: 'dash', color: '#9db4ff' } : { visible: false }}
            crosshair={dashed ? { visible: true } : undefined}
          />
        </ChartCategoryAxis>
        <ChartValueAxis>
          <ChartValueAxisItem
            max={3800}
            majorUnit={950}
            majorGridLines={dashed ? { dashType: 'dash', color: '#9db4ff' } : { color: '#e5e7eb' }}
          />
        </ChartValueAxis>
        <ChartSeries>
          <ChartSeriesItem type="line" name="Attainment" data={QTD_ATTAINMENT} color={COLOR.attainment} markers={{ visible: true, size: 7 }} />
          <ChartSeriesItem type="line" name="Quota" data={QTD_QUOTA} color={COLOR.quota} markers={{ visible: false }} />
        </ChartSeries>
        <ChartLegend position="bottom">
          <ChartLegendItem visual={circleLegend} />
        </ChartLegend>
      </Chart>
    </Card>
  );
}

function SalesTab({ surface }: { surface?: 'grey' }) {
  const [crmView, setCrmView] = useState<CrmView>('engagement');
  const crmData = crmView === 'engagement' ? CRM_ENGAGEMENT : CRM_COVERAGE;
  return (
    <div className={`av-grid av-grid--sales${surface === 'grey' ? ' av-grid--grey' : ''}`}>
      <QtdTracker />
      <QtdTracker dashed />

      <Card title="Monthly Product Attainment" className="av-card--monthly" action={<DropDownList className="av-dd" data={['Dylura', 'Menavida', 'Extoneva']} defaultValue="Dylura" fillMode="outline" size="medium" />}>
        <Chart style={{ height: 300 }} transitions={false}>
          <ChartArea background="#ffffff" />
          <ChartTooltip shared />
          <ChartCategoryAxis>
            <ChartCategoryAxisItem categories={MONTHS} title={{ text: '2018' }} />
          </ChartCategoryAxis>
          <ChartValueAxis>
            <ChartValueAxisItem min={540} max={700} majorUnit={20} />
          </ChartValueAxis>
          <ChartSeries>
            <ChartSeriesItem type="column" name="Units" data={MONTHLY_UNITS} color={COLOR.units} />
            <ChartSeriesItem type="line" name="Quota" data={MONTHLY_QUOTA} color={COLOR.quotaLine} dashType="dash" markers={{ visible: true, size: 6 }} />
          </ChartSeries>
          <ChartLegend position="bottom" />
        </Chart>
      </Card>

      <Card title="CRM" className="av-card--crm">
        <ButtonGroup className="av-seg">
          {CRM_TABS.map((t) => (
            <Button
              key={t.key}
              togglable
              selected={crmView === t.key}
              onClick={() => setCrmView(t.key)}
              className="av-seg__btn"
            >
              {t.label}
            </Button>
          ))}
        </ButtonGroup>
        <Chart style={{ height: 300 }} transitions={false}>
          <ChartArea background="#ffffff" margin={28} />
          <ChartTooltip />
          <ChartSeries>
            <ChartSeriesItem
              type="pie"
              data={crmData}
              field="value"
              categoryField="category"
              colorField="color"
            >
              <ChartSeriesLabels
                position="outsideEnd"
                background="none"
                color="#1f2430"
                content={(e: { value: number }) => e.value.toLocaleString()}
              />
            </ChartSeriesItem>
          </ChartSeries>
          <ChartLegend position="right" />
        </Chart>
      </Card>

      <Card
        title="Sales trend"
        className="av-card--trend"
        action={
          <div className="av-card__actions">
            <DropDownList className="av-dd" data={['Period', 'Last 90 days', 'QTD', 'YTD']} defaultValue="Period" fillMode="outline" size="medium" />
            <SplitButton text="Export" fillMode="outline" themeColor="base" items={[{ text: 'CSV' }, { text: 'Excel' }, { text: 'PDF' }]} />
          </div>
        }
      >
        <Chart style={{ height: 420 }} transitions={false}>
          <ChartArea background="#ffffff" />
          <ChartTooltip shared />
          <ChartCategoryAxis>
            <ChartCategoryAxisItem categories={TREND_CATS} />
          </ChartCategoryAxis>
          <ChartValueAxis>
            <ChartValueAxisItem min={200} max={900} majorUnit={100}>
              <ChartValueAxisTitle text="Units" />
            </ChartValueAxisItem>
          </ChartValueAxis>
          <ChartSeries>
            <ChartSeriesItem type="line" name="Dylura" data={TREND.Dylura} color={COLOR.dylura} markers={{ visible: true, size: 6 }} />
            <ChartSeriesItem type="line" name="Menavida" data={TREND.Menavida} color={COLOR.menavida} markers={{ visible: true, size: 6 }} />
            <ChartSeriesItem type="line" name="Extoneva" data={TREND.Extoneva} color={COLOR.extoneva} markers={{ visible: true, size: 6 }} />
          </ChartSeries>
          <ChartLegend position="bottom">
            <ChartLegendItem visual={circleLegend} />
          </ChartLegend>
        </Chart>
      </Card>
    </div>
  );
}

const QualityCell = (props: GridCustomCellProps) => {
  const row = props.dataItem as QualityRow;
  return (
    <td {...props.tdProps}>
      <PassFailBar pass={row.pass} fail={row.fail} />
    </td>
  );
};

function DataQualityTab() {
  const [page, setPage] = useState({ skip: 0, take: 4 });
  return (
    <section className="av-card av-card--dq">
      <div className="av-dq__title">
        <h2 className="av-card__title">Data Quality</h2>
      </div>

      <div className="av-dq__filters-row">
        <div className="av-dq__filters">
          <label className="av-field">
            <span className="av-field__label">Vendor</span>
            <DropDownList data={['Select Vendor', 'IQVIA', 'Komodo', 'Veeva', 'Symphony']} defaultValue="Select Vendor" fillMode="outline" />
          </label>
          <label className="av-field">
            <span className="av-field__label">Deliverable</span>
            <DropDownList data={['Select Deliverable', 'Xponent', 'DDD', 'Clams', 'CRM']} defaultValue="Select Deliverable" fillMode="outline" />
          </label>
          <label className="av-field">
            <span className="av-field__label">Time Range Start</span>
            <DatePicker defaultValue={new Date(2021, 0, 21)} fillMode="outline" />
          </label>
          <label className="av-field">
            <span className="av-field__label">Time Range End</span>
            <DatePicker defaultValue={new Date(2021, 0, 21)} fillMode="outline" />
          </label>
        </div>
        <div className="av-dq__summary">
          <span className="av-dq-summary__label">Pass</span>
          <PassFailBar pass={12879} fail={718} withPct />
          <span className="av-dq-summary__label">Fail</span>
        </div>
      </div>

      <div className="av-dq__body">
        <div className="av-dq__grid">
          <Grid
            data={QUALITY_ROWS.slice(page.skip, page.skip + page.take)}
            skip={page.skip}
            take={page.take}
            total={QUALITY_ROWS.length}
            pageable
            onPageChange={(e: GridPageChangeEvent) => setPage({ skip: e.page.skip, take: e.page.take })}
          >
            <GridColumn field="vendor" title="Vendor" width={110} />
            <GridColumn field="deliverable" title="Deliverable" width={120} />
            <GridColumn title="Pass / Fail" cells={{ data: QualityCell }} />
          </Grid>
        </div>

        <div className="av-dq__results">
          <h2 className="av-card__title">Results over time</h2>
          <Chart style={{ height: 320 }} transitions={false}>
            <ChartArea background="#ffffff" />
            <ChartTooltip shared />
            <ChartCategoryAxis>
              <ChartCategoryAxisItem categories={RESULTS_CATS} />
            </ChartCategoryAxis>
            <ChartValueAxis>
              <ChartValueAxisItem min={0} max={5000} majorUnit={1000} />
            </ChartValueAxis>
            <ChartSeries>
              <ChartSeriesItem type="column" stack name="Pass" data={RESULTS_PASS} color={COLOR.pass} />
              <ChartSeriesItem type="column" name="Fail" data={RESULTS_FAIL} color={COLOR.fail} />
            </ChartSeries>
            <ChartLegend position="bottom" />
          </Chart>
        </div>
      </div>
    </section>
  );
}

const HANDOFF_NOTES = [
  'Use a grey page background until Phase 2 begins. All cards should be white then.',
  'Popovers should be white. Text should not be less than Base Text / SM / Small — 12px.',
  'Chart colors should come from the charting palette on the BDX website.',
  'Two card variations are allowed — title outside or inside the card — but stay consistent across the app, and drive it from the theme.',
  'Filters and options belong to the right of the card title row.',
  'If a page is all charts, use the darker background and put titles inside the cards.',
  'Border on all cards is kendo-color-border-alt.',
  'For trend lines with many series points, use the full page width. Never hide data or labels — charts are about readability.',
  'For complex BI-style scenarios where many filters and interactions drive many charts, encompass everything in one large card spanning the full width (see the Data Quality tab).',
  'Cards should use the Elevation / --kendo-elevation-4 shadow.',
];

export default function AppVisualizations() {
  const [view, setView] = useState<string>(VIEW_OPTIONS[0]);
  const [notesOpen, setNotesOpen] = useState(false);
  const notesAnchor = useRef<HTMLDivElement>(null);

  return (
    <div className="beghou-page av-page">
      {/* Sub-view navigation: a DropDownList, the set pattern for switching
          views within a single page. */}
      <div className="av-subnav">
        <DropDownList
          className="av-viewnav"
          data={VIEW_OPTIONS}
          value={view}
          onChange={(e: DropDownListChangeEvent) => setView(String(e.value))}
          popupSettings={{ className: 'av-viewnav-popup' }}
        />
        <div className="av-notes-anchor" ref={notesAnchor}>
          <Button
            fillMode="flat"
            svgIcon={infoCircleIcon}
            className="av-notes-btn"
            onClick={() => setNotesOpen((v) => !v)}
          >
            Developer Handoff Notes
          </Button>
        </div>
      </div>

      <Popup
        anchor={notesAnchor.current}
        show={notesOpen}
        anchorAlign={{ horizontal: 'right', vertical: 'bottom' }}
        popupAlign={{ horizontal: 'right', vertical: 'top' }}
        popupClass="av-notes-popup"
      >
        <div className="av-notes">
          <h3 className="av-notes__title">Developer Handoff Notes</h3>
          <ul className="av-notes__list">
            {HANDOFF_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </Popup>

      {view === 'Example 1' && <SalesTab />}
      {view === 'Example 2' && <DataQualityTab />}
      {view === 'Example 3' && <SalesTab surface="grey" />}
    </div>
  );
}

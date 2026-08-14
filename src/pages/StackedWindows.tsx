import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Window, type WindowActionsEvent } from '@progress/kendo-react-dialogs';
import {
  Checkbox,
  type CheckboxChangeEvent,
  TextBox,
  type TextBoxChangeEvent,
  InputPrefix,
} from '@progress/kendo-react-inputs';
import { Map as KendoMap, MapLayers, MapTileLayer } from '@progress/kendo-react-map';
import {
  Grid,
  GridColumn,
  GridColumnMenuSort,
  GridColumnMenuFilter,
  type GridColumnMenuProps,
  type GridCustomCellProps,
} from '@progress/kendo-react-grid';
import { Button, SplitButton } from '@progress/kendo-react-buttons';
import { SvgIcon } from '@progress/kendo-react-common';
import { searchIcon, gearIcon, gridIcon } from '@progress/kendo-svg-icons';
import {
  process,
  type SortDescriptor,
  type CompositeFilterDescriptor,
} from '@progress/kendo-data-query';

type Stage = 'DEFAULT' | 'MINIMIZED' | 'FULLSCREEN';
type WinKey = 'zip' | 'hcp' | 'acc';

type WinState = {
  stage: Stage;
  left: number;
  top: number;
  width: number;
  height: number;
  // Bumped on slot-snap events (stage change, container resize, visibility
  // toggle) so the Window remounts with fresh initial geometry. Kendo's
  // componentDidUpdate only syncs props.left/top — width/height props are
  // never written back to state, so a controlled approach ships stale state
  // through onResize and collapses the window to its mount-time size.
  resetKey: number;
};

type MoveEvent = { left: number; top: number };

const TITLEBAR_HEIGHT = 44;
const MIN_HEIGHT = 200;
const GUTTER = 5;
// DEFAULT-stage window height: titlebar + grid header + ~5 small rows + a
// horizontal scrollbar. Keeps the window to roughly the first 4-5 rows so it
// never eats half the map; the rest of the grid scrolls inside the window.
const DEFAULT_HEIGHT = 250;

// Kendo Window has a bug where `top: 0` / `left: 0` are silently ignored
// (`this.props.top || this.state.top` treats 0 as falsy). Use 1 instead.
const ZERO_DODGE = 1;

function slotPosition(slotIdx: number, totalSlots: number, stage: Stage, rect: DOMRect) {
  const W = Math.round(rect.width);
  const H = Math.max(MIN_HEIGHT, Math.round(rect.height));
  const cellWidth = Math.max(2, Math.floor(W / totalSlots));
  const left = Math.max(ZERO_DODGE, slotIdx * cellWidth + GUTTER);
  const width = Math.max(2, cellWidth - 2 * GUTTER);

  // FULLSCREEN: Kendo overrides controlled width/height from appendTo, so it
  // covers the full parent regardless of what we return. We still emit a sane
  // default for any frame between renders.
  if (stage === 'FULLSCREEN') {
    return { left: ZERO_DODGE, top: ZERO_DODGE, width: W, height: H };
  }
  if (stage === 'MINIMIZED') {
    return {
      left,
      top: Math.max(ZERO_DODGE, H - TITLEBAR_HEIGHT),
      width,
      height: TITLEBAR_HEIGHT,
    };
  }
  // DEFAULT: a compact window showing the first ~4-5 rows, anchored to the
  // bottom of the slot (grows up from the minimized chip). Capped to the
  // available height so it never overflows a short map.
  const defaultH = Math.min(DEFAULT_HEIGHT, H);
  return { left, top: Math.max(ZERO_DODGE, H - defaultH), width, height: defaultH };
}

const NoButton = () => null;

const initialWin = (): WinState => ({
  stage: 'MINIMIZED',
  left: ZERO_DODGE,
  top: ZERO_DODGE,
  width: 200,
  height: TITLEBAR_HEIGHT,
  resetKey: 0,
});

const ZIP_DATA = [
  { zip: '30122', terrId: 'T021', terrName: 'Marietta, GA', index: 17, estr_writer: 7, mkt_writer: 7, estr_c12m: '12,167', mkt_C12m: '27,905', stCity: 'Lithia Springs, GA', zipOut: '30122' },
  { zip: '30157', terrId: 'T021', terrName: 'Marietta, GA', index: 15, estr_writer: 7, mkt_writer: 8, estr_c12m: '12,971', mkt_C12m: '25,878', stCity: 'Dallas, GA', zipOut: '30157' },
  { zip: '30117', terrId: 'T021', terrName: 'Marietta, GA', index: 11, estr_writer: 13, mkt_writer: 13, estr_c12m: '7,637', mkt_C12m: '18,184', stCity: 'Carrollton, GA', zipOut: '30117' },
  { zip: '30135', terrId: 'T021', terrName: 'Marietta, GA', index: 14, estr_writer: 9, mkt_writer: 11, estr_c12m: '9,432', mkt_C12m: '22,118', stCity: 'Douglasville, GA', zipOut: '30135' },
  { zip: '30144', terrId: 'T002', terrName: 'Atlanta S, GA', index: 22, estr_writer: 18, mkt_writer: 20, estr_c12m: '16,840', mkt_C12m: '38,210', stCity: 'Kennesaw, GA', zipOut: '30144' },
  { zip: '30152', terrId: 'T002', terrName: 'Atlanta S, GA', index: 19, estr_writer: 14, mkt_writer: 15, estr_c12m: '13,205', mkt_C12m: '31,492', stCity: 'Kennesaw, GA', zipOut: '30152' },
  { zip: '30060', terrId: 'T002', terrName: 'Atlanta S, GA', index: 26, estr_writer: 21, mkt_writer: 23, estr_c12m: '18,772', mkt_C12m: '43,055', stCity: 'Marietta, GA', zipOut: '30060' },
  { zip: '30068', terrId: 'T002', terrName: 'Atlanta S, GA', index: 31, estr_writer: 26, mkt_writer: 28, estr_c12m: '22,308', mkt_C12m: '51,640', stCity: 'Marietta, GA', zipOut: '30068' },
];

const HCP_DATA = [
  { id: 124578, fname: 'SURENDER', lname: 'KUMAR', decMkt: 5, mkt_roll12: 5990, ESTR_roll12: 2132, MENA_roll12: 1539, PROF_roll12: 2319, Address1: '3327 HWY', City: 'DOUGLASVILLE', State: 'GA', zip: '30135', NPI: '1912077603' },
  { id: 103931, fname: 'AMY', lname: 'DODSON', decMkt: 5, mkt_roll12: 5747, ESTR_roll12: 1809, MENA_roll12: 732, PROF_roll12: 3206, Address1: '150 HENRY BURSON AVE', City: 'CARROLLTON', State: 'GA', zip: '30117', NPI: '1255472486' },
  { id: 125461, fname: 'SHANNON', lname: 'COUVREUR', decMkt: 4, mkt_roll12: 4102, ESTR_roll12: 2550, MENA_roll12: 175, PROF_roll12: 1377, Address1: '156 CLINIC AVE', City: 'CARROLLTON', State: 'GA', zip: '30117', NPI: '1932308707' },
  { id: 118273, fname: 'JESSICA', lname: 'WEBSTER', decMkt: 4, mkt_roll12: 3902, ESTR_roll12: 1980, MENA_roll12: 410, PROF_roll12: 1512, Address1: '4421 RIDGEWAY DR', City: 'DALLAS', State: 'GA', zip: '30157', NPI: '1689143725' },
  { id: 127015, fname: 'MARCUS', lname: 'WHITLOCK', decMkt: 3, mkt_roll12: 3201, ESTR_roll12: 1402, MENA_roll12: 305, PROF_roll12: 1494, Address1: '811 OAK CHASE', City: 'LITHIA SPRINGS', State: 'GA', zip: '30122', NPI: '1452831988' },
  { id: 109834, fname: 'PRIYA', lname: 'NARAYAN', decMkt: 4, mkt_roll12: 4456, ESTR_roll12: 2241, MENA_roll12: 558, PROF_roll12: 1657, Address1: '220 SUMMER CREEK', City: 'KENNESAW', State: 'GA', zip: '30144', NPI: '1773298401' },
  { id: 112486, fname: 'DEREK', lname: 'ANSARI', decMkt: 3, mkt_roll12: 3010, ESTR_roll12: 1517, MENA_roll12: 244, PROF_roll12: 1249, Address1: '79 PEACH ORCHARD', City: 'MARIETTA', State: 'GA', zip: '30068', NPI: '1604572019' },
];

const ACC_DATA = [
  { origTerr: 'T049', origName: 'Atlanta N, GA', newTerr: 'T021', newName: 'Marietta, GA',  id: 94837,  lname: 'ABUNYEWA', fname: 'AMMA',     spec: 'IM',    decMkt: 7,  mkt_roll12: 11033.413,  ESTR_roll12: 4612.333,  MENA_roll12: 2455.5 },
  { origTerr: 'T002', origName: 'Atlanta S, GA', newTerr: 'T049', newName: 'Atlanta S, GA', id: 102480, lname: 'HADLEY',   fname: 'PHILLIP',  spec: 'OBGYN', decMkt: 4,  mkt_roll12: 4986.598,   ESTR_roll12: 2092.503,  MENA_roll12: 1759.7 },
  { origTerr: 'T002', origName: 'Atlanta S, GA', newTerr: 'T049', newName: 'Atlanta S, GA', id: 115549, lname: 'CALLAWAY', fname: 'JUAQUITA', spec: 'OBGYN', decMkt: 4,  mkt_roll12: 4639.307,   ESTR_roll12: 2766.083,  MENA_roll12: 1115.3 },
  { origTerr: 'T002', origName: 'Atlanta S, GA', newTerr: 'T049', newName: 'Atlanta S, GA', id: 120151, lname: 'GAMBLE',   fname: 'KENDRA',   spec: 'OBGYN', decMkt: 10, mkt_roll12: 141963.436, ESTR_roll12: 32578.163, MENA_roll12: 42433.3 },
  { origTerr: 'T002', origName: 'Atlanta S, GA', newTerr: 'T049', newName: 'Atlanta S, GA', id: 120151, lname: 'ANYAKWO',  fname: 'GERTRUDE', spec: 'OBGYN', decMkt: 5,  mkt_roll12: 5838.772,   ESTR_roll12: 1752.775,  MENA_roll12: 1569.0 },
  { origTerr: 'T002', origName: 'Atlanta S, GA', newTerr: 'T049', newName: 'Atlanta S, GA', id: 124467, lname: 'GIBBS',    fname: 'LAURA',    spec: 'OBGYN', decMkt: 5,  mkt_roll12: 7751.609,   ESTR_roll12: 4273.612,  MENA_roll12: 2134.6 },
  { origTerr: 'T049', origName: 'Atlanta N, GA', newTerr: 'T021', newName: 'Marietta, GA',  id: 128902, lname: 'BANERJEE', fname: 'NITIN',    spec: 'IM',    decMkt: 6,  mkt_roll12: 8421.330,   ESTR_roll12: 3198.402,  MENA_roll12: 1872.4 },
];

const SUMMARY_DATA = [
  { color: '#57c75a', terrId: 'E101', terrName: 'Concord',             mkt_c12m: 1564525, estr_c12m: 704413, index: 933,  mkt_writer: 572,  estr_writer: 572,  level0Count: 572 },
  { color: '#1b8a78', terrId: 'E102', terrName: 'Boston West',         mkt_c12m: 1864861, estr_c12m: 805888, index: 1107, mkt_writer: 744,  estr_writer: 744,  level0Count: 744 },
  { color: '#2e8bc0', terrId: 'E103', terrName: 'Dallas City',         mkt_c12m: 2045732, estr_c12m: 912234, index: 1250, mkt_writer: 759,  estr_writer: 759,  level0Count: 759 },
  { color: '#3a5fe0', terrId: 'E104', terrName: 'Phoenix Heights',     mkt_c12m: 2312498, estr_c12m: 521678, index: 1199, mkt_writer: 630,  estr_writer: 630,  level0Count: 630 },
  { color: '#7b6fd0', terrId: 'E105', terrName: 'Orlando Bay',         mkt_c12m: 2674809, estr_c12m: 634987, index: 983,  mkt_writer: 607,  estr_writer: 607,  level0Count: 607 },
  { color: '#97149a', terrId: 'E106', terrName: 'Seattle Park',        mkt_c12m: 2988156, estr_c12m: 742123, index: 1462, mkt_writer: 1462, estr_writer: 1462, level0Count: 1462 },
  { color: '#c0392b', terrId: 'E107', terrName: 'San Francisco North', mkt_c12m: 3412009, estr_c12m: 853456, index: 916,  mkt_writer: 916,  estr_writer: 916,  level0Count: 916 },
  { color: '#9a8a00', terrId: 'E108', terrName: 'Chicago Lakeside',    mkt_c12m: 3780543, estr_c12m: 964789, index: 607,  mkt_writer: 607,  estr_writer: 607,  level0Count: 607 },
  { color: '#8a4b1c', terrId: 'E109', terrName: 'Miami Shores',        mkt_c12m: 4256874, estr_c12m: 107543, index: 1512, mkt_writer: 1512, estr_writer: 1512, level0Count: 1512 },
  { color: '#163a5e', terrId: 'E110', terrName: 'Austin Grove',        mkt_c12m: 4678990, estr_c12m: 218765, index: 630,  mkt_writer: 630,  estr_writer: 630,  level0Count: 630 },
  { color: '#f08a5d', terrId: 'E111', terrName: 'Denver Summit',       mkt_c12m: 5100256, estr_c12m: 329890, index: 1049, mkt_writer: 1049, estr_writer: 1049, level0Count: 1049 },
  { color: '#17a7e0', terrId: 'E112', terrName: 'Houston Meadows',     mkt_c12m: 5575432, estr_c12m: 430123, index: 1384, mkt_writer: 1384, estr_writer: 1384, level0Count: 1384 },
];

// Territory ID cell with its color swatch inline, so the color and the ID
// read as one column instead of a separate "Color ID" column.
const TerritoryIdCell = (props: GridCustomCellProps) => (
  <td {...props.tdProps} className={`summary-terr-cell ${props.tdProps?.className ?? ''}`}>
    <span className="summary-swatch" style={{ background: props.dataItem.color }} />
    <span>{props.dataItem.terrId}</span>
  </td>
);

// Shared per-column menu: sort + filter, matching the kebab affordance in the mock.
const ColumnMenu = (props: GridColumnMenuProps) => (
  <div>
    <GridColumnMenuSort {...props} />
    <GridColumnMenuFilter {...props} />
  </div>
);

export default function StackedWindows() {
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<ComponentRef<typeof KendoMap> | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const [showHcp, setShowHcp] = useState(false);
  const [showAcc, setShowAcc] = useState(false);

  const [zip, setZip] = useState<WinState>(initialWin);
  const [hcp, setHcp] = useState<WinState>(initialWin);
  const [acc, setAcc] = useState<WinState>(initialWin);

  // Summary panel: docked top-right. MINIMIZED = titlebar only (closed);
  // DEFAULT = 1/3 of the map width, full available height; FULLSCREEN = full
  // map with the column toolbar and every column visible.
  const [summaryStage, setSummaryStage] = useState<Stage>('MINIMIZED');
  const [summarySearch, setSummarySearch] = useState('');
  const [summarySort, setSummarySort] = useState<SortDescriptor[]>([]);
  const [summaryFilter, setSummaryFilter] = useState<CompositeFilterDescriptor | undefined>(undefined);

  const summaryResult = useMemo(() => {
    let data = SUMMARY_DATA;
    const q = summarySearch.trim().toLowerCase();
    if (q) {
      data = data.filter(
        (d) => d.terrName.toLowerCase().includes(q) || d.terrId.toLowerCase().includes(q),
      );
    }
    return process(data, { sort: summarySort, filter: summaryFilter });
  }, [summarySearch, summarySort, summaryFilter]);

  // Sort + filter state for the three data grids (Zip / HCP / Accounts).
  const [zipSort, setZipSort] = useState<SortDescriptor[]>([]);
  const [zipFilter, setZipFilter] = useState<CompositeFilterDescriptor | undefined>(undefined);
  const [hcpSort, setHcpSort] = useState<SortDescriptor[]>([]);
  const [hcpFilter, setHcpFilter] = useState<CompositeFilterDescriptor | undefined>(undefined);
  const [accSort, setAccSort] = useState<SortDescriptor[]>([]);
  const [accFilter, setAccFilter] = useState<CompositeFilterDescriptor | undefined>(undefined);

  const zipResult = useMemo(
    () => process(ZIP_DATA, { sort: zipSort, filter: zipFilter }),
    [zipSort, zipFilter],
  );
  const hcpResult = useMemo(
    () => process(HCP_DATA, { sort: hcpSort, filter: hcpFilter }),
    [hcpSort, hcpFilter],
  );
  const accResult = useMemo(
    () => process(ACC_DATA, { sort: accSort, filter: accFilter }),
    [accSort, accFilter],
  );

  const visibleSlots = useMemo<WinKey[]>(() => {
    const s: WinKey[] = ['zip'];
    if (showHcp) s.push('hcp');
    if (showAcc) s.push('acc');
    return s;
  }, [showHcp, showAcc]);

  const totalSlots = visibleSlots.length;
  const slotOf = (key: WinKey) => visibleSlots.indexOf(key);

  useEffect(() => {
    const el = mapWrapperRef.current;
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Kendo Map sometimes misses the initial measurement in flex layouts.
  // Force it to re-measure whenever the tracked container rect changes.
  useEffect(() => {
    if (rect) mapInstanceRef.current?.resize();
  }, [rect]);

  // Re-snap visible windows whenever the rect or slot layout changes.
  // Bumping resetKey forces a remount so the new initial geometry actually
  // sticks — see WinState.resetKey for why a re-render alone isn't enough.
  useEffect(() => {
    if (!rect) return;
    const zipIdx = slotOf('zip');
    setZip((s) => ({ ...s, ...slotPosition(zipIdx, totalSlots, s.stage, rect), resetKey: s.resetKey + 1 }));
    if (showHcp) {
      const hcpIdx = slotOf('hcp');
      setHcp((s) => ({ ...s, ...slotPosition(hcpIdx, totalSlots, s.stage, rect), resetKey: s.resetKey + 1 }));
    }
    if (showAcc) {
      const accIdx = slotOf('acc');
      setAcc((s) => ({ ...s, ...slotPosition(accIdx, totalSlots, s.stage, rect), resetKey: s.resetKey + 1 }));
    }
    // visibleSlots captures both checkbox states; rect captures size.
  }, [rect, visibleSlots, totalSlots, showHcp, showAcc]);

  const onStage = (
    setter: React.Dispatch<React.SetStateAction<WinState>>,
    key: WinKey,
  ) => (e: WindowActionsEvent) => {
    if (!e.state) return;
    const next = e.state as Stage;
    setter((s) => {
      if (!rect) return { ...s, stage: next, resetKey: s.resetKey + 1 };
      return { ...s, stage: next, ...slotPosition(slotOf(key), totalSlots, next, rect), resetKey: s.resetKey + 1 };
    });
  };

  const onMove = (setter: React.Dispatch<React.SetStateAction<WinState>>) =>
    (e: MoveEvent) => {
      setter((s) => ({ ...s, left: e.left, top: e.top }));
    };

  const onResize = (setter: React.Dispatch<React.SetStateAction<WinState>>) =>
    (e: { left: number; top: number; width: number; height: number }) => {
      setter((s) => ({ ...s, left: e.left, top: e.top, width: e.width, height: e.height }));
    };

  return (
    <div className="beghou-page beghou-page--fill">
      <div className="beghou-toolbar">
        <Checkbox
          label="When HCP data is present"
          value={showHcp}
          onChange={(e: CheckboxChangeEvent) => setShowHcp(Boolean(e.value))}
        />
        <Checkbox
          label="When Accounts data is present"
          value={showAcc}
          onChange={(e: CheckboxChangeEvent) => setShowAcc(Boolean(e.value))}
        />
      </div>

      <div className="map-container" ref={mapWrapperRef}>
        {rect && (
          <KendoMap
            ref={(m) => {
              mapInstanceRef.current = m;
            }}
            center={[30.2685, -97.7535]}
            zoom={14}
            style={{ width: Math.round(rect.width), height: Math.round(rect.height) }}
          >
            <MapLayers>
              <MapTileLayer
                urlTemplate={(args) =>
                  `https://${args.subdomain}.tile.openstreetmap.org/${args.zoom}/${args.x}/${args.y}.png`
                }
                subdomains={['a', 'b', 'c']}
                attribution="&copy; OpenStreetMap contributors"
              />
            </MapLayers>
          </KendoMap>
        )}

        {/* Summary panel docked to the top-right. MINIMIZED = titlebar only;
            DEFAULT = 1/3 of the map width filling the full available height;
            FULLSCREEN = full map with the column toolbar and every column. The
            grid scrolls internally so the panel always fits the map. Re-keyed on
            stage/width so it re-docks after a toggle or container resize. */}
        {rect && (() => {
          const W = Math.round(rect.width);
          const H = Math.max(MIN_HEIGHT, Math.round(rect.height));
          const isMin = summaryStage === 'MINIMIZED';
          const isFull = summaryStage === 'FULLSCREEN';
          const summaryWidth = isMin ? 260 : Math.max(360, Math.floor(W / 3));
          const summaryLeft = Math.max(ZERO_DODGE, W - summaryWidth - GUTTER);
          // Height of a bottom-docked window in a given stage, so the Summary
          // panel can stop short of whichever bottom window is tallest and
          // never overlap it.
          const bandHeight = (st: Stage) =>
            st === 'MINIMIZED' ? TITLEBAR_HEIGHT : st === 'FULLSCREEN' ? H : Math.min(DEFAULT_HEIGHT, H);
          const reservedBottom = Math.max(
            bandHeight(zip.stage),
            showHcp ? bandHeight(hcp.stage) : 0,
            showAcc ? bandHeight(acc.stage) : 0,
          );
          // DEFAULT summary fills from the top down to just above the bottom
          // band. FULLSCREEN still covers the whole map (it overlays).
          const summaryDefaultHeight = Math.max(
            MIN_HEIGHT,
            H - reservedBottom - ZERO_DODGE - GUTTER,
          );
          return (
            <Window
              key={`summary-${summaryStage}-${summaryWidth}-${W}-${reservedBottom}`}
              title="Summary"
              className="summary-window"
              appendTo={mapWrapperRef.current ?? undefined}
              stage={summaryStage}
              initialLeft={isFull ? ZERO_DODGE : summaryLeft}
              initialTop={ZERO_DODGE}
              initialWidth={isFull ? W : summaryWidth}
              initialHeight={isMin ? TITLEBAR_HEIGHT : isFull ? H - 2 * GUTTER : summaryDefaultHeight}
              modal={false}
              draggable={false}
              resizable
              closeButton={NoButton}
              onStageChange={(e: WindowActionsEvent) => {
                if (e.state) setSummaryStage(e.state as Stage);
              }}
            >
              <div className="summary-body">
                <div className="summary-toolbar">
                  <TextBox
                    className="summary-search"
                    placeholder="search"
                    value={summarySearch}
                    onChange={(e: TextBoxChangeEvent) => setSummarySearch(String(e.value ?? ''))}
                    prefix={() => (
                      <InputPrefix>
                        <SvgIcon icon={searchIcon} />
                      </InputPrefix>
                    )}
                  />
                  {isFull && (
                    <div className="summary-tools">
                      <Button fillMode="flat" svgIcon={gearIcon} title="Settings" aria-label="Settings" />
                      <Button fillMode="flat" svgIcon={gridIcon} title="Columns" aria-label="Columns" />
                      <SplitButton
                        text="Export"
                        themeColor="base"
                        items={[
                          { text: 'Export to Excel' },
                          { text: 'Export to PDF' },
                          { text: 'Export to CSV' },
                        ]}
                      />
                    </div>
                  )}
                </div>
                <div className="summary-grid-wrap">
                  <Grid
                    data={summaryResult.data}
                    size="small"
                    className="compact-grid summary-grid"
                    style={{ height: '100%' }}
                    sortable
                    resizable
                    sort={summarySort}
                    onSortChange={(e) => setSummarySort(e.sort)}
                    filter={summaryFilter}
                    onFilterChange={(e) => setSummaryFilter(e.filter ?? undefined)}
                  >
                    <GridColumn field="terrId" title="Territory ID" width="160px" cells={{ data: TerritoryIdCell }} columnMenu={ColumnMenu} />
                    <GridColumn field="terrName" title="Territory Name" width="190px" columnMenu={ColumnMenu} />
                    <GridColumn field="mkt_c12m" title="mkt_c12m" width="150px" format="{0:n0}" columnMenu={ColumnMenu} />
                    <GridColumn field="estr_c12m" title="estr_c12m" width="150px" format="{0:n0}" columnMenu={ColumnMenu} />
                    <GridColumn field="index" title="Index" width="120px" format="{0:n0}" columnMenu={ColumnMenu} />
                    <GridColumn field="mkt_writer" title="mkt_writer" width="140px" format="{0:n0}" columnMenu={ColumnMenu} />
                    <GridColumn field="estr_writer" title="estr_writer" width="140px" format="{0:n0}" columnMenu={ColumnMenu} />
                    <GridColumn field="level0Count" title="_Level0Count" width="150px" format="{0:n0}" columnMenu={ColumnMenu} />
                  </Grid>
                </div>
              </div>
            </Window>
          );
        })()}

        {/* Keys are prefixed with the window's identity so React never reuses
            a Window across the three slots — e.g. when Accounts is enabled
            its resetKey starts at 1 and would collide with HCP's just-bumped
            key=1, causing React to remount HCP into Accounts' position with
            HCP's preserved state (slot 1/2 sized 741px). */}
        {rect && (
          <Window
            key={`zip-${zip.resetKey}`}
            title="Zip ID"
            appendTo={mapWrapperRef.current ?? undefined}
            stage={zip.stage}
            initialLeft={zip.left}
            initialTop={zip.top}
            initialWidth={zip.width}
            initialHeight={zip.height}
            modal={false}
            draggable
            resizable
            closeButton={NoButton}
            onStageChange={onStage(setZip, 'zip')}
            onMove={onMove(setZip)}
            onResize={onResize(setZip)}
          >
            <Grid
              data={zipResult.data}
              size="small"
              className="compact-grid"
              style={{ height: '100%' }}
              sortable
              resizable
              sort={zipSort}
              onSortChange={(e) => setZipSort(e.sort)}
              filter={zipFilter}
              onFilterChange={(e) => setZipFilter(e.filter ?? undefined)}
            >
              <GridColumn field="zip" title="Zip" width="100px" columnMenu={ColumnMenu} />
              <GridColumn field="terrId" title="Terr ID" width="100px" columnMenu={ColumnMenu} />
              <GridColumn field="terrName" title="Terr Name" width="160px" columnMenu={ColumnMenu} />
              <GridColumn field="index" title="Index" width="90px" columnMenu={ColumnMenu} />
              <GridColumn field="estr_writer" title="estr_writer" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="mkt_writer" title="mkt_writer" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="estr_c12m" title="estr_c12m" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="mkt_C12m" title="mkt_C12m" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="stCity" title="stCity" width="160px" columnMenu={ColumnMenu} />
              <GridColumn field="zipOut" title="Zip" width="100px" columnMenu={ColumnMenu} />
            </Grid>
          </Window>
        )}

        {rect && showHcp && (
          <Window
            key={`hcp-${hcp.resetKey}`}
            title="HCP"
            appendTo={mapWrapperRef.current ?? undefined}
            stage={hcp.stage}
            initialLeft={hcp.left}
            initialTop={hcp.top}
            initialWidth={hcp.width}
            initialHeight={hcp.height}
            modal={false}
            draggable
            resizable
            closeButton={NoButton}
            onStageChange={onStage(setHcp, 'hcp')}
            onMove={onMove(setHcp)}
            onResize={onResize(setHcp)}
          >
            <Grid
              data={hcpResult.data}
              size="small"
              className="compact-grid"
              style={{ height: '100%' }}
              sortable
              resizable
              sort={hcpSort}
              onSortChange={(e) => setHcpSort(e.sort)}
              filter={hcpFilter}
              onFilterChange={(e) => setHcpFilter(e.filter ?? undefined)}
            >
              <GridColumn field="id" title="id" width="100px" columnMenu={ColumnMenu} />
              <GridColumn field="fname" title="Fname" width="110px" columnMenu={ColumnMenu} />
              <GridColumn field="lname" title="Lname" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="decMkt" title="decMkt" width="90px" columnMenu={ColumnMenu} />
              <GridColumn field="mkt_roll12" title="mkt_roll12" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="ESTR_roll12" title="ESTR_roll12" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="MENA_roll12" title="MENA_roll12" width="130px" columnMenu={ColumnMenu} />
              <GridColumn field="PROF_roll12" title="PROF_roll12" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="Address1" title="Address1" width="220px" columnMenu={ColumnMenu} />
              <GridColumn field="City" title="City" width="140px" columnMenu={ColumnMenu} />
              <GridColumn field="State" title="State" width="80px" columnMenu={ColumnMenu} />
              <GridColumn field="zip" title="zip" width="90px" columnMenu={ColumnMenu} />
              <GridColumn field="NPI" title="NPI" width="130px" columnMenu={ColumnMenu} />
            </Grid>
          </Window>
        )}

        {rect && showAcc && (
          <Window
            key={`acc-${acc.resetKey}`}
            title="Accounts"
            appendTo={mapWrapperRef.current ?? undefined}
            stage={acc.stage}
            initialLeft={acc.left}
            initialTop={acc.top}
            initialWidth={acc.width}
            initialHeight={acc.height}
            modal={false}
            draggable
            resizable
            closeButton={NoButton}
            onStageChange={onStage(setAcc, 'acc')}
            onMove={onMove(setAcc)}
            onResize={onResize(setAcc)}
          >
            <Grid
              data={accResult.data}
              size="small"
              className="compact-grid"
              style={{ height: '100%' }}
              sortable
              resizable
              sort={accSort}
              onSortChange={(e) => setAccSort(e.sort)}
              filter={accFilter}
              onFilterChange={(e) => setAccFilter(e.filter ?? undefined)}
            >
              <GridColumn field="origTerr" title="Original Terr" width="130px" columnMenu={ColumnMenu} />
              <GridColumn field="origName" title="Original Name" width="150px" columnMenu={ColumnMenu} />
              <GridColumn field="newTerr" title="New Terr" width="110px" columnMenu={ColumnMenu} />
              <GridColumn field="newName" title="New Name" width="150px" columnMenu={ColumnMenu} />
              <GridColumn field="id" title="ID" width="90px" columnMenu={ColumnMenu} />
              <GridColumn field="lname" title="L Name" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="fname" title="F Name" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="spec" title="Spec" width="100px" columnMenu={ColumnMenu} />
              <GridColumn field="decMkt" title="decMkt" width="90px" columnMenu={ColumnMenu} />
              <GridColumn field="mkt_roll12" title="mkt_roll12" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="ESTR_roll12" title="ESTR_roll12" width="120px" columnMenu={ColumnMenu} />
              <GridColumn field="MENA_roll12" title="MENA_roll12" width="130px" columnMenu={ColumnMenu} />
            </Grid>
          </Window>
        )}
      </div>
    </div>
  );
}

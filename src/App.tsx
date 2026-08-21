import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppBar } from './components/AppBar';
import { Drawer } from './components/Drawer';
import { routes } from './routes';
import SettingsHome from './pages/SettingsHome';
import SettingsIncentiveCompensation from './pages/SettingsIncentiveCompensation';

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="beghou-shell">
      <AppBar
        onToggleDrawer={() => setDrawerOpen((v) => !v)}
        drawerOpen={drawerOpen}
      />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="beghou-shell__main" id="main">
        <Routes>
          {routes.map(({ path, component: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
          {/* Admin/Settings — reached via the AppBar gear, not the launcher/drawer. */}
          <Route path="/settings" element={<SettingsHome />} />
          <Route path="/settings/incentive-compensation" element={<SettingsIncentiveCompensation />} />
        </Routes>
      </main>
    </div>
  );
}

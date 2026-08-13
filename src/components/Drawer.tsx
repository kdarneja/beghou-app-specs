import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SvgIcon } from '@progress/kendo-react-common';
import { gearIcon } from '@progress/kendo-svg-icons';
import { navRoutes, type RouteDef } from '../routes';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
};

function DrawerItem({
  route,
  active,
  collapsed,
  onActivate,
}: {
  route: Pick<RouteDef, 'path' | 'label' | 'icon'>;
  active: boolean;
  collapsed: boolean;
  onActivate: (path: string) => void;
}) {
  const className = [
    'beghou-drawer-item',
    active ? 'beghou-drawer-item--active' : '',
    collapsed ? 'beghou-drawer-item--collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={() => onActivate(route.path)}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? route.label : undefined}
    >
      <span className="beghou-drawer-item__icon" aria-hidden="true">
        <SvgIcon icon={route.icon} />
      </span>
      <span className="beghou-drawer-item__label">{route.label}</span>
    </button>
  );
}

export function Drawer({ open, onClose }: DrawerProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleActivate = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Collapsed rail — always visible behind everything */}
      <nav className="beghou-drawer-rail" aria-label="Primary navigation (collapsed)">
        <div className="beghou-drawer__nav">
          {navRoutes.map((r) => (
            <DrawerItem
              key={`rail-${r.path}`}
              route={r}
              active={isActive(r.path)}
              collapsed
              onActivate={handleActivate}
            />
          ))}
        </div>
        <div className="beghou-drawer__footer">
          <DrawerItem
            route={{ path: '/settings', label: 'Settings', icon: gearIcon }}
            active={false}
            collapsed
            onActivate={handleActivate}
          />
        </div>
      </nav>

      {/* Expanded overlay panel */}
      <div
        className={`beghou-drawer-backdrop${open ? ' beghou-drawer-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        className={`beghou-drawer-panel${open ? ' beghou-drawer-panel--open' : ''}`}
        aria-label="Primary navigation"
        aria-hidden={!open}
      >
        <div className="beghou-drawer__nav">
          {navRoutes.map((r) => (
            <DrawerItem
              key={`panel-${r.path}`}
              route={r}
              active={isActive(r.path)}
              collapsed={false}
              onActivate={handleActivate}
            />
          ))}
        </div>
        <div className="beghou-drawer__footer">
          <DrawerItem
            route={{ path: '/settings', label: 'Settings', icon: gearIcon }}
            active={false}
            collapsed={false}
            onActivate={handleActivate}
          />
        </div>
      </nav>
    </>
  );
}

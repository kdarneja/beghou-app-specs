import { Link, useLocation } from 'react-router-dom';
import { SvgIcon } from '@progress/kendo-react-common';
import {
  menuIcon,
  searchIcon,
  sparklesIcon,
  bellIcon,
  gridIcon,
  gearIcon,
} from '@progress/kendo-svg-icons';
import { routes } from '../routes';
import beghouArcLogo from '../assets/beghou-arc-logo.svg';

type AppBarProps = {
  onToggleDrawer: () => void;
  drawerOpen: boolean;
  hasUnreadNotifications?: boolean;
};

function findPageLabel(pathname: string): string {
  const match = routes.find((r) => r.path === pathname);
  if (match) return match.label;
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return 'Home';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AppBar({
  onToggleDrawer,
  drawerOpen,
  hasUnreadNotifications = true,
}: AppBarProps) {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const pageLabel = isHome ? 'Beghou App/UX Specs' : findPageLabel(pathname);

  return (
    <header className="beghou-appbar" role="banner">
      <div className="beghou-appbar__left">
        <div className="beghou-appbar__hamburger-zone">
          <button
            type="button"
            className="beghou-appbar__icon-btn"
            aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={drawerOpen}
            onClick={onToggleDrawer}
          >
            <SvgIcon icon={menuIcon} size="large" />
          </button>
        </div>
        <Link to="/" className="beghou-appbar__logo" aria-label="Beghou ARC home">
          <img src={beghouArcLogo} alt="Beghou ARC" className="beghou-appbar__logo-img" />
        </Link>
        <div className="beghou-appbar__divider" aria-hidden="true" />
        <span className="beghou-appbar__page-id" aria-label="Current page">
          {pageLabel}
        </span>
      </div>

      <div className="beghou-appbar__right">
        <div className="beghou-appbar__icon-group" role="toolbar" aria-label="Global actions">
          <button type="button" className="beghou-appbar__icon-btn" aria-label="Search">
            <SvgIcon icon={searchIcon} size="large" />
          </button>
          <button
            type="button"
            className="beghou-appbar__icon-btn"
            aria-label="AI Assistant"
          >
            <SvgIcon icon={sparklesIcon} size="large" />
          </button>
          <button
            type="button"
            className="beghou-appbar__icon-btn"
            aria-label={
              hasUnreadNotifications
                ? 'Notifications, unread items available'
                : 'Notifications'
            }
          >
            <SvgIcon icon={bellIcon} size="large" />
            {hasUnreadNotifications && (
              <span className="beghou-appbar__notif-dot" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="beghou-appbar__icon-btn"
            aria-label="App switcher"
          >
            <SvgIcon icon={gridIcon} size="large" />
          </button>
          <button type="button" className="beghou-appbar__icon-btn" aria-label="Settings">
            <SvgIcon icon={gearIcon} size="large" />
          </button>
        </div>
        <button type="button" className="beghou-appbar__avatar" aria-label="User: KD">
          KD
        </button>
      </div>
    </header>
  );
}

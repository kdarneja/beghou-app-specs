import { Link, useNavigate } from 'react-router-dom';
import { SvgIcon } from '@progress/kendo-react-common';
import { Button } from '@progress/kendo-react-buttons';
import {
  arrowLeftIcon,
  paletteIcon,
  userIcon,
  trackChangesIcon,
  fileConfigIcon,
  unlockIcon,
  dollarIcon,
  gearIcon,
} from '@progress/kendo-svg-icons';
import type { SVGIcon } from '@progress/kendo-svg-icons';

// Admin / Settings landing — the card grid shown when the AppBar gear is clicked.
// Only Incentive Compensation is wired (KD: "add one for Incentive Compensation");
// the rest render as placeholders per the mock, no behavior.
interface SettingCard {
  icon: SVGIcon;
  title: string;
  description: string;
  to?: string; // set only for wired cards
}

const CARDS: SettingCard[] = [
  { icon: paletteIcon, title: 'Custom Branding', description: 'Customized branding and subdomain to better match your brand.' },
  { icon: userIcon, title: 'User Management', description: 'Manage users and assign client roles.' },
  { icon: trackChangesIcon, title: 'Commercial Targeting', description: 'Customize views based on clients' },
  { icon: fileConfigIcon, title: 'Roster Settings', description: 'HRIS and misc configurations for the Roster module' },
  { icon: unlockIcon, title: 'Bulk Permissions', description: 'Apply multiple permissions to various users' },
  { icon: dollarIcon, title: 'Incentive Compensation', description: 'Configuration for the Incentive Compensation module.', to: '/settings/incentive-compensation' },
  { icon: gearIcon, title: 'Goal Settings', description: 'Configuration for the Goal Settings Module' },
];

export default function SettingsHome() {
  const navigate = useNavigate();
  return (
    <div className="beghou-page set-page">
      <Link to="/" className="set-back">
        <SvgIcon icon={arrowLeftIcon} /> back to portal
      </Link>

      <div className="set-card-grid">
        {CARDS.map((c) => (
          <div key={c.title} className="set-card">
            <div className="set-card__head">
              <span className="set-card__icon"><SvgIcon icon={c.icon} /></span>
              <span className="set-card__title">{c.title}</span>
            </div>
            <p className="set-card__desc">{c.description}</p>
            <Button
              themeColor="primary"
              className="set-card__view"
              disabled={!c.to}
              onClick={() => c.to && navigate(c.to)}
            >
              View
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { ComponentType } from 'react';
import type { SVGIcon } from '@progress/kendo-svg-icons';
import { homeIcon, windowIcon, toolbarFloatIcon, gridLayoutIcon, calendarIcon, chartBarStackedIcon, dashboardIcon, chartColumnClusteredIcon, userIcon } from '@progress/kendo-svg-icons';

import Home from './pages/Home';
import StackedWindows from './pages/StackedWindows';
import MapToolbars from './pages/MapToolbars';
import AlignmentManageViews from './pages/AlignmentManageViews';
import Calendar from './pages/Calendar';
import LaunchPlanning from './pages/LaunchPlanning';
import SmallCalendar from './pages/SmallCalendar';
import AppVisualizations from './pages/AppVisualizations';
import EditProductRoles from './pages/EditProductRoles';

export type RouteDef = {
  path: string;
  label: string;
  icon: SVGIcon;
  description: string;
  component: ComponentType;
};

export const routes: RouteDef[] = [
  {
    path: '/',
    label: 'Home',
    icon: homeIcon,
    description: 'The card-based launcher for every prototype in the playground.',
    component: Home,
  },
  {
    path: '/stacked-windows',
    label: 'Alignment-Map Windows',
    icon: windowIcon,
    description: 'Prototype for stacked Kendo Window patterns.',
    component: StackedWindows,
  },
  {
    path: '/map-toolbars',
    label: 'Alignment-Map Toolbar',
    icon: toolbarFloatIcon,
    description: 'Floating Kendo Toolbar over a map with a popup tool palette.',
    component: MapToolbars,
  },
  {
    path: '/alignment-manage-views',
    label: 'Alignment-Manage Views',
    icon: gridLayoutIcon,
    description: 'Manage saved territory alignment views.',
    component: AlignmentManageViews,
  },
  {
    path: '/calendar',
    label: 'Portal-Calendar',
    icon: calendarIcon,
    description: 'Shared commercialization calendar for sales teams, built on the Kendo Scheduler.',
    component: Calendar,
  },
  {
    path: '/launch-planning',
    label: 'Launch Planning',
    icon: chartBarStackedIcon,
    description: 'Systems roadmap across launch workstreams, built on the Kendo Gantt.',
    component: LaunchPlanning,
  },
  {
    path: '/small-calendar',
    label: 'Portal-Small Calendar',
    icon: dashboardIcon,
    description: 'Portal dashboard with a compact calendar and an Events / Updates feed.',
    component: SmallCalendar,
  },
  {
    path: '/app-visualizations',
    label: 'Portal-App Visualizations',
    icon: chartColumnClusteredIcon,
    description: 'Best-practice examples of Kendo charts rendered inside app pages.',
    component: AppVisualizations,
  },
  {
    path: '/edit-product-roles',
    label: 'Portal-Admin-Edit Product Roles',
    icon: userIcon,
    description: 'Redesigned single-dialog flow for assigning roles and their inline properties.',
    component: EditProductRoles,
  },
];

// Display order for nav + landing launcher: Home pinned first, everything else
// sorted lexically by label. Sorting here (not by hand) keeps new pages in
// alphabetical order automatically.
export const navRoutes: RouteDef[] = [
  ...routes.filter((r) => r.path === '/'),
  ...routes
    .filter((r) => r.path !== '/')
    .sort((a, b) => a.label.localeCompare(b.label)),
];

// Landing launcher cards: same lexical order, minus Home.
export const launcherRoutes: RouteDef[] = navRoutes.filter((r) => r.path !== '/');

import type { ReactNode } from 'react';

/**
 * Navigation model shared by the sidebar and the header breadcrumb.
 *
 * Keeping one source of truth means a route can never drift between the menu
 * and the breadcrumb. Groups are purely presentational: they map straight onto
 * Ant Design's `type: 'group'` menu items.
 */

export interface NavGroup {
  /** i18n key for the group label. */
  titleKey: string;
  routes: NavRoute[];
}

export interface NavRoute {
  /** Router path and Ant Design menu item key. */
  path: string;
  /** i18n key for the label shown in the menu and breadcrumb. */
  labelKey: string;
  icon: ReactNode;
}

export interface PageCrumb {
  path?: string;
  labelKey: string;
}

export interface PageInfo {
  path: string;
  labelKey: string;
  /** Group label the route sits under, when it has one. */
  groupKey?: string;
}

export function findPage(routes: NavGroup[], pathname: string): PageInfo | undefined {
  for (const group of routes) {
    for (const route of group.routes) {
      if (route.path === pathname) {
        return { path: route.path, labelKey: route.labelKey, groupKey: group.titleKey };
      }
    }
  }
  return undefined;
}

/** Breadcrumb trail for a pathname: `Home / group / page` (inner-most last). */
export function breadcrumbFor(routes: NavGroup[], pathname: string, homeLabelKey: string): PageCrumb[] {
  const crumb: PageCrumb[] = [{ path: '/dashboard', labelKey: homeLabelKey }];
  const page = findPage(routes, pathname);
  if (!page || page.path === '/dashboard') {
    return crumb;
  }
  if (page.groupKey) {
    crumb.push({ labelKey: page.groupKey });
  }
  crumb.push({ path: page.path, labelKey: page.labelKey });
  return crumb;
}

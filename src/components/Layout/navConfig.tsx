import {
  DashboardOutlined,
  SettingOutlined,
  DownloadOutlined,
  LinkOutlined,
  HistoryOutlined,
  FileTextOutlined,
  FolderOutlined,
  ScheduleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { NavGroup } from './navTypes';

/**
 * Sidebar groups. Order within a group is the order users meet the workflow:
 * get work in, watch it land, then look at records and settings.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: 'layout.groupOverview',
    routes: [
      { path: '/dashboard', labelKey: 'layout.dashboard', icon: <DashboardOutlined /> },
    ],
  },
  {
    titleKey: 'layout.groupDownloads',
    routes: [
      { path: '/download', labelKey: 'layout.download', icon: <DownloadOutlined /> },
      { path: '/url-download', labelKey: 'layout.urlDownload', icon: <LinkOutlined /> },
      { path: '/scheduler', labelKey: 'layout.scheduler', icon: <ScheduleOutlined /> },
      { path: '/deliveries', labelKey: 'layout.deliveries', icon: <SendOutlined /> },
      { path: '/history', labelKey: 'layout.history', icon: <HistoryOutlined /> },
      { path: '/files', labelKey: 'layout.files', icon: <FolderOutlined /> },
    ],
  },
  {
    titleKey: 'layout.groupSystem',
    routes: [
      { path: '/logs', labelKey: 'layout.logs', icon: <FileTextOutlined /> },
      { path: '/config', labelKey: 'layout.config', icon: <SettingOutlined /> },
    ],
  },
];

export type { NavGroup };

/**
 * Ant Design menu items for the sidebar: the groups above, translated.
 */
export function buildMenuItems(
  groups: NavGroup[],
  t: (key: string) => string,
): MenuProps['items'] {
  return groups.map((group) => ({
    type: 'group' as const,
    key: group.titleKey,
    label: t(group.titleKey),
    children: group.routes.map((route) => ({
      key: route.path,
      icon: route.icon,
      label: t(route.labelKey),
    })),
  }));
}

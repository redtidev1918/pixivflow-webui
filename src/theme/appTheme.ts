import type { ThemeConfig } from 'antd';

/**
 * Design tokens for the PixivFlow WebUI.
 *
 * The UI is built almost entirely from Ant Design components, so the token
 * layer here is what actually decides whether the app looks current or dated:
 * component CSS overrides only pick up the leftovers.
 *
 * Two layers:
 *  - `token`     – global seeds (brand, typography, radius, neutrals, motion)
 *  - `components`– per-component adjustments where the global default reads
 *                  heavy or noisy in this dense, data-first application
 *
 * Values are intentionally final (no algorithmic derivation) so light mode is
 * reproducible; `cssVar` lets plain CSS read the same values.
 */

/** Brand accent. A restrained violet-blue, not stock Ant blue. */
const BRAND = '#4f46e5';

/** Neutral ramp — slightly cool, so surfaces read as one family. */
const NEUTRALS = {
  heading: '#0f172a',
  body: '#334155',
  secondary: '#64748b',
  disabled: '#94a3b8',
  border: '#e5e7eb',
  borderSecondary: '#f1f3f7',
  fill: '#f6f8fb',
  surface: '#ffffff',
  canvas: '#f7f8fb',
};

export const appTheme: ThemeConfig = {
  cssVar: { prefix: 'pf' },
  hashed: true,
  token: {
    colorPrimary: BRAND,
    colorInfo: BRAND,
    colorSuccess: '#16a34a',
    colorWarning: '#f59e0b',
    colorError: '#dc2626',
    colorLink: BRAND,

    colorTextBase: NEUTRALS.body,
    colorTextHeading: NEUTRALS.heading,
    colorTextSecondary: NEUTRALS.secondary,
    colorTextTertiary: NEUTRALS.secondary,
    colorTextQuaternary: NEUTRALS.disabled,
    colorBorder: NEUTRALS.border,
    colorBorderSecondary: NEUTRALS.borderSecondary,
    colorFillQuaternary: NEUTRALS.fill,
    colorBgLayout: NEUTRALS.canvas,
    colorBgContainer: NEUTRALS.surface,
    colorBgElevated: NEUTRALS.surface,

    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontSize: 14,
    fontSizeHeading1: 30,
    fontSizeHeading2: 22,
    fontSizeHeading3: 17,
    fontSizeHeading4: 15,
    fontSizeHeading5: 14,
    lineHeight: 1.5715,

    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 8,
    borderRadiusXS: 6,

    controlHeight: 34,
    controlHeightLG: 40,
    controlHeightSM: 28,

    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.04)',
    boxShadowSecondary:
      '0 6px 16px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
    boxShadowTertiary: '0 1px 2px rgba(15, 23, 42, 0.04)',

    wireframe: false,
    motionDurationMid: '0.18s',
  },
  components: {
    Layout: {
      bodyBg: NEUTRALS.canvas,
      headerBg: NEUTRALS.surface,
      headerHeight: 60,
      headerPadding: '0 24px',
      siderBg: NEUTRALS.surface,
    },
    Menu: {
      itemHeight: 42,
      itemMarginInline: 10,
      itemMarginBlock: 4,
      itemBorderRadius: 10,
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemColor: NEUTRALS.body,
      itemHoverColor: BRAND,
      itemHoverBg: '#f2f3fb',
      itemSelectedColor: BRAND,
      itemSelectedBg: '#eceefd',
      iconSize: 16,
      collapsedIconSize: 18,
      itemPaddingInline: 12,
    },
    Card: {
      borderRadiusLG: 14,
      paddingLG: 22,
      headerHeight: 52,
      headerFontSize: 15,
      headerBg: 'transparent',
      colorBorderSecondary: NEUTRALS.borderSecondary,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: NEUTRALS.heading,
      headerSplitColor: 'transparent',
      headerBorderRadius: 12,
      borderColor: NEUTRALS.borderSecondary,
      rowHoverBg: '#f8fafc',
      cellPaddingBlock: 13,
      cellPaddingInline: 16,
      footerBg: 'transparent',
    },
    Button: {
      fontWeight: 500,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      paddingInline: 16,
    },
    Input: { paddingBlock: 6, activeShadow: '0 0 0 3px rgba(79, 70, 229, 0.12)' },
    InputNumber: { activeShadow: '0 0 0 3px rgba(79, 70, 229, 0.12)' },
    Select: { optionSelectedBg: '#eceefd', optionPadding: '7px 12px' },
    Tabs: {
      horizontalItemPadding: '10px 0',
      horizontalItemGutter: 28,
      titleFontSize: 14,
      cardBg: NEUTRALS.fill,
    },
    Tag: { defaultBg: NEUTRALS.fill, defaultColor: NEUTRALS.body, borderRadiusSM: 6 },
    Statistic: { titleFontSize: 13, contentFontSize: 28 },
    Alert: { borderRadiusLG: 12, defaultPadding: '12px 16px' },
    Modal: { borderRadiusLG: 16, headerBg: 'transparent', titleFontSize: 17 },
    Descriptions: { itemPaddingBottom: 12, labelBg: 'transparent' },
    Form: { labelColor: NEUTRALS.heading, verticalLabelPadding: '0 0 6px' },
    Breadcrumb: {
      itemColor: NEUTRALS.secondary,
      lastItemColor: NEUTRALS.heading,
      linkColor: NEUTRALS.secondary,
      linkHoverColor: BRAND,
      separatorColor: NEUTRALS.disabled,
      fontSize: 13,
    },
    Segmented: { itemSelectedBg: NEUTRALS.surface, borderRadius: 10, trackBg: NEUTRALS.fill },
    Empty: { colorTextDescription: NEUTRALS.secondary },
    Progress: { defaultColor: BRAND },
    Drawer: { paddingLG: 22 },
  },
};

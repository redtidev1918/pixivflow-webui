import { Layout, Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_GROUPS, buildMenuItems } from '../navConfig';

const { Sider } = Layout;

interface LayoutSiderProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

/**
 * Layout sidebar component
 */
export default function LayoutSider({ collapsed, onCollapse }: LayoutSiderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = buildMenuItems(NAV_GROUPS, t);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      theme="light"
      className="pf-sider"
    >
      <div className="pf-brand">
        <span className="pf-brand-mark" aria-hidden="true">
          PF
        </span>
        {!collapsed && <span className="pf-brand-text">PixivFlow</span>}
      </div>
      <Menu
        className="pf-sider-menu"
        theme="light"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  );
}

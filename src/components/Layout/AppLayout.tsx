import { Outlet } from 'react-router-dom';
import { Layout, theme } from 'antd';
import { useState } from 'react';
import { LayoutHeader, LayoutSider } from './components';
import { useLayoutAuth } from './hooks';

const { Content } = Layout;

/**
 * Main application layout component.
 *
 * The shell owns the viewport height: the sidebar and header are fixed and the
 * content area is the only vertical scroller. Scrolling the body as well would
 * leave the page with two competing scroll positions (and let inner tables add
 * a third), which is what made the UI feel like it scrolled in odd places.
 */
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const {
    isAuthenticated,
    isLoggingOut,
    isRefreshingToken,
    handleLogin,
    handleLogout,
    handleRefreshToken,
  } = useLayoutAuth();

  return (
    <Layout className="pf-layout">
      <LayoutSider collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout className="pf-layout-inner">
        <LayoutHeader
          isAuthenticated={isAuthenticated}
          isLoggingOut={isLoggingOut}
          isRefreshingToken={isRefreshingToken}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onRefreshToken={handleRefreshToken}
          colorBgContainer={colorBgContainer}
        />
        <Content className="pf-content">
          <div className="pf-content-inner fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

import { Layout, Space, Button, Select, Breadcrumb, Tooltip } from 'antd';

const { Header } = Layout;
import {
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_GROUPS } from '../navConfig';
import { breadcrumbFor } from '../navTypes';

interface LayoutHeaderProps {
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  isRefreshingToken: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onRefreshToken: () => void;
  colorBgContainer: string;
}

/**
 * Layout header component: breadcrumb on the left, account/language on the
 * right. Session actions are deliberately quiet — they are not page actions.
 */
export default function LayoutHeader({
  isAuthenticated,
  isLoggingOut,
  isRefreshingToken,
  onLogin,
  onLogout,
  onRefreshToken,
  colorBgContainer,
}: LayoutHeaderProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const crumbs = breadcrumbFor(NAV_GROUPS, location.pathname, t('layout.home'));

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  return (
    <Header className="pf-header" style={{ background: colorBgContainer }}>
      <div className="pf-header-title">
        <Breadcrumb
          items={crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return {
              title: isLast ? (
                <span>{t(crumb.labelKey)}</span>
              ) : (
                <a
                  onClick={() => crumb.path && navigate(crumb.path)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && crumb.path) {
                      navigate(crumb.path);
                    }
                  }}
                >
                  {t(crumb.labelKey)}
                </a>
              ),
            };
          })}
        />
      </div>
      <div className="pf-header-actions">
        {isAuthenticated ? (
          <Space size={4}>
            <Tooltip title={t('layout.refreshToken')}>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={onRefreshToken}
                loading={isRefreshingToken}
                aria-label={t('layout.refreshToken')}
              />
            </Tooltip>
            <Tooltip title={t('layout.logout')}>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={onLogout}
                loading={isLoggingOut}
                aria-label={t('layout.logout')}
              />
            </Tooltip>
          </Space>
        ) : (
          <Button type="primary" icon={<LoginOutlined />} onClick={onLogin} size="small">
            {t('layout.login')}
          </Button>
        )}
        <span className="pf-header-divider" aria-hidden="true" />
        <Select
          className="pf-lang-select"
          variant="borderless"
          suffixIcon={<GlobalOutlined />}
          value={i18n.language}
          onChange={handleLanguageChange}
          style={{ width: 116 }}
          aria-label={t('layout.language')}
          options={[
            { label: t('layout.languageZh'), value: 'zh-CN' },
            { label: t('layout.languageEn'), value: 'en-US' },
          ]}
        />
      </div>
    </Header>
  );
}

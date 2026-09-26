import { Card, Row, Col, Statistic, Spin, Button, message, Typography } from 'antd';
const { Paragraph } = Typography;
import { DownloadOutlined, PictureOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useStatsOverview } from '../hooks/useStats';
import { useSchedulerSlots } from '../hooks/useScheduler';
import { StatsOverview } from '../services/api/types';
import { PageHeader } from '../components/common';

/** Scheduler slot states that count as a successful run. */
const SUCCESS_SLOT_STATES = ['success', 'submitted', 'published'];

export default function Dashboard() {
  const { t } = useTranslation();
  const { stats, isLoading, refetch: refetchStats } = useStatsOverview();
  const { slots } = useSchedulerSlots(20, false);

  // Handle refresh stats
  const handleRefreshStats = useCallback(async () => {
    message.loading({ content: t('dashboard.refreshingStats'), key: 'refresh-stats' });
    try {
      await refetchStats();
      message.success({ content: t('dashboard.statsRefreshed'), key: 'refresh-stats', duration: 2 });
    } catch (error) {
      message.error({ content: t('dashboard.refreshStatsFailed'), key: 'refresh-stats', duration: 2 });
    }
  }, [refetchStats, t]);

  if (isLoading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 50 }} />;
  }

  // Extract stats data - stats is already StatsOverview | undefined from the service
  const statsData: StatsOverview = stats || {
    totalDownloads: 0,
    illustrations: 0,
    novels: 0,
    recentDownloads: 0,
  };

  const schedulerSummary = [
    {
      key: 'recent',
      label: t('dashboard.recentSlots'),
      value: slots?.length ?? 0,
    },
    {
      key: 'success',
      label: t('dashboard.successSlots'),
      value: (slots ?? []).filter((s) =>
        SUCCESS_SLOT_STATES.includes(s.status.toLowerCase()),
      ).length,
    },
    {
      key: 'noCandidate',
      label: t('dashboard.noCandidateSlots'),
      value: (slots ?? []).filter((s) => s.status.toLowerCase() === 'no_candidate').length,
    },
    {
      key: 'failed',
      label: t('dashboard.failedSlots'),
      value: (slots ?? []).filter((s) => s.status.toLowerCase() === 'failed').length,
    },
  ];

  const statTiles = [
    {
      key: 'total',
      title: t('dashboard.totalDownloads'),
      value: statsData.totalDownloads,
      icon: <DownloadOutlined />,
    },
    {
      key: 'illustrations',
      title: t('dashboard.illustrations'),
      value: statsData.illustrations,
      icon: <PictureOutlined />,
    },
    {
      key: 'novels',
      title: t('dashboard.novels'),
      value: statsData.novels,
      icon: <FileTextOutlined />,
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title={t('dashboard.title')}
        actions={
          <Button icon={<ReloadOutlined />} onClick={handleRefreshStats} loading={isLoading}>
            {t('dashboard.refreshStats')}
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        {statTiles.map((tile) => (
          <Col key={tile.key} xs={24} sm={12} lg={8}>
            <Card variant="outlined" className="pf-stat-card">
              <div className="pf-stat">
                <span className="pf-stat-icon" aria-hidden="true">
                  {tile.icon}
                </span>
                <Statistic title={tile.title} value={tile.value} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title={t('dashboard.schedulerHealth')} variant="outlined">
        <div className="pf-stat-grid">
          {schedulerSummary.map((item) => (
            <div className="pf-stat-cell" key={item.key}>
              <span className="pf-stat-cell-label">{item.label}</span>
              <span className="pf-stat-cell-value">{item.value}</span>
            </div>
          ))}
        </div>
        <Paragraph type="secondary" className="mt-16 mb-0">
          {t('dashboard.schedulerHint')}
        </Paragraph>
      </Card>

      <Card title={t('dashboard.recentDownloads')} variant="outlined">
        <p className="mb-0">
          {t('dashboard.recentDownloadsDesc', { count: statsData.recentDownloads })}
        </p>
      </Card>
    </div>
  );
}

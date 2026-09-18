import { Card, Row, Col, Statistic, Spin, Button, message, Tag, List, Typography } from 'antd';
const { Paragraph } = Typography;
import { DownloadOutlined, PictureOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useStatsOverview } from '../hooks/useStats';
import { useSchedulerSlots } from '../hooks/useScheduler';
import { StatsOverview } from '../services/api/types';

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{t('dashboard.title')}</h2>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleRefreshStats}
          loading={isLoading}
        >
          {t('dashboard.refreshStats')}
        </Button>
      </div>
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('dashboard.totalDownloads')}
              value={statsData.totalDownloads}
              prefix={<DownloadOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('dashboard.illustrations')}
              value={statsData.illustrations}
              prefix={<PictureOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('dashboard.novels')}
              value={statsData.novels}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={t('dashboard.schedulerHealth')}>
            <List
              dataSource={[
                { label: t('dashboard.recentSlots'), value: slots?.length ?? 0 },
                { label: t('dashboard.successSlots'), value: (slots ?? []).filter((s) => ['success','submitted','published'].includes(s.status.toLowerCase())).length },
                { label: t('dashboard.noCandidateSlots'), value: (slots ?? []).filter((s) => s.status.toLowerCase() === 'no_candidate').length },
                { label: t('dashboard.failedSlots'), value: (slots ?? []).filter((s) => s.status.toLowerCase() === 'failed').length },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Tag>{item.label}</Tag> {item.value}
                </List.Item>
              )}
            />
            <Paragraph type="secondary">
              {t('dashboard.schedulerHint')}
            </Paragraph>
          </Card>
        </Col>
        <Col span={24}>
          <Card title={t('dashboard.recentDownloads')}>
            <p>{t('dashboard.recentDownloadsDesc', { count: statsData.recentDownloads })}</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
}


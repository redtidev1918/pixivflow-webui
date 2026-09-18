import { useCallback } from 'react';
import { Button, Card, Spin, Table, Tag, Typography, message, Alert } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useSchedulerSlots } from '../../hooks/useScheduler';
import { SchedulerSlot, SchedulerSlotCell } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

const { Text, Title } = Typography;

function statusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'running':
      return 'processing';
    case 'pending':
      return 'default';
    case 'success':
    case 'submitted':
    case 'published':
      return 'success';
    case 'failed':
      return 'error';
    default:
      return 'warning';
  }
}

function targetRows(targets: SchedulerSlotCell[]): SchedulerSlotCell[] {
  return Array.isArray(targets) ? targets : [];
}

export default function Scheduler() {
  const { t } = useTranslation();
  const { slots, isLoading, error, refetch } = useSchedulerSlots();

  const handleRefresh = useCallback(async () => {
    message.loading({ content: t('scheduler.refreshing'), key: 'scheduler-refresh' });
    try {
      await refetch();
      message.success({ content: t('scheduler.refreshed'), key: 'scheduler-refresh', duration: 2 });
    } catch {
      message.error({ content: t('scheduler.refreshFailed'), key: 'scheduler-refresh', duration: 3 });
    }
  }, [refetch, t]);

  const columns: ColumnsType<SchedulerSlot> = [
    {
      title: t('scheduler.slotId'),
      dataIndex: 'slotId',
      key: 'slotId',
      ellipsis: true,
      render: (id: string) => <Text copyable={{ text: id }}>{id}</Text>,
    },
    {
      title: t('scheduler.schedule'),
      dataIndex: 'scheduleId',
      key: 'scheduleId',
    },
    {
      title: t('scheduler.occurrence'),
      key: 'occurrence',
      render: (_, slot) => (
        <span>
          {slot.occurrenceDate}
          {slot.occurrenceLabel ? ` ${slot.occurrenceLabel}` : ''}
          {slot.occurrenceAt ? <div className="scheduler-utc">{formatDate(new Date(slot.occurrenceAt))}</div> : null}
        </span>
      ),
    },
    {
      title: t('scheduler.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag>,
    },
    {
      title: t('scheduler.trigger'),
      dataIndex: 'triggerSource',
      key: 'triggerSource',
      render: (value?: string | null) => value || '-',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          {t('scheduler.title')}
        </Title>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
          {t('scheduler.refresh')}
        </Button>
      </div>

      {error ? (
        <Alert type="error" showIcon message={t('scheduler.loadFailed')} closable style={{ marginBottom: 16 }} />
      ) : null}

      {isLoading && !slots ? (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 50 }} />
      ) : (
        <Card title={t('scheduler.recentSlots')}>
          <Table
            rowKey={(slot) => slot.slotId}
            columns={columns}
            dataSource={slots || []}
            pagination={{ pageSize: 10 }}
            expandable={{
              expandedRowRender: (slot) => (
                <Table
                  rowKey={(cell) => `${slot.slotId}:${cell.targetId}`}
                  size="small"
                  pagination={false}
                  dataSource={targetRows(slot.targets)}
                  columns={[
                    {
                      title: t('scheduler.target'),
                      dataIndex: 'targetId',
                      key: 'targetId',
                    },
                    {
                      title: t('scheduler.workType'),
                      dataIndex: 'workType',
                      key: 'workType',
                    },
                    {
                      title: t('scheduler.status'),
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag>,
                    },
                    {
                      title: t('scheduler.workId'),
                      dataIndex: 'workId',
                      key: 'workId',
                      render: (value?: string | null) => value || '-',
                    },
                    {
                      title: t('scheduler.reason'),
                      key: 'reason',
                      render: (_, cell) => (
                        <span>
                          {cell.terminalReasonCode ? (
                            <Tag color="volcano">{cell.terminalReasonCode}</Tag>
                          ) : null}
                          <Text type="secondary">{cell.reason || '-'}</Text>
                        </span>
                      ),
                    },
                  ]}
                />
              ),
            }}
          />
        </Card>
      )}
    </div>
  );
}

import { useCallback, useState } from 'react';
import {
  Button,
  Card,
  Modal,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  Alert,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useSchedulerSlots } from '../../hooks/useScheduler';
import { useSchedulerExecutions } from '../../hooks/useSchedulerExecutions';
import {
  CandidateReport,
  SchedulerExecution,
  SchedulerSlot,
  SchedulerSlotCell,
} from '../../services/api';
import { schedulerService } from '../../services/schedulerService';
import { formatDate } from '../../utils/dateUtils';

const { Text, Title, Paragraph } = Typography;

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
  const [activeTab, setActiveTab] = useState('slots');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [logSlotId, setLogSlotId] = useState<string | null>(null);
  const [logTargets, setLogTargets] = useState<string[]>([]);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const { slots, isLoading, error, refetch } = useSchedulerSlots();
  const {
    executions,
    isLoading: isLoadingExecutions,
    error: errorExecutions,
    refetch: refetchExecutions,
  } = useSchedulerExecutions(statusFilter ? { status: statusFilter } : undefined);

  const handleRefresh = useCallback(async () => {
    const tasks = [refetch(), refetchExecutions()];
    message.loading({ content: t('scheduler.refreshing'), key: 'scheduler-refresh' });
    try {
      await Promise.all(tasks);
      message.success({ content: t('scheduler.refreshed'), key: 'scheduler-refresh', duration: 2 });
    } catch {
      message.error({ content: t('scheduler.refreshFailed'), key: 'scheduler-refresh', duration: 3 });
    }
  }, [refetch, refetchExecutions, t]);

  const handleRecover = useCallback(
    (targetId: string, retryMode: 'normal' | 'relaxed') => {
      const requestId = crypto.randomUUID();
      const key = retryMode === 'relaxed' ? 'scheduler.relaxedRecovery' : 'scheduler.recovery';
      const confirmKey = retryMode === 'relaxed' ? 'scheduler.relaxedRecoveryConfirm' : 'scheduler.recoveryConfirm';
      Modal.confirm({
        title: t(key),
        content: t(confirmKey, { target: targetId }),
        okText: t(key),
        cancelText: t('common.cancel'),
        onOk: async () => {
          message.loading({ content: t('scheduler.recoverySubmitting'), key: 'recover' });
          try {
            await schedulerService.submitRecover(targetId, { requestId, retryMode });
            message.success({ content: t('scheduler.recoverySubmitted'), key: 'recover', duration: 3 });
            setTimeout(() => {
              refetch();
              refetchExecutions();
            }, 1500);
          } catch (err: unknown) {
            const code = (err as { response?: { status?: number } })?.response?.status;
            const text =
              code === 503 ? t('scheduler.recoveryUnavailable') : t('scheduler.recoveryFailed');
            message.error({ content: text, key: 'recover', duration: 4 });
          }
        },
      });
    },
    [t, refetch, refetchExecutions]
  );

  const openSlotLogs = useCallback(
    async (slotId: string, targets: string[] = []) => {
      setLogSlotId(slotId);
      setLogTargets(targets);
      setLogLines([]);
      setLogLoading(true);
      try {
        const data = await schedulerService.getSlotLogs(slotId);
        setLogLines(data.logs);
      } catch {
        message.error({ content: t('scheduler.logsLoadFailed'), key: 'slot-logs', duration: 3 });
      } finally {
        setLogLoading(false);
      }
    },
    [t]
  );

  const candidateTags = (report?: CandidateReport | null) => {
    if (!report) return <Text type="secondary">-</Text>;
    const reasons = report.reasons ?? [];
    const dup = reasons
      .filter((r) => (r.code ?? '').toLowerCase().includes('duplicate'))
      .reduce((acc, r) => acc + (r.count || 0), 0);
    const ratio = report.fetched ? `${((dup / report.fetched) * 100).toFixed(1)}%` : '-';
    return (
      <span>
        {typeof report.fetched === 'number' ? <Tag>{t('scheduler.fetched')}: {report.fetched}</Tag> : null}
        {typeof report.selected === 'number' ? <Tag color="green">{t('scheduler.selected')}: {report.selected}</Tag> : null}
        {typeof report.rejected === 'number' ? <Tag color="orange">{t('scheduler.rejected')}: {report.rejected}</Tag> : null}
        {report.fetched ? <Tag color="geekblue">{t('scheduler.duplicateRatio')}: {ratio}</Tag> : null}
      </span>
    );
  };

  const cellColumns: ColumnsType<SchedulerSlotCell> = [
    {
      title: t('scheduler.target'),
      dataIndex: 'targetId',
      key: 'targetId',
    },
    {
      title: t('scheduler.workType'),
      dataIndex: 'workType',
      key: 'workType',
      render: (value?: string | null) => value || '-',
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
      title: t('scheduler.candidateFunnel'),
      key: 'candidateFunnel',
      render: (_, cell) => candidateTags(cell.candidateReport),
    },
    {
      title: t('scheduler.reason'),
      key: 'reason',
      render: (_, cell) => (
        <span>
          {cell.terminalReasonCode ? <Tag color="volcano">{cell.terminalReasonCode}</Tag> : null}
          <Text type="secondary">{cell.reason || '-'}</Text>
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 220,
      render: (_, cell) => (
        <span>
          <Button size="small" type="link" onClick={() => openSlotLogs((cell as unknown as { slotId?: string }).slotId ?? '', [cell.targetId])}>
            {t('scheduler.viewLogs')}
          </Button>
        </span>
      ),
    },
  ];

  const slotColumns: ColumnsType<SchedulerSlot> = [
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
      render: (status: string, slot) => (
        <span>
          <Tag color={statusColor(status)}>{status}</Tag>
          {slot.recoveryMode ? (
            <Tag color="purple">
              {t('scheduler.recoveryMode')}: {slot.recoveryMode}
            </Tag>
          ) : null}
        </span>
      ),
    },
    {
      title: t('scheduler.trigger'),
      dataIndex: 'triggerSource',
      key: 'triggerSource',
      render: (value?: string | null) => value || '-',
    },
    {
      title: '',
      key: 'logs',
      width: 100,
      render: (_, slot) => (
        <Button size="small" type="link" onClick={() => openSlotLogs(slot.slotId)}>
          {t('scheduler.viewLogs')}
        </Button>
      ),
    },
  ];

  const executionColumns: ColumnsType<SchedulerExecution> = [
    {
      title: t('scheduler.executionId'),
      dataIndex: 'executionId',
      key: 'executionId',
      ellipsis: true,
      render: (id: string) => <Text copyable={{ text: id }}>{id}</Text>,
    },
    {
      title: t('scheduler.target'),
      dataIndex: 'targetId',
      key: 'targetId',
    },
    {
      title: t('scheduler.schedule'),
      dataIndex: 'scheduleId',
      key: 'scheduleId',
    },
    {
      title: t('scheduler.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag>,
    },
    {
      title: t('scheduler.terminalReason'),
      dataIndex: 'terminalReasonCode',
      key: 'terminalReasonCode',
      render: (code?: string | null, row?: SchedulerExecution) => (
        <span>
          {code ? <Tag color="volcano">{code}</Tag> : null}
          <Text type="secondary">{row?.message || '-'}</Text>
        </span>
      ),
    },
    {
      title: t('scheduler.candidateFunnel'),
      key: 'candidateFunnel',
      render: (_, exec) => candidateTags(exec.candidateReport),
    },
    {
      title: t('scheduler.operatorHint'),
      dataIndex: 'operatorHint',
      key: 'operatorHint',
      render: (value?: string) => <Text type="secondary">{value || '-'}</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 200,
      render: (_, exec) => (
        <span>
          {exec.recovery?.retryable || exec.status.toLowerCase() === 'failed' ? (
            <Button size="small" onClick={() => handleRecover(exec.targetId, 'normal')}>
              {t('scheduler.recovery')}
            </Button>
          ) : null}
          {exec.recovery?.relaxedRetryAllowed && exec.recovery?.retryable !== true ? (
            <Button size="small" style={{ marginLeft: 4 }} onClick={() => handleRecover(exec.targetId, 'relaxed')}>
              {t('scheduler.relaxedRecovery')}
            </Button>
          ) : null}
          <Button size="small" type="link" onClick={() => openSlotLogs(exec.slotId)}>
            {t('scheduler.viewLogs')}
          </Button>
        </span>
      ),
    },
  ];

  const renderSlots = (
    <Card title={t('scheduler.recentSlots')}>
      <Table
        rowKey={(slot) => slot.slotId}
        columns={slotColumns}
        dataSource={slots || []}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (slot) => (
            <Table
              rowKey={(cell) => `${slot.slotId}:${cell.targetId}`}
              size="small"
              pagination={false}
              dataSource={targetRows(slot.targets)}
              columns={
                [
                  ...cellColumns.slice(0, 5),
                  {
                    title: '',
                    key: 'recovery',
                    width: 180,
                    render: (_, cell) =>
                      ['failed', 'no_candidate', 'duplicate'].includes(cell.status.toLowerCase()) ? (
                        <span>
                          <Button size="small" onClick={() => handleRecover(cell.targetId, 'normal')}>
                            {t('scheduler.recovery')}
                          </Button>
                          <Button size="small" style={{ marginLeft: 4 }} onClick={() => handleRecover(cell.targetId, 'relaxed')}>
                            {t('scheduler.relaxedRecovery')}
                          </Button>
                        </span>
                      ) : null,
                  },
                ] as ColumnsType<SchedulerSlotCell>
              }
            />
          ),
        }}
      />
    </Card>
  );

  const renderExecutions = (
    <Card title={t('scheduler.executions')}>
      {errorExecutions ? (
        <Alert type="error" showIcon message={t('scheduler.loadFailed')} closable style={{ marginBottom: 16 }} />
      ) : null}
      <Select
        allowClear
        placeholder={t('scheduler.filterStatus')}
        style={{ width: 220, marginBottom: 16 }}
        value={statusFilter}
        onChange={(v?: string) => setStatusFilter(v)}
        options={[
          { value: 'failed', label: 'failed' },
          { value: 'no_candidate', label: 'no_candidate' },
          { value: 'submitted', label: 'submitted' },
          { value: 'running', label: 'running' },
          { value: 'duplicate', label: 'duplicate' },
        ]}
      />
      <Table
        rowKey={(exec) => exec.executionId}
        columns={executionColumns}
        dataSource={executions}
        loading={isLoadingExecutions}
        pagination={{ pageSize: 20 }}
      />
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          {t('scheduler.title')}
        </Title>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading || isLoadingExecutions}>
          {t('scheduler.refresh')}
        </Button>
      </div>

      {error ? (
        <Alert type="error" showIcon message={t('scheduler.loadFailed')} closable style={{ marginBottom: 16 }} />
      ) : null}

      {isLoading && !slots ? (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 50 }} />
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'slots', label: t('scheduler.recentSlots'), children: renderSlots },
            { key: 'executions', label: t('scheduler.executions'), children: renderExecutions },
          ]}
        />
      )}

      <Modal
        title={t('scheduler.slotLogs')}
        open={Boolean(logSlotId)}
        onCancel={() => setLogSlotId(null)}
        footer={null}
        width={900}
      >
        {logTargets.length ? (
          <Paragraph type="secondary">
            {logTargets.map((tid) => (
              <Tag key={tid}>{tid}</Tag>
            ))}
          </Paragraph>
        ) : null}
        {logLoading ? (
          <Spin />
        ) : logLines.length === 0 ? (
          <Text type="secondary">{t('scheduler.noLogs')}</Text>
        ) : (
          <pre style={{ maxHeight: 480, overflow: 'auto', fontSize: 12 }}>
            {logLines.join('\n')}
          </pre>
        )}
      </Modal>
    </div>
  );
}

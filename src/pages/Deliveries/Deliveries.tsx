import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Select, Space, Spin, Table, Tabs, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useDeliveries } from '../../hooks/useDeliveries';
import { useGateways } from '../../hooks/useGateways';
import type {
  DeliveryCounts,
  DeliveryRecord,
  GatewayCapabilities,
  GatewayRoute,
} from '../../services/api/types';
import { formatDate } from '../../utils/dateUtils';
import { isAuthRequiredError } from '../../utils/authError';
import LoginRequiredAlert from '../../components/LoginRequiredAlert';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import PairingDialog from './components/PairingDialog';
import { PageHeader } from '../../components/common';

const { Text, Paragraph } = Typography;

const DELIVERY_STATUSES = ['pending', 'delivered', 'duplicate', 'failed'] as const;

function connectionColor(status: string): string {
  switch (status) {
    case 'connected':
      return 'success';
    case 'waiting':
      return 'processing';
    case 'unreachable':
      return 'error';
    default:
      // 'unknown' is not a failure: nothing has been observed yet.
      return 'default';
  }
}

function deliveryStatusColor(status: string): string {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'duplicate':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'processing';
  }
}

/**
 * The capabilities a route declares, as short tags.
 *
 * Capability is data from the backend, never inferred from a platform name:
 * an unknown platform is deliberately text-only, and the panel must show that
 * rather than promise media the gateway would drop.
 */
function capabilityTags(capabilities: GatewayCapabilities | undefined) {
  if (!capabilities) {
    return <Text type="secondary">-</Text>;
  }
  const supported = Array.isArray(capabilities.supported) ? capabilities.supported : [];
  return (
    <Space size={[4, 4]} wrap>
      {supported.map((cap) => (
        <Tag key={cap}>{cap}</Tag>
      ))}
    </Space>
  );
}

function countSummary(counts: DeliveryCounts | null): string {
  if (!counts) {
    return '-';
  }
  return `${counts.delivered}/${counts.pending}/${counts.failed}`;
}

/**
 * Delivery panel — read-only projection of PixivFlow's delivery plane.
 *
 * Two tabs, one subject: the gateway routes declared in config (what each one
 * can carry, and PixivFlow's last observation of its pairing state), and the
 * durable delivery ledger (what actually happened, per route). Nothing here
 * pairs a platform, retries a delivery or generates a QR code: those belong to
 * the gateway process and to the server-side operator CLI.
 */
export default function Deliveries() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const [activeTab, setActiveTab] = useState('gateways');
  const [pairingGateway, setPairingGateway] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [tabGateway, setTabGateway] = useState<string | undefined>();

  const {
    gateways,
    unconfigured,
    isLoading: isLoadingGateways,
    error: gatewaysError,
    refetch: refetchGateways,
  } = useGateways();

  const {
    deliveries,
    counts,
    isLoading: isLoadingDeliveries,
    error: deliveriesError,
    refetch: refetchDeliveries,
  } = useDeliveries({
    status: statusFilter as DeliveryRecord['status'] | undefined,
    target: tabGateway,
  });

  const handleRefresh = useCallback(async () => {
    message.loading({ content: t('delivery.refreshing'), key: 'delivery-refresh' });
    try {
      await Promise.all([refetchGateways(), refetchDeliveries()]);
      message.success({ content: t('delivery.refreshed'), key: 'delivery-refresh', duration: 2 });
    } catch {
      message.error({ content: t('delivery.refreshFailed'), key: 'delivery-refresh', duration: 3 });
    }
  }, [refetchGateways, refetchDeliveries, t]);

  const openPairing = useCallback((name: string) => {
    setPairingGateway(name);
  }, []);

  const gatewayColumns: ColumnsType<GatewayRoute> = [
    {
      title: t('delivery.gatewayName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row) => (
        <span>
          <Text strong>{name}</Text>
          {!row.enabled ? (
            <Tag style={{ marginLeft: 8 }} color="default">
              {t('delivery.gatewayDisabled')}
            </Tag>
          ) : null}
        </span>
      ),
    },
    {
      title: t('delivery.gatewayType'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: t('delivery.gatewayEndpoint'),
      dataIndex: 'endpoint',
      key: 'endpoint',
      ellipsis: true,
      render: (endpoint: string | null) =>
        endpoint ? <Text code>{endpoint}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: t('delivery.connectionStatus'),
      key: 'connectionStatus',
      render: (_, row) => (
        <span>
          <Tag color={connectionColor(row.connectionStatus)}>
            {t(`delivery.status.${row.connectionStatus}`, row.connectionStatus)}
          </Tag>
          {row.connectionUpdatedAt ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDate(new Date(row.connectionUpdatedAt))}
              </Text>
            </div>
          ) : null}
        </span>
      ),
    },
    {
      title: t('delivery.capabilities'),
      key: 'capabilities',
      render: (_, row) => capabilityTags(row.capabilities),
    },
    {
      title: t('delivery.deliveryCounts'),
      key: 'deliveryCounts',
      render: (_, row) => (
        <Text title={t('delivery.deliveryCountsHint')}>{countSummary(row.deliveryCounts)}</Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, row) =>
        row.pairingSupported ? (
          <Button size="small" type="link" onClick={() => openPairing(row.name)}>
            {t('delivery.pair')}
          </Button>
        ) : (
          <Text type="secondary">{t('delivery.pairingUnavailableShort')}</Text>
        ),
    },
  ];

  const historyColumns: ColumnsType<DeliveryRecord> = [
    {
      title: t('delivery.deliveryTarget'),
      dataIndex: 'deliveryTarget',
      key: 'deliveryTarget',
      render: (value?: string | null) => value || '-',
    },
    {
      title: t('delivery.work'),
      key: 'work',
      render: (_, row) => (
        <span>
          <Text>{row.workType}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.pixivId}
            </Text>
          </div>
        </span>
      ),
    },
    {
      title: t('delivery.deliveryStatus'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string, row) => (
        <span>
          <Tag color={deliveryStatusColor(status)}>
            {t(`delivery.deliveryStatusLabel.${status}`, status)}
          </Tag>
          {row.outboxStatus ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('delivery.outbox')}: {row.outboxStatus}
              </Text>
            </div>
          ) : null}
        </span>
      ),
    },
    {
      title: t('delivery.attempts'),
      dataIndex: 'attempts',
      key: 'attempts',
      width: 90,
    },
    {
      title: t('delivery.reason'),
      dataIndex: 'lastError',
      key: 'lastError',
      ellipsis: true,
      render: (value?: string | null) =>
        value ? <Text type="danger">{value}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: t('delivery.occurrence'),
      key: 'occurrence',
      render: (_, row) => (
        <span>
          {row.slotId ? <div>{row.slotId}</div> : null}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.updatedAt ? formatDate(new Date(row.updatedAt)) : '-'}
          </Text>
        </span>
      ),
    },
  ];

  const renderGateways = () => (
    <div>
      {(unconfigured ?? []).length > 0 ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={t('delivery.unconfiguredTitle')}
          description={
            <span>
              {(unconfigured ?? []).map((item) => (
                <Tag key={item.name}>{item.name}</Tag>
              ))}
              <div>
                <Text type="secondary">{t('delivery.unconfiguredHint')}</Text>
              </div>
            </span>
          }
        />
      ) : null}

      <Table<GatewayRoute>
        rowKey="name"
        columns={gatewayColumns}
        dataSource={gateways ?? []}
        loading={isLoadingGateways}
        pagination={false}
        locale={{ emptyText: t('delivery.noGateways') }}
      />

      {(gateways ?? []).length === 0 && !isLoadingGateways ? (
        <Paragraph type="secondary" style={{ marginTop: 12 }}>
          {t('delivery.noGatewaysHint')}
        </Paragraph>
      ) : null}
    </div>
  );

  const renderHistory = () => (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Select
          allowClear
          style={{ width: 180 }}
          placeholder={t('delivery.filterStatus')}
          value={statusFilter}
          onChange={setStatusFilter}
          options={DELIVERY_STATUSES.map((status) => ({
            value: status,
            label: t(`delivery.deliveryStatusLabel.${status}`, status),
          }))}
        />
        <Select
          allowClear
          style={{ width: 220 }}
          placeholder={t('delivery.filterGateway')}
          value={tabGateway}
          onChange={setTabGateway}
          options={(gateways ?? []).map((row) => ({ value: row.name, label: row.name }))}
        />
        {counts ? (
          <Space size={[4, 4]} wrap>
            {DELIVERY_STATUSES.map((status) => (
              <Tag key={status} color={deliveryStatusColor(status)}>
                {t(`delivery.deliveryStatusLabel.${status}`, status)}: {counts[status] ?? 0}
              </Tag>
            ))}
          </Space>
        ) : null}
      </Space>

      <Table<DeliveryRecord>
        rowKey="id"
        columns={historyColumns}
        dataSource={deliveries ?? []}
        loading={isLoadingDeliveries}
        pagination={false}
        locale={{ emptyText: t('delivery.noDeliveries') }}
      />
    </div>
  );

  // Report the failure once per change, not on every render.
  const error = gatewaysError ?? deliveriesError;
  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  return (
    <div className="page">
      <PageHeader
        title={t('delivery.title')}
        description={t('delivery.subtitle')}
        actions={
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            {t('delivery.refresh')}
          </Button>
        }
      />

      {error ? (
        isAuthRequiredError(error) ? (
          <LoginRequiredAlert style={{ marginBottom: 12 }} onRetry={handleRefresh} />
        ) : (
          <Alert type="error" showIcon style={{ marginBottom: 12 }} message={t('delivery.loadFailed')} />
        )
      ) : null}

      <Card>
        {isLoadingGateways && !gateways ? (
          <Spin />
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'gateways', label: t('delivery.tabGateways'), children: renderGateways() },
              { key: 'history', label: t('delivery.tabHistory'), children: renderHistory() },
            ]}
          />
        )}
      </Card>

      <PairingDialog gateway={pairingGateway} onClose={() => setPairingGateway(null)} />
    </div>
  );
}

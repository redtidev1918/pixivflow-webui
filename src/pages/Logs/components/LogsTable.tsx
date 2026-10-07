import { Table, Tag, Button, Tooltip, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../utils/dateUtils';
import { message } from 'antd';

const { Text } = Typography;

export interface LogEntry {
  line: string;
  level?: string;
  timestamp?: string;
  originalLine: string;
}

interface LogsTableProps {
  entries: LogEntry[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  searchText: string;
  onPageChange: (page: number) => void;
  onAutoScrollDisable: () => void;
}

export function LogsTable({
  entries,
  loading,
  page,
  pageSize,
  total,
  searchText,
  onPageChange,
  onAutoScrollDisable,
}: LogsTableProps) {
  const { t } = useTranslation();

  const getLevelColor = (level?: string): string => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return 'red';
      case 'WARN':
        return 'orange';
      case 'INFO':
        return 'blue';
      case 'DEBUG':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatLogLine = (line: string): string => {
    return line
      .replace(/\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\]/g, '')
      .replace(/\[(DEBUG|INFO|WARN|ERROR|FATAL)\]/gi, '')
      .trim();
  };

  const highlightText = (text: string, search: string): React.ReactNode => {
    if (!search || !text) return text;
    
    const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#ffd666', padding: '0 2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return '-';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return t('logs.justNow');
      if (diffMins < 60) return `${diffMins} ${t('logs.minutesAgo')}`;
      if (diffHours < 24) return `${diffHours} ${t('logs.hoursAgo')}`;
      if (diffDays < 7) return `${diffDays} ${t('logs.daysAgo')}`;
      
      return formatDate(date);
    } catch {
      return timestamp;
    }
  };

  const copyLogLine = (line: string) => {
    navigator.clipboard.writeText(line).then(() => {
      message.success(t('logs.copied'));
    }).catch(() => {
      message.error(t('logs.copyFailed'));
    });
  };

  const columns = [
    {
      title: t('logs.level'),
      dataIndex: 'level',
      key: 'level',
      width: 90,
      fixed: 'left' as const,
      render: (level: string | undefined) => {
        if (!level) return <Tag>-</Tag>;
        return <Tag color={getLevelColor(level)}>{level}</Tag>;
      },
    },
    {
      title: t('logs.time'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string | undefined) => {
        if (!timestamp) return <Text type="secondary">-</Text>;
        const formatted = formatTimestamp(timestamp);
        const fullTime = timestamp ? formatDate(timestamp) : '';
        return (
          <Tooltip title={fullTime}>
            <Text type="secondary" style={{ fontSize: '12px' }}>{formatted}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: t('logs.content'),
      dataIndex: 'line',
      key: 'line',
      ellipsis: { showTitle: false },
      render: (line: string, record: LogEntry) => {
        const formatted = formatLogLine(line);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ 
              fontSize: '12px', 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-all',
              flex: 1,
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
            }}>
              {searchText ? highlightText(formatted, searchText) : formatted}
            </code>
            <Tooltip title={t('logs.copyLine')}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyLogLine(record.originalLine)}
                style={{ flexShrink: 0 }}
              />
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={entries.map((entry, index) => ({
          ...entry,
          key: `${page}-${index}-${entry.timestamp || index}`,
        }))}
        loading={loading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: false,
          showTotal: (total, range) => 
            t('logs.displaying', { start: range[0], end: range[1], total }),
          onChange: (newPage) => {
            onPageChange(newPage);
            onAutoScrollDisable();
          },
          showQuickJumper: true,
        }}
        scroll={{ y: 'var(--pf-logs-table-height)', x: 'max-content' }}
        size="small"
        rowClassName={(record) => {
          if (record.level === 'ERROR' || record.level === 'FATAL') {
            return 'log-row-error';
          }
          if (record.level === 'WARN') {
            return 'log-row-warn';
          }
          return '';
        }}
      />
      <style>{`
        .log-row-error {
          background-color: #fff1f0 !important;
        }
        .log-row-error:hover {
          background-color: #ffe7e5 !important;
        }
        .log-row-warn {
          background-color: #fffbe6 !important;
        }
        .log-row-warn:hover {
          background-color: #fff7d1 !important;
        }
        .ant-table-tbody > tr > td {
          padding: 8px 12px !important;
        }
      `}</style>
    </>
  );
}

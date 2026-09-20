import { useState, useRef } from 'react';
import { Row, Col, Typography, Card } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLogs } from '../../hooks/useLogs';
import { useLogsRealtime, useLogsAutoScroll } from './hooks/useLogsRealtime';
import {
  LogsStatistics,
  LogsControls,
  LogsFilters,
  LogsTable,
  type LogEntry,
} from './components';
import { message } from 'antd';

const { Title } = Typography;

// Parse log line to extract level and timestamp
const parseLogLine = (line: string): LogEntry => {
  const levelMatch = line.match(/\[(DEBUG|INFO|WARN|ERROR|FATAL)\]/i);
  const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]/);
  
  return {
    line,
    originalLine: line,
    level: levelMatch?.[1] ? levelMatch[1].toUpperCase() : undefined,
    timestamp: timestampMatch?.[1] || undefined,
  };
};

export default function Logs() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [levelFilter, setLevelFilter] = useState<string | undefined>();
  const [searchText, setSearchText] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  const { logs, total, isLoading, refetch, clear, isClearing } = useLogs({
    page,
    limit: pageSize,
    level: levelFilter,
    search: searchText || undefined,
  });

  // Use real-time logs hook
  useLogsRealtime(autoRefresh);

  // Parse log entries
  const logEntries: LogEntry[] = logs.map((line: string) => parseLogLine(line));

  // Use auto-scroll hook
  useLogsAutoScroll(autoRefresh, autoScroll, logEntries, tableRef);

  // Calculate statistics
  const stats = {
    total: total,
    error: logEntries.filter(e => e.level === 'ERROR' || e.level === 'FATAL').length,
    warn: logEntries.filter(e => e.level === 'WARN').length,
    info: logEntries.filter(e => e.level === 'INFO').length,
  };

  const handleExport = () => {
    const content = logEntries.map(entry => entry.originalLine).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success(t('logs.logsExported'));
  };

  const handleScrollToBottom = () => {
    const tableBody = tableRef.current?.querySelector('.ant-table-body');
    if (tableBody) {
      tableBody.scrollTop = tableBody.scrollHeight;
      message.success(t('logs.scrolledToBottom'));
    }
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setAutoScroll(false);
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            {t('logs.title')}
          </Title>
        </Col>
        <Col>
          <LogsControls
            autoRefresh={autoRefresh}
            autoScroll={autoScroll}
            isLoading={isLoading}
            isClearing={isClearing}
            hasLogs={logEntries.length > 0}
            onAutoRefreshChange={setAutoRefresh}
            onAutoScrollChange={setAutoScroll}
            onRefresh={() => refetch()}
            onScrollToBottom={handleScrollToBottom}
            onExport={handleExport}
            onClear={() => clear()}
          />
        </Col>
      </Row>

      <LogsStatistics
        total={stats.total}
        error={stats.error}
        warn={stats.warn}
        info={stats.info}
      />

      <Card>
        <LogsFilters
          searchText={searchText}
          levelFilter={levelFilter}
          pageSize={pageSize}
          onSearchChange={(value) => {
            setSearchText(value);
            setPage(1);
          }}
          onSearch={handleSearch}
          onLevelFilterChange={(value) => {
            setLevelFilter(value);
            setPage(1);
          }}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />

        <div ref={tableRef}>
          <LogsTable
            entries={logEntries}
            loading={isLoading}
            page={page}
            pageSize={pageSize}
            total={total}
            searchText={searchText}
            onPageChange={handlePageChange}
            onAutoScrollDisable={() => setAutoScroll(false)}
          />
        </div>
      </Card>
    </div>
  );
}

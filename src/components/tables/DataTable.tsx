import { useMemo } from 'react';
import { Table, TableColumnsType } from 'antd';
import { DataTableProps } from './types';
import { EmptyState } from '../common/EmptyState';
import i18n from '../../i18n/config';

/**
 * Universal data table component with built-in support for
 * sorting, filtering, pagination, and loading states.
 */
export function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({
  data,
  columns,
  loading = false,
  pagination = true,
  rowKey = 'id',
  rowSelection,
  emptyText,
  emptyComponent,
  scroll,
  size = 'middle',
  bordered = false,
  style,
  className,
  ...tableProps
}: DataTableProps<T>) {
  // Convert rowKey to function if it's a string
  const getRowKey = useMemo(() => {
    if (typeof rowKey === 'function') {
      return rowKey;
    }
    return (record: T) => record[rowKey]?.toString() || '';
  }, [rowKey]);

  // Process columns to handle sortable/filterable
  const processedColumns = useMemo(() => {
    return columns.map((col) => {
      const processedCol = { ...col } as TableColumnsType<T>[number];
      
      // Handle sortable columns
      if (col.sortable && !col.sorter) {
        processedCol.sorter = (a: T, b: T) => {
          const dataIndex = col.dataIndex;
          const key = Array.isArray(dataIndex) ? dataIndex[0] : (typeof dataIndex === 'string' ? dataIndex : undefined);
          const aVal = key ? (a as Record<string, unknown>)[key] : undefined;
          const bVal = key ? (b as Record<string, unknown>)[key] : undefined;
          
          if (aVal === bVal) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal);
          }
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return aVal - bVal;
          }
          
          return String(aVal).localeCompare(String(bVal));
        };
      }
      
      // Handle filterable columns
      if (col.filterable && col.filterOptions) {
        processedCol.filters = col.filterOptions.map((opt) => ({
          text: opt.label,
          value: opt.value,
        }));
        processedCol.onFilter = col.onFilter 
          ? (value: boolean | React.Key, record: T) => {
              // Convert value to our expected type
              const filterValue = typeof value === 'bigint' ? Number(value) : value;
              return col.onFilter!(filterValue as string | number | boolean, record);
            }
          : ((value: boolean | React.Key, record: T) => {
              const dataIndex = col.dataIndex;
              const key = Array.isArray(dataIndex) ? dataIndex[0] : (typeof dataIndex === 'string' ? dataIndex : undefined);
              const recordValue = key ? (record as Record<string, unknown>)[key] : undefined;
              const filterValue = typeof value === 'bigint' ? Number(value) : value;
              return recordValue === filterValue;
            });
      }
      
      return processedCol;
    });
  }, [columns]);

  // Handle pagination configuration
  const paginationConfig = useMemo(() => {
    if (pagination === false) {
      return false;
    }
    
    if (typeof pagination === 'object') {
      return {
        showSizeChanger: true,
        showTotal: (total: number, range: [number, number]) =>
          `${range[0]}-${range[1]} of ${total} items`,
        pageSizeOptions: ['10', '20', '50', '100'],
        ...pagination,
      };
    }
    
    return {
      showSizeChanger: true,
      showTotal: (total: number, range: [number, number]) =>
        `${range[0]}-${range[1]} of ${total} items`,
      pageSizeOptions: ['10', '20', '50', '100'],
    };
  }, [pagination]);

  // Render empty state
  const renderEmpty = () => {
    if (emptyComponent) {
      return emptyComponent;
    }
    
    return (
      <EmptyState
        description={emptyText || i18n.t('common.noData')}
      />
    );
  };

  return (
    <Table<T>
      dataSource={data}
      columns={processedColumns}
      loading={loading}
      pagination={paginationConfig}
      rowKey={getRowKey}
      rowSelection={rowSelection}
      scroll={scroll}
      size={size}
      bordered={bordered}
      style={style}
      className={className}
      locale={{
        emptyText: renderEmpty(),
      }}
      {...tableProps}
    />
  );
}

export default DataTable;


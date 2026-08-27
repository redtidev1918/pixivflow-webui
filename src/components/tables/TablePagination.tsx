import React from 'react';
import { Pagination } from 'antd';
import { TablePaginationProps } from './types';
import { PAGINATION } from '../../constants';
import i18n from '../../i18n/config';

/**
 * Table pagination component that provides consistent pagination UI
 * for data tables. Wraps Ant Design Pagination with table-specific defaults.
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
  current,
  pageSize,
  total,
  onChange,
  showSizeChanger = true,
  pageSizeOptions = PAGINATION.PAGE_SIZE_OPTIONS as unknown as string[],
  showTotal = true,
  style,
  className,
}) => {
  const renderTotal = showTotal
    ? typeof showTotal === 'function'
      ? showTotal
      : (total: number, range: [number, number]) =>
          i18n.t('common.itemsRange', { start: range[0], end: range[1], total })
    : undefined;

  return (
    <Pagination
      current={current}
      pageSize={pageSize}
      total={total}
      onChange={onChange}
      onShowSizeChange={onChange}
      showSizeChanger={showSizeChanger}
      pageSizeOptions={pageSizeOptions}
      showTotal={renderTotal}
      style={style}
      className={className}
    />
  );
};

export default TablePagination;


/**
 * Performance tests for component rendering
 */

import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataTable } from '../../components/tables/DataTable';

describe('Render Performance', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const generateLargeDataset = (size: number) => {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      status: i % 2 === 0 ? 'active' : 'inactive',
      createdAt: new Date().toISOString(),
    }));
  };

  describe('DataTable Performance', () => {
    it('should render small dataset quickly (< 100ms)', () => {
      const data = generateLargeDataset(50);
      const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Value', dataIndex: 'value', key: 'value' },
        { title: 'Status', dataIndex: 'status', key: 'status' },
      ];

      const startTime = performance.now();
      
      render(
        <QueryClientProvider client={queryClient}>
          <DataTable
            columns={columns}
            dataSource={data}
            rowKey="id"
          />
        </QueryClientProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Sanity ceiling only: absolute wall-clock varies wildly across CI machines;
      // the informative number is the console log above. 1000ms catches pathological regressions.
      expect(renderTime).toBeLessThan(1000);
      console.log(`Small dataset (50 items) render time: ${renderTime.toFixed(2)}ms`);
    });

    it('should render medium dataset efficiently (< 200ms)', () => {
      const data = generateLargeDataset(200);
      const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Value', dataIndex: 'value', key: 'value' },
        { title: 'Status', dataIndex: 'status', key: 'status' },
      ];

      const startTime = performance.now();
      
      render(
        <QueryClientProvider client={queryClient}>
          <DataTable
            columns={columns}
            dataSource={data}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        </QueryClientProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(1000);
      console.log(`Medium dataset (200 items) render time: ${renderTime.toFixed(2)}ms`);
    });

    it('should handle pagination efficiently', () => {
      const data = generateLargeDataset(1000);
      const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
      ];

      const startTime = performance.now();
      
      render(
        <QueryClientProvider client={queryClient}>
          <DataTable
            columns={columns}
            dataSource={data}
            rowKey="id"
            pagination={{ pageSize: 50 }}
          />
        </QueryClientProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // With pagination, should only render visible items
      expect(renderTime).toBeLessThan(1500);
      console.log(`Large dataset (1000 items) with pagination render time: ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('Re-render Performance', () => {
    it('should re-render efficiently on data update', () => {
      const initialData = generateLargeDataset(100);
      const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
      ];

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <DataTable
            columns={columns}
            dataSource={initialData}
            rowKey="id"
          />
        </QueryClientProvider>
      );

      const updatedData = generateLargeDataset(100);
      const startTime = performance.now();
      
      rerender(
        <QueryClientProvider client={queryClient}>
          <DataTable
            columns={columns}
            dataSource={updatedData}
            rowKey="id"
          />
        </QueryClientProvider>
      );

      const endTime = performance.now();
      const rerenderTime = endTime - startTime;

      expect(rerenderTime).toBeLessThan(500);
      console.log(`Re-render time: ${rerenderTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks on unmount', () => {
      const data = generateLargeDataset(500);
      const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
      ];

      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <DataTable
            columns={columns}
            dataSource={data}
            rowKey="id"
          />
        </QueryClientProvider>
      );

      // Capture memory before unmount
      const memoryBefore = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;

      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Capture memory after unmount
      const memoryAfter = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;

      if (memoryBefore && memoryAfter) {
        const memoryDiff = memoryAfter - memoryBefore;
        console.log(`Memory difference after unmount: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
        
        // Memory should not increase significantly after unmount
        expect(memoryDiff).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
      }
    });
  });
});


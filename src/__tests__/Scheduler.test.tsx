/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import Scheduler from '../pages/Scheduler';

jest.mock('../hooks/useScheduler', () => ({
  useSchedulerSlots: jest.fn(),
}));

jest.mock('../hooks/useSchedulerExecutions', () => ({
  useSchedulerExecutions: jest.fn(),
}));

import { useSchedulerSlots } from '../hooks/useScheduler';
import { useSchedulerExecutions } from '../hooks/useSchedulerExecutions';

const mockSlots = [
  {
    slotId: 'bot1-daily@2026-09-18T10:00',
    scheduleId: 'bot1-daily',
    status: 'failed',
    occurrenceAt: 1779112800000,
    occurrenceDate: '2026-09-18',
    occurrenceLabel: '10:00',
    timezone: 'Asia/Shanghai',
    triggerSource: 'cron',
    targets: [
      {
        targetId: 'bot1-illust',
        workType: 'illustration',
        status: 'failed',
        workId: '12345',
        terminalReasonCode: 'no_candidate',
        reason: 'no suitable work',
      },
    ],
  },
];

describe('Scheduler page', () => {
  beforeEach(() => {
    (useSchedulerExecutions as jest.Mock).mockReturnValue({
      executions: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it.each([
    [{ enabled: false, configuredCount: 0 }, 'scheduler.noSchedule'],
    [{ enabled: true, configuredCount: 2 }, 'scheduler.noExecutionYet'],
    [{ enabled: false, configuredCount: 2 }, 'scheduler.scheduleDisabled'],
    [undefined, 'scheduler.noRecords'],
  ])('renders a healthy empty state for %j', (scheduler, expected) => {
    (useSchedulerSlots as jest.Mock).mockReturnValue({
      slots: [],
      scheduler,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<Scheduler />);
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText('scheduler.loadFailed')).not.toBeInTheDocument();
  });

  it('does not show an empty state while loading or after an API failure', () => {
    (useSchedulerSlots as jest.Mock).mockReturnValue({
      slots: [],
      scheduler: { configuredCount: 0 },
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });
    const { rerender } = render(<Scheduler />);
    expect(screen.queryByText('scheduler.noSchedule')).not.toBeInTheDocument();
    (useSchedulerSlots as jest.Mock).mockReturnValue({
      slots: [],
      scheduler: { configuredCount: 0 },
      isLoading: false,
      error: new Error('database failed'),
      refetch: jest.fn(),
    });
    rerender(<Scheduler />);
    expect(screen.queryByText('scheduler.noSchedule')).not.toBeInTheDocument();
    expect(screen.getByText('scheduler.loadFailed')).toBeInTheDocument();
  });
  it('renders recent slots and target reasons', async () => {
    (useSchedulerSlots as jest.Mock).mockReturnValue({
      slots: mockSlots,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    (useSchedulerExecutions as jest.Mock).mockReturnValue({
      executions: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<Scheduler />);

    expect(await screen.findByText('bot1-daily@2026-09-18T10:00')).toBeInTheDocument();
    expect(screen.getByText('bot1-daily')).toBeInTheDocument();
  });

  it('renders executions tab with candidate funnel and relaxed retry', async () => {
    (useSchedulerSlots as jest.Mock).mockReturnValue({
      slots: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (useSchedulerExecutions as jest.Mock).mockReturnValue({
      executions: [
        {
          executionId: 's:bot1-illust',
          slotId: 'bot1-daily@2026-09-18T10:00',
          scheduleId: 'bot1-daily',
          targetId: 'bot1-illust',
          status: 'no_candidate',
          terminalReasonCode: 'duplicate_exhausted',
          candidateReport: { fetched: 12, rejected: 11, selected: 0 },
          recovery: { retryable: false, relaxedRetryAllowed: true, retryableReason: 'exhausted' },
          operatorHint: '正常完成的无新内容结果',
        },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<Scheduler />);
    fireEvent.click(await screen.findByText('scheduler.executions'));
    expect(await screen.findByText('scheduler.executionId')).toBeInTheDocument();
    expect(screen.getByText('scheduler.relaxedRecovery')).toBeInTheDocument();
    expect(screen.getByText('scheduler.operatorHint')).toBeInTheDocument();
  });

  it('shows error alert on failure', async () => {
    (useSchedulerSlots as jest.Mock).mockReturnValue({
      slots: [],
      isLoading: false,
      error: new Error('boo'),
      refetch: jest.fn(),
    });

    render(<Scheduler />);
    await waitFor(() => {
      expect(screen.getByText('scheduler.loadFailed')).toBeInTheDocument();
    });
  });
});

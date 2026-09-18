/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Scheduler from '../pages/Scheduler';

jest.mock('../hooks/useScheduler', () => ({
  useSchedulerSlots: jest.fn(),
}));

import { useSchedulerSlots } from '../hooks/useScheduler';

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
  it('renders recent slots and target reasons', async () => {
    (useSchedulerSlots as jest.Mock).mockReturnValue({
      slots: mockSlots,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<Scheduler />);

    expect(await screen.findByText('bot1-daily@2026-09-18T10:00')).toBeInTheDocument();
    expect(screen.getByText('bot1-daily')).toBeInTheDocument();
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

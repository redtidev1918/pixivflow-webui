/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevealPathButton } from '../../../components/common/RevealPathButton';
import { usePathActions } from '../../../hooks/usePathActions';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

// The button reports through the shared hook, so assert the action it asks for
// rather than re-testing outcome wording (that lives in usePathActions).
jest.mock('../../../hooks/usePathActions', () => ({
  usePathActions: jest.fn(),
}));

const usePathActionsMock = usePathActions as jest.Mock;
const reveal = jest.fn();

describe('RevealPathButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reveal.mockResolvedValue({ outcome: 'revealed', path: '/downloads/illustrations' });
    usePathActionsMock.mockReturnValue({ reveal, copy: jest.fn() });
  });

  it('labels the action as opening a folder', () => {
    render(<RevealPathButton />);

    expect(screen.getByRole('button')).toHaveTextContent('files.openFolder');
  });

  it('disables itself with a reason when there is nothing to reveal', () => {
    render(<RevealPathButton disabled disabledReason="目录还没有创建" />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', '目录还没有创建');
    fireEvent.click(button);
    expect(reveal).not.toHaveBeenCalled();
  });

  it('passes the file path and its download type to the reveal helper', async () => {
    reveal.mockResolvedValue({ outcome: 'revealed', path: '/downloads/illustrations' });
    render(<RevealPathButton filePath="/downloads/illustrations/a.jpg" fileType="illustration" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(reveal).toHaveBeenCalledWith({
        filePath: '/downloads/illustrations/a.jpg',
        type: 'illustration',
      })
    );
  });

  it('reveals the download directory itself when no file is given', async () => {
    reveal.mockResolvedValue({ outcome: 'revealed', path: '/downloads/illustrations' });
    render(<RevealPathButton />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(reveal).toHaveBeenCalledWith({ filePath: undefined, type: undefined })
    );
  });

  it('reports a folder that does not exist yet without calling it a failure', async () => {
    reveal.mockResolvedValue({ outcome: 'copied', path: '/downloads/neww', reason: 'missing' });
    render(<RevealPathButton fileType="novel" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(reveal).toHaveBeenCalledTimes(1));
    // The button returns to its resting state instead of throwing.
    await waitFor(() => expect(screen.getByRole('button')).not.toHaveClass('ant-btn-loading'));
  });

  it('accepts a label override', () => {
    render(<RevealPathButton label="打开下载文件夹" />);

    expect(screen.getByRole('button')).toHaveTextContent('打开下载文件夹');
    expect(screen.getByRole('button')).toHaveAccessibleName('打开下载文件夹');
  });
});

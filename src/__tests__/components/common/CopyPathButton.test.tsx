/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyPathButton } from '../../../components/common/CopyPathButton';
import { usePathActions } from '../../../hooks/usePathActions';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('../../../hooks/usePathActions', () => ({
  usePathActions: jest.fn(),
}));

const usePathActionsMock = usePathActions as jest.Mock;
const copy = jest.fn();

describe('CopyPathButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    copy.mockResolvedValue({ outcome: 'copied', path: '/downloads/illustrations/a.jpg' });
    usePathActionsMock.mockReturnValue({ reveal: jest.fn(), copy });
  });

  it('is its own action, not a fallback hidden inside "open folder"', () => {
    render(<CopyPathButton />);

    expect(screen.getByRole('button')).toHaveTextContent('reveal.copyPath');
  });

  it('passes the path and download type to the copy action', async () => {
    render(<CopyPathButton filePath="a.jpg" fileType="novel" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(copy).toHaveBeenCalledWith({ filePath: 'a.jpg', type: 'novel' }));
  });

  it('copies the download directory itself when no file is given', async () => {
    render(<CopyPathButton />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(copy).toHaveBeenCalledWith({ filePath: undefined, type: undefined }));
  });

  it('disables itself with a reason when there is no path yet', () => {
    render(<CopyPathButton disabled disabledReason="这一项还没有可用的路径" />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', '这一项还没有可用的路径');
    fireEvent.click(button);
    expect(copy).not.toHaveBeenCalled();
  });

  it('accepts a label override', () => {
    render(<CopyPathButton label="复制下载路径" />);

    expect(screen.getByRole('button')).toHaveTextContent('复制下载路径');
  });
});

/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevealPathButton } from '../../../components/common/RevealPathButton';
import { revealInFileManager } from '../../../utils/revealPath';

jest.mock('../../../utils/revealPath', () => ({
  revealInFileManager: jest.fn(),
}));

const reveal = revealInFileManager as jest.Mock;

describe('RevealPathButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('labels the action as opening a folder', () => {
    render(<RevealPathButton />);

    expect(screen.getByRole('button')).toHaveTextContent('files.openFolder');
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

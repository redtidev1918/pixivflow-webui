/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OpenDirectoryButton } from '../../../components/common/OpenDirectoryButton';
import { revealInFileManager } from '../../../utils/revealPath';

jest.mock('../../../utils/revealPath', () => ({
  revealInFileManager: jest.fn(),
}));

const reveal = revealInFileManager as jest.Mock;

describe('OpenDirectoryButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('labels the action with the folder it will open', () => {
    render(<OpenDirectoryButton directoryType="illustration" />);

    expect(screen.getByRole('button')).toHaveTextContent('files.openDirectory');
  });

  it('passes the directory type and file path to the reveal helper', async () => {
    reveal.mockResolvedValue({ outcome: 'opened', path: '/downloads/illustrations' });
    render(<OpenDirectoryButton directoryType="illustration" filePath="/downloads/illustrations/a.jpg" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(reveal).toHaveBeenCalledWith({
        filePath: '/downloads/illustrations/a.jpg',
        type: 'illustration',
      })
    );
  });

  it('reports a folder that does not exist yet without calling it a failure', async () => {
    reveal.mockResolvedValue({ outcome: 'missing' });
    render(<OpenDirectoryButton directoryType="novel" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(reveal).toHaveBeenCalledTimes(1));
    // The button returns to its resting state instead of throwing.
    await waitFor(() => expect(screen.getByRole('button')).not.toHaveClass('ant-btn-loading'));
  });

  it('accepts a label override', () => {
    render(<OpenDirectoryButton directoryType="novel" label="打开下载目录" />);

    expect(screen.getByRole('button')).toHaveTextContent('打开下载目录');
    expect(screen.getByRole('button')).toHaveAccessibleName('打开下载目录');
  });
});

/**
 * Tests for configService
 */

import { configService } from '../../services/configService';
import { api, ConfigData } from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  api: {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    validateConfig: jest.fn(),
    backupConfig: jest.fn(),
    restoreConfig: jest.fn(),
    getConfigHistory: jest.fn(),
    saveConfigHistory: jest.fn(),
    applyConfigHistory: jest.fn(),
    deleteConfigHistory: jest.fn(),
    listConfigFiles: jest.fn(),
    switchConfigFile: jest.fn(),
    importConfigFile: jest.fn(),
    deleteConfigFile: jest.fn(),
    getConfigFileContent: jest.fn(),
    updateConfigFileContent: jest.fn(),
    diagnoseConfig: jest.fn(),
    repairConfig: jest.fn(),
  },
}));

describe('configService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockConfig: ConfigData = {
    download: {
      path: '/downloads',
      threads: 4,
      timeout: 30,
      retries: 3,
    },
    proxy: {
      enabled: false,
    },
    targets: [],
  };

  describe('getConfig', () => {
    it('should get current configuration', async () => {
      (api.getConfig as jest.Mock).mockResolvedValue({
        data: { data: mockConfig },
      });

      const result = await configService.getConfig();

      expect(api.getConfig).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockConfig);
    });

    it('should handle error when getting config', async () => {
      (api.getConfig as jest.Mock).mockRejectedValue(
        new Error('Failed to load config')
      );

      await expect(configService.getConfig()).rejects.toThrow('Failed to load config');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      const updates = { download: { threads: 8 } };
      const updatedConfig = { ...mockConfig, ...updates };

      (api.updateConfig as jest.Mock).mockResolvedValue({
        data: { data: updatedConfig },
      });

      const result = await configService.updateConfig(updates);

      expect(api.updateConfig).toHaveBeenCalledWith(updates);
      expect(result).toEqual(updatedConfig);
    });

    it('should handle update error', async () => {
      (api.updateConfig as jest.Mock).mockRejectedValue(
        new Error('Invalid configuration')
      );

      await expect(
        configService.updateConfig({ download: { threads: -1 } })
      ).rejects.toThrow('Invalid configuration');
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', async () => {
      const validationResult = { valid: true };

      (api.validateConfig as jest.Mock).mockResolvedValue({
        data: { data: validationResult },
      });

      const result = await configService.validateConfig(mockConfig);

      expect(api.validateConfig).toHaveBeenCalledWith(mockConfig);
      expect(result).toEqual(validationResult);
    });

    it('should validate invalid configuration', async () => {
      const validationResult = {
        valid: false,
        errors: ['Invalid thread count', 'Invalid timeout'],
      };

      (api.validateConfig as jest.Mock).mockResolvedValue({
        data: { data: validationResult },
      });

      const result = await configService.validateConfig({ download: { threads: -1 } });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('backupConfig', () => {
    it('should backup current configuration', async () => {
      const backupResult = { backupPath: '/backups/config-2024-01-01.json' };

      (api.backupConfig as jest.Mock).mockResolvedValue({
        data: { data: backupResult },
      });

      const result = await configService.backupConfig();

      expect(api.backupConfig).toHaveBeenCalledTimes(1);
      expect(result).toEqual(backupResult);
    });
  });

  describe('restoreConfig', () => {
    it('should restore configuration from backup', async () => {
      const backupPath = '/backups/config-2024-01-01.json';

      (api.restoreConfig as jest.Mock).mockResolvedValue({
        data: { data: mockConfig },
      });

      const result = await configService.restoreConfig(backupPath);

      expect(api.restoreConfig).toHaveBeenCalledWith(backupPath);
      expect(result).toEqual(mockConfig);
    });

    it('should handle restore error', async () => {
      (api.restoreConfig as jest.Mock).mockRejectedValue(
        new Error('Backup file not found')
      );

      await expect(
        configService.restoreConfig('/invalid/path')
      ).rejects.toThrow('Backup file not found');
    });
  });

  describe('getConfigHistory', () => {
    it('should get configuration history', async () => {
      const history = [
        {
          id: 1,
          name: 'Config 1',
          description: 'Test config',
          config: mockConfig,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_active: 1,
        },
      ];

      (api.getConfigHistory as jest.Mock).mockResolvedValue({
        data: { data: history },
      });

      const result = await configService.getConfigHistory();

      expect(api.getConfigHistory).toHaveBeenCalledTimes(1);
      expect(result).toEqual(history);
    });
  });

  describe('saveConfigHistory', () => {
    it('should save configuration to history', async () => {
      const name = 'Test Config';
      const description = 'Test description';

      (api.saveConfigHistory as jest.Mock).mockResolvedValue({
        data: { data: { id: 1 } },
      });

      const result = await configService.saveConfigHistory(name, mockConfig, description);

      expect(api.saveConfigHistory).toHaveBeenCalledWith(name, mockConfig, description);
      expect(result.id).toBe(1);
      expect(result.name).toBe(name);
      expect(result.description).toBe(description);
    });

    it('should save configuration without description', async () => {
      (api.saveConfigHistory as jest.Mock).mockResolvedValue({
        data: { data: { id: 2 } },
      });

      const result = await configService.saveConfigHistory('Config 2', mockConfig);

      expect(result.description).toBeNull();
    });
  });

  describe('applyConfigHistory', () => {
    it('should apply configuration history entry', async () => {
      (api.applyConfigHistory as jest.Mock).mockResolvedValue({});

      await configService.applyConfigHistory(1);

      expect(api.applyConfigHistory).toHaveBeenCalledWith(1);
    });
  });

  describe('deleteConfigHistory', () => {
    it('should delete configuration history entry', async () => {
      (api.deleteConfigHistory as jest.Mock).mockResolvedValue({});

      await configService.deleteConfigHistory(1);

      expect(api.deleteConfigHistory).toHaveBeenCalledWith(1);
    });
  });

  describe('listConfigFiles', () => {
    it('should list all configuration files', async () => {
      const files = [
        {
          filename: 'config.json',
          path: '/config/config.json',
          pathRelative: 'config.json',
          modifiedTime: '2024-01-01T00:00:00Z',
          size: 1024,
          isActive: true,
        },
      ];

      (api.listConfigFiles as jest.Mock).mockResolvedValue({
        data: { data: files },
      });

      const result = await configService.listConfigFiles();

      expect(api.listConfigFiles).toHaveBeenCalledTimes(1);
      expect(result).toEqual(files);
    });

    it('normalises a non-array envelope to an empty list', async () => {
      (api.listConfigFiles as jest.Mock).mockResolvedValue({ data: { data: null } });
      await expect(configService.listConfigFiles()).resolves.toEqual([]);

      (api.listConfigFiles as jest.Mock).mockResolvedValue({ data: {} });
      await expect(configService.listConfigFiles()).resolves.toEqual([]);

      (api.listConfigFiles as jest.Mock).mockResolvedValue({});
      await expect(configService.listConfigFiles()).resolves.toEqual([]);
    });
  });

  describe('switchConfigFile', () => {
    it('should switch to different configuration file', async () => {
      const path = '/config/config-dev.json';

      (api.switchConfigFile as jest.Mock).mockResolvedValue({});

      await configService.switchConfigFile(path);

      expect(api.switchConfigFile).toHaveBeenCalledWith(path);
    });
  });

  describe('importConfigFile', () => {
    it('should import configuration file', async () => {
      const importResult = {
        path: '/config/imported.json',
        pathRelative: 'imported.json',
        filename: 'imported.json',
      };

      (api.importConfigFile as jest.Mock).mockResolvedValue({
        data: { data: importResult },
      });

      const result = await configService.importConfigFile(mockConfig, 'imported.json');

      expect(api.importConfigFile).toHaveBeenCalledWith(mockConfig, 'imported.json');
      expect(result.filename).toBe('imported.json');
    });

    it('should import configuration without custom name', async () => {
      const importResult = {
        path: '/config/config.json',
        pathRelative: 'config.json',
        filename: 'config.json',
      };

      (api.importConfigFile as jest.Mock).mockResolvedValue({
        data: { data: importResult },
      });

      await configService.importConfigFile(mockConfig);

      expect(api.importConfigFile).toHaveBeenCalledWith(mockConfig, undefined);
    });
  });

  describe('deleteConfigFile', () => {
    it('should delete configuration file', async () => {
      (api.deleteConfigFile as jest.Mock).mockResolvedValue({});

      await configService.deleteConfigFile('old-config.json');

      expect(api.deleteConfigFile).toHaveBeenCalledWith('old-config.json');
    });
  });

  describe('getConfigFileContent', () => {
    it('should get configuration file content', async () => {
      const content = {
        content: JSON.stringify(mockConfig),
        filename: 'config.json',
      };

      (api.getConfigFileContent as jest.Mock).mockResolvedValue({
        data: { data: content },
      });

      const result = await configService.getConfigFileContent('config.json');

      expect(api.getConfigFileContent).toHaveBeenCalledWith('config.json');
      expect(result).toEqual(content);
    });
  });

  describe('updateConfigFileContent', () => {
    it('should update configuration file content', async () => {
      const content = JSON.stringify(mockConfig);

      (api.updateConfigFileContent as jest.Mock).mockResolvedValue({});

      await configService.updateConfigFileContent('config.json', content);

      expect(api.updateConfigFileContent).toHaveBeenCalledWith('config.json', content);
    });
  });

  describe('diagnoseConfig', () => {
    it('should diagnose configuration', async () => {
      const diagnoseResult = {
        valid: true,
        issues: [],
        warnings: [],
      };

      (api.diagnoseConfig as jest.Mock).mockResolvedValue({
        data: { data: diagnoseResult },
      });

      const result = await configService.diagnoseConfig();

      expect(api.diagnoseConfig).toHaveBeenCalledTimes(1);
      expect(result).toEqual(diagnoseResult);
    });

    it('should diagnose configuration with issues', async () => {
      const diagnoseResult = {
        valid: false,
        issues: ['Missing required field'],
        warnings: ['Deprecated option used'],
      };

      (api.diagnoseConfig as jest.Mock).mockResolvedValue({
        data: { data: diagnoseResult },
      });

      const result = await configService.diagnoseConfig();

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('repairConfig', () => {
    it('should repair configuration with backup', async () => {
      const repairResult = {
        success: true,
        backupPath: '/backups/config-backup.json',
        repairedIssues: ['Fixed missing field'],
      };

      (api.repairConfig as jest.Mock).mockResolvedValue({
        data: { data: repairResult },
      });

      const result = await configService.repairConfig(true);

      expect(api.repairConfig).toHaveBeenCalledWith(true);
      expect(result).toEqual(repairResult);
    });

    it('should repair configuration without backup', async () => {
      const repairResult = {
        success: true,
        repairedIssues: ['Fixed missing field'],
      };

      (api.repairConfig as jest.Mock).mockResolvedValue({
        data: { data: repairResult },
      });

      const result = await configService.repairConfig(false);

      expect(api.repairConfig).toHaveBeenCalledWith(false);
      expect(result.success).toBe(true);
    });
  });
});


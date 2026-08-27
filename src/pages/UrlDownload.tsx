/**
 * URL Download Page
 * 通过输入 Pixiv URL 或作品 ID 直接下载
 */

import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Alert,
  Typography,
  Divider,
  Tag,
  List,
  message,
  Spin,
  Row,
  Col,
} from 'antd';
import {
  LinkOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { downloadApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ParsedUrl {
  url: string;
  workId?: string;
  workType?: 'illustration' | 'novel';
  valid: boolean;
  error?: string;
}

// API 错误响应类型
interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export const UrlDownload: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [singleUrl, setSingleUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [parsedUrls, setParsedUrls] = useState<ParsedUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // 解析单个 URL
  const parseSingleUrl = async () => {
    if (!singleUrl.trim()) {
      message.warning(t('download.urlDownload.enterUrl'));
      return;
    }

    setLoading(true);
    try {
      const response = await downloadApi.parseUrl(singleUrl.trim());
      const data = response.data.data;

      if (data?.success) {
        message.success(t('download.urlDownload.parseSuccess'));
        setParsedUrls([
          {
            url: singleUrl.trim(),
            workId: data.workId,
            workType: data.workType,
            valid: true,
          },
        ]);
        } else {
          // 解析失败，显示详细错误信息
          const rawMessage = (data as any)?.message || t('download.urlDownload.invalidUrl');
          // 确保错误消息是字符串，不是对象
          const errorMessage = typeof rawMessage === 'string' 
            ? rawMessage 
            : (typeof rawMessage === 'object' && rawMessage !== null 
                ? JSON.stringify(rawMessage) 
                : String(rawMessage || t('download.urlDownload.invalidUrl')));
          message.error(errorMessage);
          setParsedUrls([
            {
              url: singleUrl.trim(),
              valid: false,
              error: errorMessage,
            },
          ]);
        }
      } catch (error) {
        // 处理网络错误或其他异常
        const apiError = error as ApiErrorResponse;
        const rawMessage = 
          (apiError.response?.data as any)?.data?.message || 
          apiError.response?.data?.message || 
          apiError.message || 
          t('download.urlDownload.parseError');
        // 确保错误消息是字符串，不是对象
        const errorMessage = typeof rawMessage === 'string' 
          ? rawMessage 
          : (typeof rawMessage === 'object' && rawMessage !== null 
              ? JSON.stringify(rawMessage) 
              : String(rawMessage || t('download.urlDownload.parseError')));
        message.error(errorMessage);
        setParsedUrls([
          {
            url: singleUrl.trim(),
            valid: false,
            error: errorMessage,
          },
        ]);
    } finally {
      setLoading(false);
    }
  };

  // 解析批量 URL
  const parseBatchUrls = async () => {
    const urls = batchUrls
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (urls.length === 0) {
      message.warning(t('download.urlDownload.enterUrls'));
      return;
    }

    setLoading(true);
    const results: ParsedUrl[] = [];

    for (const url of urls) {
      try {
        const response = await downloadApi.parseUrl(url);
        const data = response.data.data;

        if (data?.success) {
          results.push({
            url,
            workId: data.workId,
            workType: data.workType,
            valid: true,
          });
        } else {
          // 解析失败，使用详细错误信息
          const rawMessage = (data as any)?.message || t('download.urlDownload.invalidUrl');
          // 确保错误消息是字符串，不是对象
          const errorMessage = typeof rawMessage === 'string' 
            ? rawMessage 
            : (typeof rawMessage === 'object' && rawMessage !== null 
                ? JSON.stringify(rawMessage) 
                : String(rawMessage || t('download.urlDownload.invalidUrl')));
          results.push({
            url,
            valid: false,
            error: errorMessage,
          });
        }
      } catch (error) {
        // 处理网络错误或其他异常
        const apiError = error as ApiErrorResponse;
        const rawMessage = 
          (apiError.response?.data as any)?.data?.message || 
          apiError.response?.data?.message || 
          apiError.message || 
          t('download.urlDownload.parseError');
        // 确保错误消息是字符串，不是对象
        const errorMessage = typeof rawMessage === 'string' 
          ? rawMessage 
          : (typeof rawMessage === 'object' && rawMessage !== null 
              ? JSON.stringify(rawMessage) 
              : String(rawMessage || t('download.urlDownload.parseError')));
        results.push({
          url,
          valid: false,
          error: errorMessage,
        });
      }
    }

    setParsedUrls(results);
    setLoading(false);

    const validCount = results.filter((r) => r.valid).length;
    if (validCount > 0) {
      message.success(t('download.urlDownload.parsedCount', { count: validCount, total: urls.length }));
    } else {
      message.error(t('download.urlDownload.noValidUrls'));
    }
  };

  // 下载单个 URL
  const downloadSingle = async () => {
    if (!singleUrl.trim()) {
      message.warning(t('download.urlDownload.enterUrl'));
      return;
    }

    setDownloading(true);
    try {
      await downloadApi.downloadFromUrl(singleUrl.trim());

      message.success(t('download.urlDownload.downloadStarted'));
      
      // 跳转到下载页面查看进度
      setTimeout(() => {
        navigate('/download');
      }, 1000);
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      const rawMessage = apiError.response?.data?.message || apiError.message || t('download.urlDownload.downloadError');
      // 确保错误消息是字符串，不是对象
      const errorMessage = typeof rawMessage === 'string' 
        ? rawMessage 
        : (typeof rawMessage === 'object' && rawMessage !== null 
            ? JSON.stringify(rawMessage) 
            : String(rawMessage || t('download.urlDownload.downloadError')));
      message.error(errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  // 下载批量 URL
  const downloadBatch = async () => {
    const validUrls = parsedUrls.filter((p) => p.valid).map((p) => p.url);

    if (validUrls.length === 0) {
      message.warning(t('download.urlDownload.noValidUrls'));
      return;
    }

    setDownloading(true);
    try {
      const response = await downloadApi.downloadFromBatchUrls(validUrls);
      const data = response.data.data;

      message.success(
        t('download.urlDownload.batchDownloadStarted', {
          count: data?.validUrls || validUrls.length,
        })
      );

      // 跳转到下载页面查看进度
      setTimeout(() => {
        navigate('/download');
      }, 1000);
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      const rawMessage = apiError.response?.data?.message || apiError.message || t('download.urlDownload.downloadError');
      // 确保错误消息是字符串，不是对象
      const errorMessage = typeof rawMessage === 'string' 
        ? rawMessage 
        : (typeof rawMessage === 'object' && rawMessage !== null 
            ? JSON.stringify(rawMessage) 
            : String(rawMessage || t('download.urlDownload.downloadError')));
      message.error(errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  // 移除某个 URL
  const removeUrl = (index: number) => {
    setParsedUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // 清空所有
  const clearAll = () => {
    setSingleUrl('');
    setBatchUrls('');
    setParsedUrls([]);
  };

  const validCount = parsedUrls.filter((p) => p.valid).length;
  const invalidCount = parsedUrls.length - validCount;

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <LinkOutlined /> {t('download.urlDownload.title')}
      </Title>
      <Paragraph type="secondary">{t('download.urlDownload.description')}</Paragraph>

      <Row gutter={[24, 24]}>
        {/* 单个 URL 下载 */}
        <Col xs={24} lg={12}>
          <Card
            title={t('download.urlDownload.singleDownload')}
            extra={
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={downloadSingle}
                loading={downloading}
                disabled={loading}
              >
                {t('download.urlDownload.download')}
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>{t('download.urlDownload.inputLabel')}</Text>
                <Input
                  placeholder={t('download.urlDownload.placeholder')}
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  onPressEnter={downloadSingle}
                  size="large"
                  prefix={<LinkOutlined />}
                  disabled={loading || downloading}
                />
              </div>

              <Button
                block
                onClick={parseSingleUrl}
                loading={loading}
                disabled={downloading}
              >
                {t('download.urlDownload.parseUrl')}
              </Button>

              {parsedUrls.length === 1 && parsedUrls[0] && (
                <Alert
                  message={
                    parsedUrls[0].valid
                      ? t('download.urlDownload.validUrl')
                      : t('download.urlDownload.invalidUrl')
                  }
                  description={
                    parsedUrls[0].valid ? (
                      <div>
                        <Text>
                          {t('download.urlDownload.workId')}: <Tag>{parsedUrls[0].workId || ''}</Tag>
                        </Text>
                        <br />
                        <Text>
                          {t('download.urlDownload.workType')}:{' '}
                          <Tag color={parsedUrls[0].workType === 'illustration' ? 'blue' : 'green'}>
                            {t(`download.urlDownload.${parsedUrls[0].workType || 'illustration'}`)}
                          </Tag>
                        </Text>
                      </div>
                    ) : (
                      <div>
                        <Text type="danger" style={{ whiteSpace: 'pre-line' }}>
                          {parsedUrls[0].error || ''}
                        </Text>
                      </div>
                    )
                  }
                  type={parsedUrls[0].valid ? 'success' : 'error'}
                  showIcon
                />
              )}
            </Space>
          </Card>
        </Col>

        {/* 批量 URL 下载 */}
        <Col xs={24} lg={12}>
          <Card
            title={t('download.urlDownload.batchDownload')}
            extra={
              <Space>
                <Button icon={<DeleteOutlined />} onClick={clearAll} disabled={loading || downloading}>
                  {t('download.urlDownload.clear')}
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={downloadBatch}
                  loading={downloading}
                  disabled={loading || validCount === 0}
                >
                  {t('download.urlDownload.downloadAll')} ({validCount})
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>{t('download.urlDownload.batchInputLabel')}</Text>
                <TextArea
                  placeholder={t('download.urlDownload.batchPlaceholder')}
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  rows={6}
                  disabled={loading || downloading}
                />
              </div>

              <Button
                block
                icon={<PlusOutlined />}
                onClick={parseBatchUrls}
                loading={loading}
                disabled={downloading}
              >
                {t('download.urlDownload.parseUrls')}
              </Button>

              {parsedUrls.length > 1 && (
                <Alert
                  message={t('download.urlDownload.parseResult')}
                  description={
                    <div>
                      <Text>
                        {t('download.urlDownload.validUrls')}: <Tag color="success">{validCount}</Tag>
                      </Text>
                      <Text style={{ marginLeft: 16 }}>
                        {t('download.urlDownload.invalidUrls')}: <Tag color="error">{invalidCount}</Tag>
                      </Text>
                    </div>
                  }
                  type="info"
                  showIcon
                />
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 解析结果列表 */}
      {parsedUrls.length > 1 && (
        <>
          <Divider />
          <Card title={t('download.urlDownload.urlList')}>
            <Spin spinning={loading}>
              <List
                dataSource={parsedUrls}
                renderItem={(item, index) => (
                  <List.Item
                    actions={[
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeUrl(index)}
                        disabled={loading || downloading}
                      >
                        {t('download.urlDownload.remove')}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        item.valid ? (
                          <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                        )
                      }
                      title={
                        <Space>
                          <Text ellipsis style={{ maxWidth: 400 }}>
                            {item.url}
                          </Text>
                          {item.valid && (
                            <>
                              <Tag>{item.workId}</Tag>
                              <Tag color={item.workType === 'illustration' ? 'blue' : 'green'}>
                                {t(`download.urlDownload.${item.workType}`)}
                              </Tag>
                            </>
                          )}
                        </Space>
                      }
                      description={!item.valid && <Text type="danger">{item.error}</Text>}
                    />
                  </List.Item>
                )}
              />
            </Spin>
          </Card>
        </>
      )}

      {/* 使用说明 */}
      <Divider />
      <Card title={t('download.urlDownload.helpTitle')}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>{t('download.urlDownload.supportedFormats')}</Text>
            <ul>
              <li><code>https://www.pixiv.net/artworks/123456</code> — {t('download.urlDownload.fmtStandard')}</li>
              <li><code>https://www.pixiv.net/en/artworks/123456</code> — {t('download.urlDownload.fmtLangPrefix')}</li>
              <li><code>https://pixiv.net/i/123456</code> — {t('download.urlDownload.fmtShort')}</li>
              <li><code>https://www.pixiv.net/member_illust.php?illust_id=123456</code> — {t('download.urlDownload.fmtLegacy')}</li>
              <li><code>https://www.pixiv.net/novel/show.php?id=123456</code> — {t('download.urlDownload.fmtNovel')}</li>
              <li><code>https://www.pixiv.net/novel/series/123456</code> — {t('download.urlDownload.fmtSeries')}</li>
              <li><code>https://www.pixiv.net/users/123456</code> — {t('download.urlDownload.fmtUserProfile')}</li>
              <li><code>https://www.pixiv.net/users/123456/artworks/789012</code> — {t('download.urlDownload.fmtUserArtwork')}</li>
              <li><code>https://www.pixiv.net/users/123456/novels/123456</code> — {t('download.urlDownload.fmtUserNovel')}</li>
              <li><code>123456</code> — {t('download.urlDownload.directId')}</li>
            </ul>
          </div>

          <Alert
            message={t('download.urlDownload.tip')}
            description={t('download.urlDownload.tipDescription')}
            type="info"
            showIcon
          />
        </Space>
      </Card>
    </div>
  );
};

export default UrlDownload;


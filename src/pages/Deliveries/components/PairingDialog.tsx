import { Alert, Modal, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useGatewayPairing } from '../../../hooks/useDeliveries';
import { ApiError } from '../../../services/api';

const { Text, Paragraph } = Typography;

interface PairingDialogProps {
  /** Route name being paired, or null when the dialog is closed. */
  gateway: string | null;
  onClose: () => void;
}

/**
 * Pairing dialog — a transparent view of the GATEWAY's own pairing endpoint.
 *
 * PixivFlow does not generate the QR code, does not speak the login protocol
 * and never stores a session: this dialog renders whatever the gateway
 * answered, verbatim. Two states must not be conflated, so they are shown
 * differently:
 *   - `pairable: false` — the gateway answered and said it cannot pair right
 *     now; its own wording is kept (a generic "failed" would hide the reason).
 *   - a transport failure — nothing was read, so say that instead.
 */
export default function PairingDialog({ gateway, onClose }: PairingDialogProps) {
  const { t } = useTranslation();
  const { pairing, isLoading, error } = useGatewayPairing(gateway);

  const apiError = error instanceof ApiError ? error : null;
  const unsupported = apiError?.code === 'GATEWAY_PAIRING_UNSUPPORTED';

  const image = pairing && pairing.pairable ? pairingImage(pairing) : null;

  return (
    <Modal
      title={t('delivery.pairingTitle', { gateway: gateway ?? '' })}
      open={Boolean(gateway)}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      {isLoading ? <Spin /> : null}

      {unsupported ? (
        <Alert type="info" showIcon message={t('delivery.pairingUnsupported')} />
      ) : null}

      {apiError && !unsupported ? (
        <Alert
          type="warning"
          showIcon
          message={t('delivery.pairingUnavailable')}
          description={<Text type="secondary">{apiError.message}</Text>}
        />
      ) : null}

      {pairing ? (
        <div>
          {image ? (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <img src={image} alt={t('delivery.pairingImageAlt')} style={{ maxWidth: 320 }} />
            </div>
          ) : null}

          {!pairing.pairable ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={t('delivery.pairingNotReady')}
            />
          ) : null}

          <Paragraph type="secondary" style={{ marginBottom: 4 }}>
            {t('delivery.pairingSource', { gateway: pairing.gateway })}
          </Paragraph>

          {!image ? (
            <pre style={{ maxHeight: 260, overflow: 'auto', fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {renderPayload(pairing.payload)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

/**
 * The gateway chooses its own payload shape, so detect only what can be
 * displayed safely: an inline image data URL, or a base64 PNG/SVG blob.
 * Anything else is shown as text rather than guessed at.
 */
function pairingImage(pairing: { contentType: string | null; payload: unknown }): string | null {
  const { contentType, payload } = pairing;

  if (typeof payload === 'string') {
    return payload.startsWith('data:image/') ? payload : null;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['qrCode', 'qr_code', 'qrcode', 'dataUrl', 'data_url', 'image']) {
      const value = record[key];
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        return value;
      }
    }
    // An image content-type with a base64 body is also displayable.
    if (contentType?.startsWith('image/') && typeof record.base64 === 'string') {
      return `data:${contentType};base64,${record.base64}`;
    }
  }

  return null;
}

function renderPayload(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload;
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

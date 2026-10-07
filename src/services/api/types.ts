import { AxiosResponse } from 'axios';

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  error?: string;
}

/**
 * Statistics overview data
 */
export interface StatsOverview {
  totalDownloads: number;
  illustrations: number;
  novels: number;
  recentDownloads: number;
}

/**
 * Download task status
 */
export interface DownloadTask {
  taskId: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: string;
  endTime?: string;
  error?: string;
  progress?: {
    current: number;
    total: number;
    message?: string;
  };
}

/**
 * Download status response
 */
export interface DownloadStatus {
  hasActiveTask: boolean;
  activeTask?: DownloadTask;
  allTasks: DownloadTask[];
}

/**
 * Incomplete task data
 */
export interface IncompleteTask {
  id: number;
  tag: string;
  type: 'illustration' | 'novel';
  status: 'failed' | 'partial';
  message: string | null;
  executedAt: string;
}

/**
 * Download history item
 */
export interface DownloadHistoryItem {
  id: number;
  pixivId: string;
  type: 'illustration' | 'novel';
  title: string;
  tag: string;
  author?: string;
  filePath: string;
  downloadedAt: string;
}

/**
 * Download history response
 */
export interface DownloadHistoryResponse {
  items: DownloadHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * File item data
 */
export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  downloadedAt?: string | null;
  extension?: string;
}

/**
 * Files list response
 */
export interface FilesResponse {
  files: FileItem[];
  directories: FileItem[];
  currentPath: string;
}

/**
 * Log entry data
 */
export interface LogEntry {
  line: string;
  level?: string;
  timestamp?: string;
}

/**
 * Logs response
 */
export interface LogsResponse {
  logs: string[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Config data structure
 */
export interface ConfigData {
  logLevel?: string;
  initialDelay?: number;
  pixiv?: {
    clientId?: string;
    refreshToken?: string;
    userAgent?: string;
  };
  network?: {
    timeoutMs?: number;
    retries?: number;
    retryDelay?: number;
    proxy?: {
      enabled?: boolean;
      host?: string;
      port?: number;
      protocol?: string;
      username?: string;
      password?: string;
    };
  };
  storage?: {
    databasePath?: string;
    downloadDirectory?: string;
    illustrationDirectory?: string;
    novelDirectory?: string;
    illustrationOrganization?: string;
    novelOrganization?: string;
  };
  scheduler?: {
    enabled?: boolean;
    cron?: string;
    timezone?: string;
    maxExecutions?: number;
    minInterval?: number;
    timeout?: number;
  };
  download?: {
    concurrency?: number;
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
  };
  targets?: Array<{
    type: 'illustration' | 'novel';
    tag?: string;
    limit?: number;
    searchTarget?: string;
    sort?: string;
    mode?: string;
    rankingMode?: string;
    rankingDate?: string;
    filterTag?: string;
    minBookmarks?: number;
    startDate?: string;
    endDate?: string;
    seriesId?: number;
    novelId?: number;
    [key: string]: unknown;
  }>;
  _meta?: {
    configPath?: string;
    configPathRelative?: string;
  };
  _validation?: Record<string, unknown>;
}

/**
 * Config history entry
 */
export interface ConfigHistoryEntry {
  id: number;
  name: string;
  description: string | null;
  config: ConfigData;
  created_at: string;
  updated_at: string;
  is_active: number;
}

/**
 * Config file info
 */
export interface ConfigFileInfo {
  filename: string;
  path: string;
  pathRelative: string;
  modifiedTime: string;
  size: number;
  isActive: boolean;
}

/**
 * Config file content
 */
export interface ConfigFileContent {
  filename: string;
  path: string;
  pathRelative: string;
  content: string;
}

/**
 * Config diagnose result
 */
export interface ConfigDiagnoseResult {
  stats: {
    totalFields: number;
    totalSections: number;
    totalTargets: number;
    maxDepth: number;
    fieldTypes: Record<string, number>;
  };
  errors: string[];
  warnings: string[];
  fields: Array<{
    path: string;
    name: string;
    type: string;
    required: boolean;
    description?: string;
    defaultValue?: unknown;
    enumValues?: unknown[];
    depth: number;
    isLeaf: boolean;
  }>;
  sections: Record<string, unknown[]>;
}

/**
 * Config repair result
 */
export interface ConfigRepairResult {
  fixed: boolean;
  errors: string[];
  warnings: string[];
  backupPath?: string;
}

/**
 * Auth status response
 */
export interface AuthStatus {
  isAuthenticated: boolean;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
}

/**
 * Auth login response
 */
export interface AuthLoginResponse {
  refreshToken: string;
  accessToken?: string;
  expiresIn?: number;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
}

/**
 * Host-driven interactive login session
 * Returned by `POST /api/auth/login/host/start`.
 */
export interface HostLoginSession {
  /** Opaque id of the login session, passed back on completion */
  loginId: string;
  /** Pixiv authorize URL to open in the host's in-app window */
  authUrl: string;
  /** Redirect URI the host watches for to extract the `code` parameter */
  redirectUri: string;
}

/**
 * Task logs response
 */
export interface TaskLogsResponse {
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

/**
 * Normalize files result
 */
export interface NormalizeFilesResult {
  result: {
    totalFiles: number;
    processedFiles: number;
    movedFiles: number;
    renamedFiles: number;
    updatedDatabase: number;
    skippedFiles: number;
    errors: Array<{ file: string; error: string }>;
  };
}

/**
 * Type helper for API response
 */
export type ApiResponseType<T> = Promise<AxiosResponse<ApiResponse<T>>>;


/**
 * Candidate supply funnel report persisted on each durable scheduler cell.
 */
export interface CandidateReport {
  fetched?: number;
  selected?: number;
  rejected?: number;
  reasons?: Array<{ code: string; count: number }>;
  final?: number;
  duplicateRatio?: number;
  supplyLevel?: string;
  [key: string]: unknown;
}

/**
 * Scheduler slot (read-only projection of PixivFlow Slot Ledger)
 */
export interface SchedulerSlotCell {
  targetId: string;
  workType: string;
  status: string;
  workId?: string | null;
  terminalReasonCode?: string | null;
  reason?: string | null;
  candidateReport?: CandidateReport | null;
  attemptCount?: number | null;
  fallbackStage?: number | null;
  completedAt?: string | null;
}

export interface SchedulerSlot {
  slotId: string;
  scheduleId: string;
  status: string;
  occurrenceAt: number | null;
  occurrenceDate: string;
  occurrenceLabel: string;
  timezone: string;
  triggerSource?: string | null;
  recoveryRequestId?: string | null;
  recoveryMode?: string | null;
  startedAt?: number | null;
  completedAt?: number | null;
  targets: SchedulerSlotCell[];
}

export interface SchedulerSlotsResponse {
  slots: SchedulerSlot[];
}

/**
 * WebUI recovery admission projection (derived from the durable terminal state).
 */
export interface RecoveryAdmission {
  retryable: boolean;
  relaxedRetryAllowed: boolean;
  retryableReason: string;
}

/**
 * Execution projection: one durable Schedule Ledger cell as an operator row.
 */
export interface SchedulerExecution {
  executionId: string;
  slotId: string;
  scheduleId: string;
  targetId: string;
  workType?: string;
  status: string;
  terminalReasonCode?: string | null;
  message?: string | null;
  startedAt?: number | null;
  endedAt?: number | null;
  triggerSource?: string | null;
  recoveryRequestId?: string | null;
  recoveryMode?: string | null;
  occurrenceAt?: number | null;
  candidateReport?: CandidateReport | null;
  attemptCount?: number | null;
  fallbackStage?: number | null;
  recovery?: RecoveryAdmission;
  operatorHint?: string;
  delivery?: Record<string, unknown> | null;
}

export interface SchedulerExecutionsResponse {
  executions: SchedulerExecution[];
}

export interface SlotLogsResponse {
  logs: string[];
  total: number;
  slotId: string;
  targets: string[];
}

export interface RecoveryRequest {
  requestId: string;
  /** Client-supplied request UUID (required by the recovery contract). */
  retryMode?: 'normal' | 'relaxed';
  correlationId?: string;
}

/* ------------------------------------------------------------------ *
 * Messaging Gateway plane (PixivFlow /api/gateways, /api/deliveries)
 *
 * These are READ-ONLY projections of PixivFlow's delivery plane. The
 * browser renders what the backend already knows: which gateway routes
 * are configured, what each one can carry, the last observed connection
 * state, and the durable delivery ledger. It never pairs, never retries
 * and never sees a credential — the endpoint is redacted server-side.
 * ------------------------------------------------------------------ */

/** A declared delivery target's resolved capabilities (mirrors the backend). */
export interface GatewayCapabilities {
  type: string;
  supported: string[];
  maxTextLength: number;
  maxCaptionLength: number;
  maxUploadBytes: number;
  maxAttachmentsPerMessage: number;
  album: { min: number; max: number } | null;
  requiresTwoPhaseUpload: boolean;
  minSendIntervalMs: number;
  truncatePolicy: 'split' | 'truncate' | 'error';
  idempotencyMechanism: 'none' | 'platform_key' | 'upstream_ledger';
}

/** Per-status delivery counters for one route. */
export interface DeliveryCounts {
  pending: number;
  delivered: number;
  duplicate: number;
  failed: number;
}

/**
 * One configured gateway route. `connectionStatus` is PixivFlow's last
 * OBSERVATION of the gateway's own pairing state and is allowed to be
 * stale; `unknown` means nothing has been observed yet.
 */
export interface GatewayRoute {
  name: string;
  type: string;
  endpoint: string | null;
  enabled: boolean;
  pairingSupported: boolean;
  connectionStatus: 'unknown' | 'unreachable' | 'waiting' | 'connected';
  connectionUpdatedAt: string | null;
  capabilities: GatewayCapabilities;
  deliveryCounts: DeliveryCounts | null;
}

/** A stored connection with no matching config route (a dangling pointer). */
export interface UnconfiguredGateway {
  name: string;
  type: string;
  endpoint: string | null;
  connectionStatus: string;
  connectionUpdatedAt: string | null;
}

export interface GatewaysResponse {
  schemaVersion: number;
  pairingSupported: boolean;
  gateways: GatewayRoute[];
  unconfigured: UnconfiguredGateway[];
}

/** One durable delivery intent as the History view needs it. */
export interface DeliveryRecord {
  id: string;
  deliveryTarget?: string;
  workType: string;
  pixivId: string;
  status: 'pending' | 'delivered' | 'duplicate' | 'failed';
  remoteId?: string | null;
  attempts: number;
  lastError?: string | null;
  slotId?: string | null;
  targetId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deliveredAt?: string | null;
  /** Read-only join of the outbox row: does anything still intend to retry? */
  outboxStatus?: string | null;
}

export interface GatewayDetailResponse extends GatewayRoute {
  schemaVersion: number;
  history: DeliveryRecord[];
}

export interface DeliveriesResponse {
  schemaVersion: number;
  readOnly: boolean;
  routes: Array<{ name: string; type: string; enabled: boolean }>;
  counts: DeliveryCounts;
  perRoute: Record<string, DeliveryCounts>;
  deliveries: DeliveryRecord[];
}

export interface DeliveriesQuery {
  limit?: number;
  status?: 'pending' | 'delivered' | 'duplicate' | 'failed';
  target?: string;
  workType?: string;
}

/**
 * Transparent proxy of the gateway's own pairing endpoint. PixivFlow does
 * not generate the QR code, does not run the login protocol and never
 * stores the session: it only relays what the gateway answered.
 */
export interface GatewayPairingResponse {
  schemaVersion: number;
  readOnly: true;
  fetchedAt: string;
  gateway: string;
  type: string;
  endpoint: string | null;
  pairable: boolean;
  contentType: string | null;
  truncated: boolean;
  payload: unknown;
}

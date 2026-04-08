import Transport from 'winston-transport';

interface LokiTransportOptions extends Transport.TransportStreamOptions {
  endpoint: string;
  username: string;
  password: string;
  serviceName: string;
  environment: string;
  source?: string;
  timeoutMs?: number;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}

interface QueuedLogEntry {
  labels: Record<string, string>;
  line: string;
  timestampNs: string;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_FLUSH_INTERVAL_MS = 2000;
const DEFAULT_MAX_BATCH_SIZE = 100;

function sanitizeLabelKey(key: string): string {
  const normalized = key.replace(/[^a-zA-Z0-9_:]/g, '_');
  if (!normalized) return 'label';
  if (/^[a-zA-Z_:]/.test(normalized)) return normalized;
  return `label_${normalized}`;
}

function sanitizeLabelValue(value: unknown): string {
  if (value === undefined || value === null) return 'unknown';
  return String(value).replace(/\s+/g, '_').slice(0, 200) || 'unknown';
}

function toNanoseconds(timestamp: unknown): string {
  if (typeof timestamp === 'string') {
    const millis = Date.parse(timestamp);
    if (!Number.isNaN(millis)) {
      return (BigInt(millis) * 1_000_000n).toString();
    }
  }

  return (BigInt(Date.now()) * 1_000_000n).toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class GrafanaLokiTransport extends Transport {
  private readonly endpoint: string;
  private readonly authorizationHeader: string;
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly source: string;
  private readonly timeoutMs: number;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;

  private readonly queue: QueuedLogEntry[] = [];
  private readonly flushTimer: ReturnType<typeof setInterval>;

  private flushPromise: Promise<void> | null = null;
  private lastFailureLogAt = 0;

  constructor(options: LokiTransportOptions) {
    super(options);

    this.endpoint = options.endpoint;
    this.authorizationHeader = `Basic ${Buffer.from(`${options.username}:${options.password}`).toString('base64')}`;
    this.serviceName = options.serviceName;
    this.environment = options.environment;
    this.source = options.source || 'application';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.maxBatchSize = options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE;

    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    this.flushTimer.unref();
  }

  log(info: Record<string, unknown>, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      const payload = {
        ...info,
        service: info.service || this.serviceName,
        environment: info.environment || this.environment,
        source: this.source,
      };

      this.queue.push({
        labels: this.buildLabels(payload),
        line: JSON.stringify(payload),
        timestampNs: toNanoseconds(info.timestamp),
      });

      if (this.queue.length >= this.maxBatchSize) {
        void this.flush();
      }
    } catch (error) {
      this.reportFailure(error);
    } finally {
      callback();
    }
  }

  async drain(timeoutMs = this.timeoutMs): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while ((this.queue.length > 0 || this.flushPromise) && Date.now() < deadline) {
      await this.flush();

      if (this.queue.length > 0 || this.flushPromise) {
        await sleep(25);
      }
    }
  }

  close(): void {
    clearInterval(this.flushTimer);
  }

  private buildLabels(info: Record<string, unknown>): Record<string, string> {
    const rawLabels: Record<string, unknown> = {
      service: info.service,
      environment: info.environment,
      source: info.source,
      level: info.level || 'info',
    };

    return Object.fromEntries(
      Object.entries(rawLabels).map(([key, value]) => [
        sanitizeLabelKey(key),
        sanitizeLabelValue(value),
      ]),
    );
  }

  private async flush(): Promise<void> {
    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = this.flushInternal().finally(() => {
      this.flushPromise = null;
    });

    return this.flushPromise;
  }

  private async flushInternal(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.maxBatchSize);

    try {
      await this.pushBatch(batch);
    } catch (error) {
      this.queue.unshift(...batch);
      this.reportFailure(error);
    }
  }

  private async pushBatch(entries: QueuedLogEntry[]): Promise<void> {
    const streamsByLabels = new Map<
      string,
      { stream: Record<string, string>; values: Array<[string, string]> }
    >();

    for (const entry of entries) {
      const key = JSON.stringify(entry.labels);
      const existing = streamsByLabels.get(key);

      if (existing) {
        existing.values.push([entry.timestampNs, entry.line]);
        continue;
      }

      streamsByLabels.set(key, {
        stream: entry.labels,
        values: [[entry.timestampNs, entry.line]],
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authorizationHeader,
        },
        body: JSON.stringify({
          streams: [...streamsByLabels.values()],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Loki push failed: ${response.status} ${body}`.trim());
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private reportFailure(error: unknown): void {
    const now = Date.now();
    if (now - this.lastFailureLogAt < 30_000) {
      return;
    }

    this.lastFailureLogAt = now;
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.warn(`[GrafanaLokiTransport] ${message}`);
  }
}

function parseNumberEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function createGrafanaLokiTransportFromEnv(): GrafanaLokiTransport | null {
  if (process.env.GRAFANA_LOGS_ENABLED !== 'true') {
    return null;
  }

  const endpoint = process.env.GRAFANA_LOKI_URL;
  const username = process.env.GRAFANA_LOKI_USERNAME;
  const password = process.env.GRAFANA_LOKI_TOKEN;

  if (!endpoint || !username || !password) {
    // eslint-disable-next-line no-console
    console.warn(
      '[GrafanaLokiTransport] GRAFANA_LOGS_ENABLED=true but Loki credentials are incomplete.',
    );
    return null;
  }

  return new GrafanaLokiTransport({
    endpoint,
    username,
    password,
    serviceName: process.env.GRAFANA_LOGS_SERVICE_NAME || 't-lecture-server',
    environment: process.env.NODE_ENV || 'development',
    source: process.env.GRAFANA_LOGS_SOURCE || 'application',
    timeoutMs: parseNumberEnv(process.env.GRAFANA_LOGS_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    flushIntervalMs: parseNumberEnv(
      process.env.GRAFANA_LOGS_FLUSH_INTERVAL_MS,
      DEFAULT_FLUSH_INTERVAL_MS,
    ),
    maxBatchSize: parseNumberEnv(process.env.GRAFANA_LOGS_BATCH_SIZE, DEFAULT_MAX_BATCH_SIZE),
  });
}

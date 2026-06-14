import { Sandbox } from "e2b";
import { logger } from "./logger";

const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;
const SERVE_PORT = 3000;
const READY_POLL_INTERVAL_MS = 500;
const READY_TIMEOUT_MS = 30_000;

const DEPLOY_OVERALL_TIMEOUT_MS = 60_000;
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_500;

export interface SandboxResult {
  sandboxId: string;
  previewUrl: string;
}

export class DeployError extends Error {
  constructor(
    message: string,
    public readonly cause: unknown,
    public readonly attempt: number,
    public readonly code: "SANDBOX_CREATE" | "FILE_WRITE" | "SERVER_START" | "PORT_TIMEOUT" | "TIMEOUT"
  ) {
    super(message);
    this.name = "DeployError";
  }
}

/**
 * Retry helper with exponential backoff + jitter.
 * Throws the last error if all attempts fail.
 */
async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number,
  onRetry?: (attempt: number, err: unknown) => void
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        onRetry?.(attempt, err);
        const jitter = Math.random() * 500;
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

/**
 * Write files to an E2B sandbox and start a static HTTP server.
 * Retries up to 3× with exponential backoff; races against a 60s global timeout.
 * Throws DeployError with a structured code so callers can show useful messages.
 */
export async function deployToSandbox(
  files: Array<{ path: string; content: string }>,
  existingSandboxId?: string | null,
  onRetry?: (attempt: number, err: unknown) => void
): Promise<SandboxResult> {
  if (!process.env.E2B_API_KEY) {
    throw new DeployError(
      "Добавьте E2B_API_KEY в Secrets (Replit → Tools → Secrets) для деплоя в песочницу",
      null,
      1,
      "SANDBOX_CREATE"
    );
  }

  const overallTimeout = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new DeployError(
            `Деплой превысил общий лимит ${DEPLOY_OVERALL_TIMEOUT_MS / 1000}s`,
            null,
            RETRY_MAX_ATTEMPTS,
            "TIMEOUT"
          )
        ),
      DEPLOY_OVERALL_TIMEOUT_MS
    )
  );

  return Promise.race([
    withRetry(
      (attempt) => _deployAttempt(files, existingSandboxId, attempt),
      RETRY_MAX_ATTEMPTS,
      RETRY_BASE_DELAY_MS,
      onRetry
    ),
    overallTimeout,
  ]);
}

async function _deployAttempt(
  files: Array<{ path: string; content: string }>,
  existingSandboxId?: string | null,
  attempt: number = 1
): Promise<SandboxResult> {
  let sandbox: Sandbox;

  // Step 1: connect to existing sandbox or create new one
  try {
    if (existingSandboxId) {
      try {
        sandbox = await Sandbox.connect(existingSandboxId);
        await sandbox.setTimeout(SANDBOX_TIMEOUT_MS);
        logger.info({ sandboxId: existingSandboxId, attempt }, "Reconnected to existing sandbox");
      } catch {
        logger.info({ existingSandboxId, attempt }, "Existing sandbox gone, creating new one");
        sandbox = await Sandbox.create({ timeoutMs: SANDBOX_TIMEOUT_MS });
      }
    } else {
      sandbox = await Sandbox.create({ timeoutMs: SANDBOX_TIMEOUT_MS });
    }
  } catch (err) {
    logger.warn({ err, attempt }, "Failed to create/connect sandbox");
    throw new DeployError("Не удалось создать песочницу", err, attempt, "SANDBOX_CREATE");
  }

  const sandboxId = sandbox.sandboxId;
  logger.info({ sandboxId, attempt }, "Sandbox ready, writing files");

  // Step 2: write files
  try {
    for (const file of files) {
      const fullPath = `/home/user/app/${file.path}`;
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      if (dir !== "/home/user/app") {
        await sandbox.commands.run(`mkdir -p "${dir}"`, { timeoutMs: 5_000 });
      }
      await sandbox.files.write(fullPath, file.content);
    }
  } catch (err) {
    logger.warn({ err, sandboxId, attempt }, "Failed to write files to sandbox");
    throw new DeployError("Ошибка записи файлов в песочницу", err, attempt, "FILE_WRITE");
  }

  // Step 3: start static server (fire-and-forget — background process)
  try {
    logger.info({ sandboxId, attempt }, `Starting static server on port ${SERVE_PORT}`);
    sandbox.commands
      .run(`cd /home/user/app && python3 -m http.server ${SERVE_PORT} > /tmp/server.log 2>&1 &`, {
        timeoutMs: 5_000,
      })
      .catch(() => {
        // Expected: shell exits immediately (background &), CommandHandle may
        // still emit a timeout — suppress it so the Node process stays alive.
      });
  } catch (err) {
    throw new DeployError("Не удалось запустить HTTP-сервер в песочнице", err, attempt, "SERVER_START");
  }

  // Step 4: wait for port to be ready
  try {
    await waitForPort(sandbox, SERVE_PORT, READY_TIMEOUT_MS, READY_POLL_INTERVAL_MS);
  } catch (err) {
    throw new DeployError(
      `Порт ${SERVE_PORT} не поднялся за ${READY_TIMEOUT_MS / 1000}s`,
      err,
      attempt,
      "PORT_TIMEOUT"
    );
  }

  const host = sandbox.getHost(SERVE_PORT);
  const previewUrl = `https://${host}`;

  logger.info({ sandboxId, previewUrl, attempt }, "Sandbox deployed successfully");
  return { sandboxId, previewUrl };
}

/**
 * Poll until the given TCP port is listening inside the sandbox, or throw after timeout.
 */
async function waitForPort(
  sandbox: Sandbox,
  port: number,
  timeoutMs: number,
  intervalMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const result = await sandbox.commands.run(
        `python3 -c "import socket; s=socket.socket(); s.settimeout(1); r=s.connect_ex(('localhost',${port})); s.close(); print('OK' if r==0 else 'WAIT')"`,
        { timeoutMs: 3_000 }
      );
      if (result.stdout.trim() === "OK") {
        return;
      }
    } catch {
      // Poll error — keep trying
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Static server on port ${port} did not start within ${timeoutMs / 1000}s`);
}

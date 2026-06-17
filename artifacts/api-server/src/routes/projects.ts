import { Router, type Request } from "express";
import { eq, asc, desc } from "drizzle-orm";
import { ZipArchive } from "archiver";
import { db, projectsTable, messagesTable, filesTable, snapshotsTable, publishedSitesTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  DeleteProjectParams,
  GenerateCodeParams,
  GenerateCodeBody,
  RefreshSandboxParams,
  ListMessagesParams,
  ListFilesParams,
} from "@workspace/api-zod";
import { generateWithOpenAI, streamWithOpenAI, parseGeneratedOutput, generatePlan, generateZeusMd, editProject, ModelTier } from "../lib/openai";
import { deployToSandbox, DeployError } from "../lib/sandbox";

const router = Router();

function generateSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30)
      .replace(/^-|-$/g, "") || "site";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

function buildPublicUrl(req: Request, slug: string): string {
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}/sites/${slug}`;
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ??
    req.get("host") ??
    "localhost";
  return `${proto}://${host}/sites/${slug}`;
}

function parseTier(value: unknown): ModelTier {
  if (value === "lite" || value === "power") return value;
  return "power";
}

function sendSSE(res: import("express").Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function autoSnapshot(projectId: number, files: { path: string; content: string }[], label: string): Promise<void> {
  try {
    await db.insert(snapshotsTable).values({
      projectId,
      filesJson: JSON.stringify(files),
      label,
    });
  } catch {
    // Non-critical — don't interrupt the main operation
  }
}

// GET /projects
router.get("/projects", async (_req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(asc(projectsTable.createdAt));
  res.json(
    projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    }))
  );
});

// POST /projects
router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({ name: parsed.data.name, projectType: parsed.data.projectType ?? "landing", style: parsed.data.style ?? null })
    .returning();
  res.status(201).json({ ...project, createdAt: project.createdAt.toISOString() });
});

// GET /projects/:id
router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ ...project, createdAt: project.createdAt.toISOString() });
});

// DELETE /projects/:id
router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(messagesTable).where(eq(messagesTable.projectId, params.data.id));
  await db.delete(filesTable).where(eq(filesTable.projectId, params.data.id));
  await db.delete(snapshotsTable).where(eq(snapshotsTable.projectId, params.data.id));
  await db.delete(publishedSitesTable).where(eq(publishedSitesTable.projectId, params.data.id));
  const [deleted] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

// POST /projects/plan
router.post("/projects/plan", async (req, res): Promise<void> => {
  const { prompt, projectType, tier } = req.body as { prompt?: string; projectType?: string; tier?: unknown };
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  try {
    const plan = await generatePlan(prompt.trim(), projectType ?? null, parseTier(tier));
    res.json(plan);
  } catch (err) {
    req.log.error({ err }, "Plan generation failed");
    const message = err instanceof Error ? err.message : "Plan generation failed";
    res.status(500).json({ error: message });
  }
});

// GET /projects/:id/messages
router.get("/projects/:id/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.projectId, params.data.id))
    .orderBy(asc(messagesTable.createdAt));
  res.json(messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

// GET /projects/:id/files
router.get("/projects/:id/files", async (req, res): Promise<void> => {
  const params = ListFilesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id))
    .orderBy(asc(filesTable.path));
  res.json(files.map((f) => ({ ...f, updatedAt: f.updatedAt.toISOString() })));
});

// POST /projects/:id/generate
router.post("/projects/:id/generate", async (req, res): Promise<void> => {
  const params = GenerateCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = GenerateCodeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.projectId, params.data.id))
    .orderBy(asc(messagesTable.createdAt));

  const currentFiles = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id));

  // Auto-snapshot before overwriting (only when project already has files)
  if (currentFiles.length > 0) {
    await autoSnapshot(
      params.data.id,
      currentFiles.map((f) => ({ path: f.path, content: f.content })),
      `До генерации: ${body.data.message.slice(0, 50)}`
    );
  }

  // Inject zeus.md brand context for repeat iterations
  const zeusContextBlock = project.zeusContext
    ? `\n\n[Brand context from zeus.md — maintain these decisions:]\n${project.zeusContext}`
    : "";

  const userMessageContent =
    currentFiles.length > 0
      ? `${body.data.message}${zeusContextBlock}\n\nCurrent project files:\n${currentFiles.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")}`
      : `${body.data.message}${zeusContextBlock}`;

  await db.insert(messagesTable).values({
    projectId: params.data.id,
    role: "user",
    content: body.data.message,
  });

  const wantsSSE = (req.headers.accept ?? "").includes("text/event-stream");

  // Auto-detect presentation/slide-deck requests when no explicit type was chosen,
  // so the presentation prompt (slides + slide navigation) is actually used.
  const explicitType = body.data.projectType ?? project.projectType ?? null;
  const detectPresentationType = (msg: string): boolean =>
    /presentation|slide\s?deck|\bslides?\b|\bdeck\b|\u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438|\u0441\u043b\u0430\u0439\u0434/i.test(msg);
  const projectType =
    explicitType ??
    (detectPresentationType(body.data.message) ? "presentation" : "landing");
  const style = body.data.style ?? project.style ?? null;
  const tier = parseTier((req.body as Record<string, unknown>).tier);

  req.log.info({ model: tier === "lite" ? "gpt-4o-mini" : "gpt-4o", tier, style }, "generate: model selected");

  // Save style to project if provided in this request
  if (body.data.style && body.data.style !== project.style) {
    await db.update(projectsTable).set({ style: body.data.style }).where(eq(projectsTable.id, params.data.id));
  }

  if (!wantsSSE) {
    // --- Fallback: regular JSON response ---
    let generated;
    try {
      generated = await generateWithOpenAI(
        history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        userMessageContent,
        projectType,
        tier,
        style
      );
    } catch (err) {
      req.log.error({ err }, "Code generation failed");
      const message = err instanceof Error ? err.message : "Code generation failed";
      res.status(500).json({ error: message });
      return;
    }

    await db.insert(messagesTable).values({
      projectId: params.data.id,
      role: "assistant",
      content: generated.message,
    });

    for (const file of generated.files) {
      const existing = currentFiles.find((f) => f.path === file.path);
      if (existing) {
        await db.update(filesTable).set({ content: file.content }).where(eq(filesTable.id, existing.id));
      } else {
        await db.insert(filesTable).values({ projectId: params.data.id, path: file.path, content: file.content });
      }
    }

    let previewUrl: string | null = project.previewUrl;
    let sandboxId: string | null = project.sandboxId;
    let deployErrMsg: string | null = null;
    try {
      const result = await deployToSandbox(generated.files, project.sandboxId);
      previewUrl = result.previewUrl;
      sandboxId = result.sandboxId;
      await db.update(projectsTable).set({ previewUrl, sandboxId }).where(eq(projectsTable.id, params.data.id));
    } catch (err) {
      req.log.error({ err }, "Sandbox deployment failed after retries");
      deployErrMsg =
        err instanceof DeployError
          ? `Деплой не удался (${err.code}): ${err.message}`
          : "Деплой в песочницу временно недоступен — код сгенерирован и сохранён.";
    }

    // Generate/update zeus.md brand context (non-blocking)
    generateZeusMd(generated.files, projectType)
      .then((ctx) => db.update(projectsTable).set({ zeusContext: ctx }).where(eq(projectsTable.id, params.data.id)))
      .catch((err) => req.log.warn({ err }, "zeus.md generation failed (non-critical)"));

    const updatedFiles = await db.select().from(filesTable).where(eq(filesTable.projectId, params.data.id)).orderBy(asc(filesTable.path));
    res.json({
      message: generated.message,
      files: updatedFiles.map((f) => ({ ...f, updatedAt: f.updatedAt.toISOString() })),
      previewUrl,
      deployError: deployErrMsg,
    });
    return;
  }

  // --- SSE streaming response ---
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const historyMapped = history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  try {
    sendSSE(res, "status", { text: "Принимаю задание, смертный..." });

    // Stream tokens from OpenAI
    let fullText = "";
    let tokenBuffer = "";
    let tokenFlushInterval: ReturnType<typeof setInterval>;

    sendSSE(res, "status", { text: "Призываю молнию OpenAI... ⚡" });

    // Flush tokens in small batches for smooth UX
    tokenFlushInterval = setInterval(() => {
      if (tokenBuffer) {
        sendSSE(res, "token", { text: tokenBuffer });
        tokenBuffer = "";
      }
    }, 40);

    try {
      for await (const chunk of streamWithOpenAI(historyMapped, userMessageContent, projectType, tier, style)) {
        fullText += chunk;
        tokenBuffer += chunk;
      }
    } finally {
      clearInterval(tokenFlushInterval);
      if (tokenBuffer) {
        sendSSE(res, "token", { text: tokenBuffer });
      }
    }

    // Parse the generated output
    sendSSE(res, "status", { text: "Разбираю файлы проекта..." });

    let generated;
    try {
      generated = parseGeneratedOutput(fullText);
    } catch {
      // Retry with non-streaming fallback
      sendSSE(res, "status", { text: "Перезапускаю молнию (повторная попытка)..." });
      generated = await generateWithOpenAI(historyMapped, userMessageContent, projectType, tier, style);
    }

    // Emit file events
    sendSSE(res, "status", { text: "Собираю файлы проекта..." });
    for (const file of generated.files) {
      sendSSE(res, "file", { path: file.path });
    }

    // Save to DB
    await db.insert(messagesTable).values({
      projectId: params.data.id,
      role: "assistant",
      content: generated.message,
    });

    for (const file of generated.files) {
      const existing = currentFiles.find((f) => f.path === file.path);
      if (existing) {
        await db.update(filesTable).set({ content: file.content }).where(eq(filesTable.id, existing.id));
      } else {
        await db.insert(filesTable).values({ projectId: params.data.id, path: file.path, content: file.content });
      }
    }

    // Deploy to E2B with retries
    sendSSE(res, "status", { text: "Деплою в песочницу..." });
    let previewUrl: string | null = project.previewUrl;
    let sandboxId: string | null = project.sandboxId;
    let deployError: string | null = null;
    try {
      const result = await deployToSandbox(
        generated.files,
        project.sandboxId,
        (attempt, err) => {
          req.log.warn({ err, attempt }, "Deploy attempt failed, retrying");
          sendSSE(res, "status", {
            text: `⏳ Деплой, попытка ${attempt + 1}/3... (предыдущая не удалась)`,
          });
        }
      );
      previewUrl = result.previewUrl;
      sandboxId = result.sandboxId;
      await db.update(projectsTable).set({ previewUrl, sandboxId }).where(eq(projectsTable.id, params.data.id));
      sendSSE(res, "status", { text: "Превью готово ✓" });
    } catch (err) {
      req.log.error({ err }, "Sandbox deployment failed after all retries");
      deployError =
        err instanceof DeployError
          ? `Деплой не удался (${err.code}): ${err.message}`
          : "Деплой в песочницу временно недоступен — код сгенерирован и сохранён.";
      sendSSE(res, "status", {
        text: `⚠ ${deployError} Попробуй пересгенерировать позже.`,
      });
    }

    // Generate/update zeus.md brand context (non-blocking — fires after SSE done)
    generateZeusMd(generated.files, projectType)
      .then((ctx) => db.update(projectsTable).set({ zeusContext: ctx }).where(eq(projectsTable.id, params.data.id)))
      .catch((err) => req.log.warn({ err }, "zeus.md generation failed (non-critical)"));

    sendSSE(res, "done", { previewUrl, deployError, message: generated.message });
  } catch (err) {
    req.log.error({ err }, "Streaming generation failed");
    const message = err instanceof Error ? err.message : "Ошибка генерации";
    sendSSE(res, "error", { text: message });
  } finally {
    res.end();
  }
});

// POST /projects/:id/edit
router.post("/projects/:id/edit", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { instruction, tier: tierRaw } = req.body as { instruction?: string; tier?: unknown };
  if (!instruction || typeof instruction !== "string" || !instruction.trim()) {
    res.status(400).json({ error: "instruction is required" });
    return;
  }
  const editTier = parseTier(tierRaw);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const existingFiles = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id))
    .orderBy(asc(filesTable.path));

  if (existingFiles.length === 0) {
    res.status(400).json({ error: "Проект не содержит файлов — сначала сгенерируй проект" });
    return;
  }

  // Auto-snapshot before patching
  await autoSnapshot(
    params.data.id,
    existingFiles.map((f) => ({ path: f.path, content: f.content })),
    `До редактирования: ${instruction.trim().slice(0, 50)}`
  );

  req.log.info({ model: editTier === "lite" ? "gpt-4o-mini" : "gpt-4o", tier: editTier }, "edit: model selected");

  let edited: import("../lib/openai").GeneratedOutput;
  try {
    edited = await editProject(
      existingFiles.map((f) => ({ path: f.path, content: f.content })),
      instruction.trim(),
      project.zeusContext ?? null,
      editTier
    );
  } catch (err) {
    req.log.error({ err }, "editProject failed");
    const message = err instanceof Error ? err.message : "Ошибка редактирования";
    res.status(500).json({ error: message });
    return;
  }

  // Upsert only the changed/new files — leave untouched files in DB as-is
  const filesBefore = existingFiles.map((f) => f.path);
  for (const file of edited.files) {
    const existing = existingFiles.find((f) => f.path === file.path);
    if (existing) {
      await db.update(filesTable).set({ content: file.content }).where(eq(filesTable.id, existing.id));
    } else {
      await db.insert(filesTable).values({ projectId: params.data.id, path: file.path, content: file.content });
    }
  }

  // Load full merged file set for deploy
  const allFiles = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id))
    .orderBy(asc(filesTable.path));

  let previewUrl: string | null = project.previewUrl;
  let sandboxId: string | null = project.sandboxId;
  let deployErrMsg: string | null = null;
  try {
    const result = await deployToSandbox(
      allFiles.map((f) => ({ path: f.path, content: f.content })),
      project.sandboxId,
      (attempt, err) => {
        req.log.warn({ err, attempt }, "Edit deploy attempt failed, retrying");
      }
    );
    previewUrl = result.previewUrl;
    sandboxId = result.sandboxId;
    await db.update(projectsTable).set({ previewUrl, sandboxId }).where(eq(projectsTable.id, params.data.id));
  } catch (err) {
    req.log.error({ err }, "Edit sandbox deployment failed after retries");
    deployErrMsg =
      err instanceof DeployError
        ? `Деплой не удался (${err.code}): ${err.message}`
        : "Деплой в песочницу временно недоступен — изменения сохранены.";
  }

  // Update zeus.md brand context (non-blocking)
  generateZeusMd(allFiles.map((f) => ({ path: f.path, content: f.content })), project.projectType ?? "landing")
    .then((ctx) => db.update(projectsTable).set({ zeusContext: ctx }).where(eq(projectsTable.id, params.data.id)))
    .catch((err) => req.log.warn({ err }, "zeus.md update failed (non-critical)"));

  res.json({
    message: edited.message,
    patchedFiles: edited.files.map((f) => f.path),
    filesBefore,
    allFiles: allFiles.map((f) => ({ ...f, updatedAt: f.updatedAt.toISOString() })),
    previewUrl,
    deployError: deployErrMsg,
  });
});

// GET /projects/:id/download
router.get("/projects/:id/download", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id))
    .orderBy(asc(filesTable.path));

  if (files.length === 0) {
    res.status(400).json({ error: "Проект не содержит файлов" });
    return;
  }

  const safeName = project.name.replace(/[^a-z0-9_\-]/gi, "_").replace(/_+/g, "_").slice(0, 40).replace(/^_+|_+$/g, "") || "project";
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}.zip"`);

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (err: Error) => {
    req.log.error({ err }, "Archive error");
    if (!res.headersSent) res.status(500).json({ error: "Ошибка создания архива" });
  });

  archive.pipe(res);
  for (const file of files) {
    archive.append(file.content, { name: file.path });
  }
  await archive.finalize();
});

// POST /projects/:id/sandbox/refresh
router.post("/projects/:id/sandbox/refresh", async (req, res): Promise<void> => {
  const params = RefreshSandboxParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id));

  if (files.length === 0) {
    res.json({ previewUrl: null });
    return;
  }

  try {
    const result = await deployToSandbox(files, null);
    await db
      .update(projectsTable)
      .set({ previewUrl: result.previewUrl, sandboxId: result.sandboxId })
      .where(eq(projectsTable.id, params.data.id));
    res.json({ previewUrl: result.previewUrl });
  } catch (err) {
    req.log.error({ err }, "Sandbox refresh failed");
    const message = err instanceof Error ? err.message : "Sandbox refresh failed";
    res.status(500).json({ error: message });
  }
});

// POST /projects/:id/snapshot — create a snapshot manually
router.post("/projects/:id/snapshot", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { label } = req.body as { label?: string };
  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id));
  if (files.length === 0) {
    res.status(400).json({ error: "Нет файлов для снапшота" });
    return;
  }
  const [snapshot] = await db
    .insert(snapshotsTable)
    .values({
      projectId: params.data.id,
      filesJson: JSON.stringify(files.map((f) => ({ path: f.path, content: f.content }))),
      label: label || new Date().toLocaleString("ru-RU"),
    })
    .returning();
  res.status(201).json({ ...snapshot, createdAt: snapshot.createdAt.toISOString() });
});

// GET /projects/:id/snapshots — list snapshots (newest first, no filesJson)
router.get("/projects/:id/snapshots", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const snapshots = await db
    .select({
      id: snapshotsTable.id,
      label: snapshotsTable.label,
      createdAt: snapshotsTable.createdAt,
    })
    .from(snapshotsTable)
    .where(eq(snapshotsTable.projectId, params.data.id))
    .orderBy(desc(snapshotsTable.createdAt));
  res.json(snapshots.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

// POST /projects/:id/restore/:snapshotId — restore files + redeploy
router.post("/projects/:id/restore/:snapshotId", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id, 10);
  const snapshotId = parseInt(req.params.snapshotId, 10);
  if (isNaN(projectId) || isNaN(snapshotId)) {
    res.status(400).json({ error: "Invalid project or snapshot id" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [snapshot] = await db
    .select()
    .from(snapshotsTable)
    .where(eq(snapshotsTable.id, snapshotId));
  if (!snapshot || snapshot.projectId !== projectId) {
    res.status(404).json({ error: "Snapshot not found" });
    return;
  }

  const restoredFiles = JSON.parse(snapshot.filesJson) as { path: string; content: string }[];

  // Replace all current files with snapshot files
  await db.delete(filesTable).where(eq(filesTable.projectId, projectId));
  for (const file of restoredFiles) {
    await db.insert(filesTable).values({ projectId, path: file.path, content: file.content });
  }

  // Redeploy to E2B
  let previewUrl: string | null = null;
  let sandboxId: string | null = null;
  let deployErrMsg: string | null = null;
  try {
    const result = await deployToSandbox(restoredFiles, null);
    previewUrl = result.previewUrl;
    sandboxId = result.sandboxId;
    await db.update(projectsTable).set({ previewUrl, sandboxId }).where(eq(projectsTable.id, projectId));
  } catch (err) {
    req.log.error({ err }, "Restore sandbox deployment failed");
    deployErrMsg =
      err instanceof DeployError
        ? `Деплой не удался (${err.code}): ${err.message}`
        : "Деплой в песочницу временно недоступен — файлы восстановлены.";
  }

  req.log.info({ snapshotId, restoredFilesCount: restoredFiles.length, deployErrMsg }, "snapshot restored");

  res.json({
    restoredFiles: restoredFiles.map((f) => f.path),
    previewUrl,
    deployError: deployErrMsg,
  });
});

// GET /projects/:id/published — check if project has been published
router.get("/projects/:id/published", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [site] = await db
    .select({
      slug: publishedSitesTable.slug,
      updatedAt: publishedSitesTable.updatedAt,
    })
    .from(publishedSitesTable)
    .where(eq(publishedSitesTable.projectId, params.data.id));

  if (!site) {
    res.json({ published: false });
    return;
  }
  const publicUrl = buildPublicUrl(req, site.slug);
  res.json({ published: true, slug: site.slug, publicUrl, updatedAt: site.updatedAt.toISOString() });
});

// POST /projects/:id/publish — publish (or re-publish) current files on stable URL
router.post("/projects/:id/publish", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id))
    .orderBy(asc(filesTable.path));

  if (files.length === 0) {
    res.status(400).json({ error: "Нет файлов для публикации — сначала сгенерируй проект" });
    return;
  }

  const filesJson = JSON.stringify(files.map((f) => ({ path: f.path, content: f.content })));

  const [existing] = await db
    .select()
    .from(publishedSitesTable)
    .where(eq(publishedSitesTable.projectId, params.data.id));

  let slug: string;
  const now = new Date();

  if (existing) {
    slug = existing.slug;
    await db
      .update(publishedSitesTable)
      .set({ filesJson, updatedAt: now })
      .where(eq(publishedSitesTable.projectId, params.data.id));
  } else {
    slug = generateSlug(project.name);
    await db.insert(publishedSitesTable).values({
      projectId: params.data.id,
      slug,
      filesJson,
    });
  }

  const publicUrl = buildPublicUrl(req, slug);
  req.log.info({ slug, publicUrl, isUpdate: !!existing }, "project published");

  res.json({
    slug,
    publicUrl,
    updatedAt: now.toISOString(),
    isUpdate: !!existing,
  });
});

export default router;


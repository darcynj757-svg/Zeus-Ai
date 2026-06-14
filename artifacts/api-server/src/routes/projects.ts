import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { ZipArchive } from "archiver";
import { db, projectsTable, messagesTable, filesTable } from "@workspace/db";
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
import { generateWithOpenAI, streamWithOpenAI, parseGeneratedOutput } from "../lib/openai";
import { deployToSandbox } from "../lib/sandbox";

const router = Router();

function sendSSE(res: import("express").Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
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
    .values({ name: parsed.data.name })
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

  const userMessageContent =
    currentFiles.length > 0
      ? `${body.data.message}\n\nCurrent project files:\n${currentFiles.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")}`
      : body.data.message;

  await db.insert(messagesTable).values({
    projectId: params.data.id,
    role: "user",
    content: body.data.message,
  });

  const wantsSSE = (req.headers.accept ?? "").includes("text/event-stream");

  if (!wantsSSE) {
    // --- Fallback: regular JSON response ---
    let generated;
    try {
      generated = await generateWithOpenAI(
        history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        userMessageContent
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
    try {
      const result = await deployToSandbox(generated.files, project.sandboxId);
      previewUrl = result.previewUrl;
      sandboxId = result.sandboxId;
      await db.update(projectsTable).set({ previewUrl, sandboxId }).where(eq(projectsTable.id, params.data.id));
    } catch (err) {
      req.log.error({ err }, "Sandbox deployment failed");
    }

    const updatedFiles = await db.select().from(filesTable).where(eq(filesTable.projectId, params.data.id)).orderBy(asc(filesTable.path));
    res.json({ message: generated.message, files: updatedFiles.map((f) => ({ ...f, updatedAt: f.updatedAt.toISOString() })), previewUrl });
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
      for await (const chunk of streamWithOpenAI(historyMapped, userMessageContent)) {
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
      generated = await generateWithOpenAI(historyMapped, userMessageContent);
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

    // Deploy to E2B
    sendSSE(res, "status", { text: "Деплою в песочницу..." });
    let previewUrl: string | null = project.previewUrl;
    let sandboxId: string | null = project.sandboxId;
    try {
      const result = await deployToSandbox(generated.files, project.sandboxId);
      previewUrl = result.previewUrl;
      sandboxId = result.sandboxId;
      await db.update(projectsTable).set({ previewUrl, sandboxId }).where(eq(projectsTable.id, params.data.id));
      sendSSE(res, "status", { text: "Превью готово ✓" });
    } catch (err) {
      req.log.error({ err }, "Sandbox deployment failed");
      const sandboxErrMsg = err instanceof Error ? err.message : "Ошибка деплоя в песочницу";
      sendSSE(res, "status", { text: `⚠ Ошибка деплоя: ${sandboxErrMsg}` });
    }

    sendSSE(res, "done", { previewUrl, message: generated.message });
  } catch (err) {
    req.log.error({ err }, "Streaming generation failed");
    const message = err instanceof Error ? err.message : "Ошибка генерации";
    sendSSE(res, "error", { text: message });
  } finally {
    res.end();
  }
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

export default router;

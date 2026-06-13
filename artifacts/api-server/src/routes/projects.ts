import { Router } from "express";
import { eq, asc } from "drizzle-orm";
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
import { generateWithOpenAI } from "../lib/openai";
import { deployToSandbox } from "../lib/sandbox";

const router = Router();

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

  // Fetch conversation history
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.projectId, params.data.id))
    .orderBy(asc(messagesTable.createdAt));

  // Fetch current files for context
  const currentFiles = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id));

  // Build context message with current files
  const userMessageContent =
    currentFiles.length > 0
      ? `${body.data.message}\n\nCurrent project files:\n${currentFiles.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")}`
      : body.data.message;

  // Save user message
  await db.insert(messagesTable).values({
    projectId: params.data.id,
    role: "user",
    content: body.data.message,
  });

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

  // Save assistant message
  await db.insert(messagesTable).values({
    projectId: params.data.id,
    role: "assistant",
    content: generated.message,
  });

  // Upsert files
  for (const file of generated.files) {
    const existing = currentFiles.find((f) => f.path === file.path);
    if (existing) {
      await db
        .update(filesTable)
        .set({ content: file.content })
        .where(eq(filesTable.id, existing.id));
    } else {
      await db.insert(filesTable).values({
        projectId: params.data.id,
        path: file.path,
        content: file.content,
      });
    }
  }

  // Deploy to E2B sandbox
  let previewUrl: string | null = project.previewUrl;
  let sandboxId: string | null = project.sandboxId;

  try {
    const result = await deployToSandbox(generated.files, project.sandboxId);
    previewUrl = result.previewUrl;
    sandboxId = result.sandboxId;
    await db
      .update(projectsTable)
      .set({ previewUrl, sandboxId })
      .where(eq(projectsTable.id, params.data.id));
  } catch (err) {
    req.log.error({ err }, "Sandbox deployment failed");
    // Continue without preview — still return generated files
  }

  // Return updated files
  const updatedFiles = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, params.data.id))
    .orderBy(asc(filesTable.path));

  res.json({
    message: generated.message,
    files: updatedFiles.map((f) => ({ ...f, updatedAt: f.updatedAt.toISOString() })),
    previewUrl,
  });
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
    const result = await deployToSandbox(files, null); // force new sandbox
    await db
      .update(projectsTable)
      .set({ previewUrl: result.previewUrl, sandboxId: result.sandboxId })
      .where(eq(projectsTable.id, params.data.id));
    res.json({ previewUrl: result.previewUrl });
  } catch (err) {
    req.log.error({ err }, "Sandbox refresh failed");
    res.status(500).json({ error: "Sandbox refresh failed" });
  }
});

export default router;

import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const filesTable = pgTable("files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFileSchema = createInsertSchema(filesTable).omit({ id: true, updatedAt: true });
export type InsertFile = z.infer<typeof insertFileSchema>;
export type ProjectFile = typeof filesTable.$inferSelect;

import { bigserial, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const resumesTable = pgTable('resumes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  parsedContent: text('parsed_content').notNull(),
});

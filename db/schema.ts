import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("records", {
  id: text("id").primaryKey(),
  dataset: text("dataset").notNull(),
  kind: text("kind").notNull(),
  payload: text("payload").notNull(),
}, t => [index("idx_records_dataset_kind").on(t.dataset, t.kind)]);

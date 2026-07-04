import { generateId, now } from './db';

export interface AuditEntry {
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(db: D1Database, entry: AuditEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      generateId('log'),
      entry.actorUserId,
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      now(),
    )
    .run();
}

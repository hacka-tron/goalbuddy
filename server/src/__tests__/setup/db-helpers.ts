import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const testPool = new Pool({ connectionString: 'postgresql://localhost:5432/goalbuddy_test' });

const JWT_SECRET = 'test-secret-key';

// ─── Truncate ────────────────────────────────────────────────────────────────

export async function truncateAll() {
  await testPool.query(`
    TRUNCATE TABLE
      check_ins,
      milestone_logs,
      swipe_actions,
      buddy_connections,
      milestones,
      goals,
      activity_stats,
      users
    RESTART IDENTITY CASCADE
  `);
}

// ─── Seed helpers ────────────────────────────────────────────────────────────

let userCounter = 0;

export async function seedUser(overrides: {
  email?: string;
  password?: string;
  displayName?: string;
  username?: string;
} = {}) {
  userCounter++;
  const n = userCounter;
  const email = overrides.email ?? `user${n}@test.com`;
  const displayName = overrides.displayName ?? `User ${n}`;
  const username = overrides.username ?? `user${n}`;
  const passwordHash = await bcrypt.hash(overrides.password ?? 'password123', 4);

  const { rows } = await testPool.query(
    `INSERT INTO users (email, password_hash, display_name, username)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, display_name, username`,
    [email, passwordHash, displayName, username]
  );
  const user = rows[0];

  // Insert default activity_stats row
  await testPool.query(
    `INSERT INTO activity_stats (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [user.id]
  );

  return { ...user, token: makeToken(user.id) };
}

export function makeToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export async function seedGoal(userId: string, overrides: {
  title?: string;
  category?: string;
  isPublic?: boolean;
  coopOpen?: boolean;
  status?: string;
} = {}) {
  const { rows } = await testPool.query(
    `INSERT INTO goals (user_id, title, category, is_public, coop_open, status)
     VALUES ($1, $2, $3, $4, $5, $6::goal_status)
     RETURNING *`,
    [
      userId,
      overrides.title ?? 'Test Goal',
      overrides.category ?? 'workout',
      overrides.isPublic ?? false,
      overrides.coopOpen ?? false,
      overrides.status ?? 'active',
    ]
  );
  return rows[0];
}

export async function seedMilestone(goalId: string, userId: string, overrides: {
  title?: string;
  frequency?: string;
} = {}) {
  const { rows } = await testPool.query(
    `INSERT INTO milestones (goal_id, user_id, title, frequency)
     VALUES ($1, $2, $3, $4::milestone_frequency)
     RETURNING *`,
    [goalId, userId, overrides.title ?? 'Test Milestone', overrides.frequency ?? 'daily']
  );
  return rows[0];
}

export async function seedConnection(requesterId: string, receiverId: string, goalId: string, overrides: {
  status?: string;
  connectionType?: string;
} = {}) {
  const { rows } = await testPool.query(
    `INSERT INTO buddy_connections (requester_id, receiver_id, goal_id, status, connection_type)
     VALUES ($1, $2, $3, $4::connection_status, $5::connection_type)
     RETURNING *`,
    [
      requesterId,
      receiverId,
      goalId,
      overrides.status ?? 'pending',
      overrides.connectionType ?? 'accountability',
    ]
  );
  return rows[0];
}

export async function seedCheckin(connectionId: string, authorId: string, overrides: {
  message?: string;
  mood?: string;
} = {}) {
  const { rows } = await testPool.query(
    `INSERT INTO check_ins (connection_id, author_id, message, mood)
     VALUES ($1, $2, $3, $4::mood_type)
     RETURNING *`,
    [connectionId, authorId, overrides.message ?? 'Hello!', overrides.mood ?? 'good']
  );
  return rows[0];
}

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { ServiceError } from '../lib/errors';

export const signToken = (userId: string): string =>
  jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);

export class AuthService {
  static async register(email: string, password: string, displayName: string, username: string) {
    const existing = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      throw new ServiceError('Email or username already taken', 409, 'CONFLICT');
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name, username)
       VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, username, avatar_url, theme`,
      [email, hash, displayName, username]
    );
    const user = result.rows[0];
    return { token: signToken(user.id), user };
  }

  static async login(email: string, password: string) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      throw new ServiceError('Invalid credentials', 401, 'UNAUTHORIZED');
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new ServiceError('Invalid credentials', 401, 'UNAUTHORIZED');
    }
    const { password_hash: _, ...safeUser } = user;
    return { token: signToken(user.id), user: safeUser };
  }

  static async loginWithGoogleCode(code: string, redirectUri: string, codeVerifier?: string) {
    const params: Record<string, string> = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };
    if (codeVerifier) params.code_verifier = codeVerifier;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const tokens = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokens.access_token) {
      throw new ServiceError(tokens.error ?? 'Token exchange failed', 401, 'UNAUTHORIZED');
    }

    const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokens.access_token}`);
    if (!googleRes.ok) {
      throw new ServiceError('Failed to get user info', 401, 'UNAUTHORIZED');
    }
    const profile = await googleRes.json() as { sub: string; email: string; name: string; picture?: string };

    return AuthService.findOrCreateGoogleUser(profile.sub, profile.email, profile.name, profile.picture ?? null);
  }

  static async findOrCreateGoogleUser(googleId: string, email: string, name: string, picture: string | null) {
    let result = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    if (result.rows.length > 0) {
      const { password_hash: _, ...safeUser } = result.rows[0];
      return { token: signToken(result.rows[0].id), user: safeUser, isNew: false };
    }

    result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const updated = await query('UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *', [googleId, email]);
      const { password_hash: _, ...safeUser } = updated.rows[0];
      return { token: signToken(updated.rows[0].id), user: safeUser, isNew: false };
    }

    const username = `${email.split('@')[0]}_${Date.now()}`.slice(0, 30);
    const newUser = await query(
      `INSERT INTO users (email, google_id, display_name, username, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, googleId, name, username, picture],
    );
    const { password_hash: _, ...safeUser } = newUser.rows[0];
    return { token: signToken(newUser.rows[0].id), user: safeUser, isNew: true };
  }
}

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from '../db';

const router = Router();

const signToken = (userId: string) =>
  jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);

// ─── Passport Google Strategy ───────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'));

        let result = await query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
        if (result.rows.length > 0) return done(null, result.rows[0]);

        // Check if email already registered
        result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
          // Link google_id to existing account
          const updated = await query(
            'UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *',
            [profile.id, email]
          );
          return done(null, updated.rows[0]);
        }

        // New user via Google
        const displayName = profile.displayName || email.split('@')[0];
        const username = `${email.split('@')[0]}_${Date.now()}`.slice(0, 30);
        const avatarUrl = profile.photos?.[0]?.value || null;

        const newUser = await query(
          `INSERT INTO users (email, google_id, display_name, username, avatar_url)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [email, profile.id, displayName, username, avatarUrl]
        );
        return done(null, newUser.rows[0]);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

// ─── Email / Password Register ───────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, displayName, username } = req.body;
  if (!email || !password || !displayName || !username) {
    res.status(400).json({ error: 'All fields required' });
    return;
  }
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email or username already taken' });
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name, username)
       VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, username, avatar_url, theme`,
      [email, hash, displayName, username]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken(user.id), user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Email / Password Login ───────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const { password_hash: _, ...safeUser } = user;
    res.json({ token: signToken(user.id), user: safeUser });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Google OAuth (mobile — authorization code + PKCE) ────────
router.post('/google/token', async (req: Request, res: Response): Promise<void> => {
  const { code, codeVerifier, redirectUri } = req.body;
  if (!code || !redirectUri) { res.status(400).json({ error: 'code and redirectUri required' }); return; }
  try {
    // Exchange code for tokens
    const params: Record<string, string> = {
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    };
    if (codeVerifier) params.code_verifier = codeVerifier;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const tokens = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokens.access_token) {
      res.status(401).json({ error: tokens.error ?? 'Token exchange failed' }); return;
    }

    // Get user info
    const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokens.access_token}`);
    if (!googleRes.ok) { res.status(401).json({ error: 'Failed to get user info' }); return; }
    const profile = await googleRes.json() as { sub: string; email: string; name: string; picture?: string };

    // Find by google_id
    let result = await query('SELECT * FROM users WHERE google_id = $1', [profile.sub]);
    if (result.rows.length > 0) {
      const { password_hash: _, ...safeUser } = result.rows[0];
      res.json({ token: signToken(result.rows[0].id), user: safeUser }); return;
    }
    // Link to existing email
    result = await query('SELECT * FROM users WHERE email = $1', [profile.email]);
    if (result.rows.length > 0) {
      const updated = await query('UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *', [profile.sub, profile.email]);
      const { password_hash: _, ...safeUser } = updated.rows[0];
      res.json({ token: signToken(updated.rows[0].id), user: safeUser }); return;
    }
    // New user
    const username = `${profile.email.split('@')[0]}_${Date.now()}`.slice(0, 30);
    const newUser = await query(
      `INSERT INTO users (email, google_id, display_name, username, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [profile.email, profile.sub, profile.name, username, profile.picture ?? null],
    );
    const { password_hash: _, ...safeUser } = newUser.rows[0];
    res.status(201).json({ token: signToken(newUser.rows[0].id), user: safeUser });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ─── Google OAuth (browser redirect flow) ─────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/login' }),
  (req: Request, res: Response) => {
    const user = req.user as { id: string };
    const token = signToken(user.id);
    // Deep link back to the Expo app
    res.redirect(`${process.env.CLIENT_URL}?token=${token}`);
  }
);

export default router;

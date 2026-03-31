import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AuthService, signToken } from '../services/auth.service';
import { ServiceError } from '../lib/errors';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().min(2),
    username: z.string().min(3).max(30),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

const googleTokenSchema = z.object({
  body: z.object({
    code: z.string().min(1),
    redirectUri: z.string().url(),
    codeVerifier: z.string().optional(),
  }),
});

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
        const avatarUrl = profile.photos?.[0]?.value || null;
        const { user } = await AuthService.findOrCreateGoogleUser(profile.id, email, profile.displayName, avatarUrl);
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

// ─── Routes ─────────────────────────────────────────────────

router.post('/register', validate(registerSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password, displayName, username } = req.body;
  try {
    const result = await AuthService.register(email, password, displayName, username);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.post('/google/token', validate(googleTokenSchema), async (req: Request, res: Response): Promise<void> => {
  const { code, codeVerifier, redirectUri } = req.body;
  try {
    const result = await AuthService.loginWithGoogleCode(code, redirectUri, codeVerifier);
    const statusCode = result.isNew ? 201 : 200;
    res.status(statusCode).json({ token: result.token, user: result.user });
  } catch (err) {
    if (err instanceof ServiceError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code, retryable: err.retryable });
      return;
    }
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR', retryable: true });
  }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/login' }),
  (req: Request, res: Response) => {
    const user = req.user as { id: string };
    const token = signToken(user.id);
    res.redirect(`${process.env.CLIENT_URL}?token=${token}`);
  }
);

export default router;

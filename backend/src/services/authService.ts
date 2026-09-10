import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../config/db';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function issueTokenPayload(user: { id: number; email: string; role: string; name: string; avatar?: string | null; bio?: string | null; created_at?: Date }) {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
  return {
    token,
    user: {
      id: String(user.id),
      email: user.email,
      displayName: user.name,
      role: user.role as 'student' | 'instructor' | 'admin',
      photoURL: user.avatar || undefined,
      bio: user.bio || undefined,
      createdAt: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString(),
    },
  };
}

export const register = async (email: string, password: string, name: string, role: string = 'student') => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const existingUser = await query('SELECT id FROM users WHERE lower(trim(email)) = $1', [normalizedEmail]);
  if (existingUser.rows.length > 0) {
    throw new Error('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, avatar, bio, created_at',
    [normalizedEmail, hashedPassword, name, role]
  );
  const user = result.rows[0];
  return issueTokenPayload(user);
};

export const login = async (email: string, password: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Invalid credentials');
  }

  const result = await query('SELECT * FROM users WHERE lower(trim(email)) = $1', [normalizedEmail]);
  const user = result.rows[0];

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  return issueTokenPayload(user);
};

type GoogleIdLike = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

/** Shared DB sync after Google identity is verified (ID token or auth-code exchange). */
async function syncUserFromGoogleIdentity(payload: GoogleIdLike) {
  if (!payload.email) {
    throw new Error('Google did not return an email');
  }
  if (payload.email_verified === false) {
    throw new Error('Verify your Google email address first');
  }

  const email = normalizeEmail(payload.email);
  const name = (payload.name || email.split('@')[0]).slice(0, 255);
  const picture = payload.picture ? payload.picture.slice(0, 500) : null;

  const bootstrapAdminRaw = process.env.GOOGLE_BOOTSTRAP_ADMIN_EMAIL?.trim();
  const isBootstrapAdmin =
    !!bootstrapAdminRaw && normalizeEmail(bootstrapAdminRaw) === email;

  let result = await query('SELECT * FROM users WHERE lower(trim(email)) = $1', [email]);
  let user = result.rows[0];

  if (!user) {
    const role = isBootstrapAdmin ? 'admin' : 'student';
    const placeholderPassword = await bcrypt.hash(randomBytes(48).toString('hex'), 10);
    const insert = await query(
      `INSERT INTO users (email, password, name, role, avatar)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, avatar, bio, created_at`,
      [email, placeholderPassword, name, role, picture]
    );
    user = insert.rows[0];
  } else {
    if (isBootstrapAdmin && user.role !== 'admin') {
      const up = await query(
        `UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = $1
         RETURNING id, email, name, role, avatar, bio, created_at`,
        [user.id]
      );
      user = up.rows[0];
    }
    if (picture) {
      await query('UPDATE users SET avatar = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [picture, user.id]);
      user.avatar = picture;
    }
  }

  return issueTokenPayload(user);
}

/** Verify Google ID token (GIS button / One Tap), then sign in or register. */
export const loginWithGoogle = async (idToken: string) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google sign-in is not configured on the server');
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error('Google did not return an email');
  }

  return syncUserFromGoogleIdentity(payload);
};

/**
 * Authorization code flow (full browser redirect). Works when the embedded GSI button fails with
 * "origin not allowed" / FedCM — add matching redirect URIs in Google Cloud Console.
 */
export const loginWithGoogleAuthCode = async (code: string, redirectUri: string) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId) {
    throw new Error('Google sign-in is not configured on the server');
  }
  if (!clientSecret) {
    throw new Error('GOOGLE_CLIENT_SECRET is required for redirect sign-in');
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  let tokens;
  try {
    const exchanged = await oauth2Client.getToken(code);
    tokens = exchanged.tokens;
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    // invalid_grant: code reused, expired, or redirect_uri mismatch with Google's auth request
    if (/invalid_grant|redirect_uri/i.test(raw)) {
      throw new Error(
        'Google sign-in could not be completed (code expired or already used). Close this tab and click "Continue with Google" again on the login page.'
      );
    }
    throw new Error(raw || 'Failed to exchange authorization code');
  }

  if (!tokens.id_token) {
    throw new Error('Google did not return an id_token');
  }

  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error('Google did not return an email');
  }

  return syncUserFromGoogleIdentity(payload);
};

export const getProfile = async (id: number) => {
  const result = await query(
    'SELECT id, email, name, role, avatar, bio, created_at FROM users WHERE id = $1',
    [id]
  );
  const user = result.rows[0];
  return {
    id: String(user.id),
    email: user.email,
    displayName: user.name,
    role: user.role,
    photoURL: user.avatar ?? undefined,
    bio: user.bio ?? undefined,
    createdAt: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString(),
  };
};

export const updateProfile = async (id: number, data: { name?: string; bio?: string; avatar?: string }) => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.bio) {
    fields.push(`bio = $${paramIndex++}`);
    values.push(data.bio);
  }
  if (data.avatar) {
    fields.push(`avatar = $${paramIndex++}`);
    values.push(data.avatar);
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, role, avatar, bio`,
    values
  );
  const user = result.rows[0];
  return {
    id: String(user.id),
    email: user.email,
    displayName: user.name,
    role: user.role,
    photoURL: user.avatar ?? undefined,
    bio: user.bio ?? undefined,
  };
};

export const getInstructors = async () => {
  const result = await query(
    'SELECT id, name, avatar, bio FROM users WHERE role = $1',
    ['instructor']
  );
  return result.rows.map((user) => ({
    id: user.id,
    displayName: user.name,
    photoURL: user.avatar,
    bio: user.bio,
  }));
};

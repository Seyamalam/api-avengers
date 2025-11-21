import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, users } from '@careforall/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = new Hono();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

app.post(
  '/register',
  zValidator('json', registerSchema),
  async (c) => {
    const { email, password } = c.req.valid('json');
  
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

  if (existingUser) {
    return c.json({ error: 'User already exists' }, 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const [user] = await db.insert(users).values({
    email,
    password: hashedPassword,
  }).returning();

  if (!user) {
    return c.json({ error: 'Failed to create user' }, 500);
  }

    return c.json({ id: user.id, email: user.email }, 201);
  }
);

app.post(
  '/login',
  zValidator('json', loginSchema),
  async (c) => {
    const { email, password } = c.req.valid('json');

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '1d',
    });

    return c.json({ token });
  }
);

export const authRoutes = app;

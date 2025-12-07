import { z } from 'zod';

/**
 * Environment variable validation using Zod
 * This file validates all required environment variables at build time
 * and provides type-safe access to them throughout the application
 */

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Database (Neon PostgreSQL)
  DATABASE_URL: z.string().url(),

  // Vercel Blob Storage
  BLOB_READ_WRITE_TOKEN: z.string().startsWith('vercel_blob_'),

  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/login'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/signup'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),

  // Clerk Session Configuration (optional)
  CLERK_COOKIE_DOMAIN: z.string().optional(),
  CLERK_SESSION_TOKEN_LEEWAY: z.string().optional(),
  CLERK_ROTATE_SESSION_INTERVAL: z.string().optional(),

  // Stripe Payment Provider (Phase 7 - Optional for Phase 1)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_MONTHLY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PRICE_ID_SMALL_FIRM_MONTHLY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE: z.string().optional(),

  // OpenAI (Phase 3 - Optional for Phase 1)
  OPENAI_API_KEY: z.string().optional(),

  // Dropbox (Phase 2 - Optional for Phase 1)
  DROPBOX_APP_KEY: z.string().optional(),
  DROPBOX_APP_SECRET: z.string().optional(),
  DROPBOX_REDIRECT_URI: z.string().url().optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
  // Skip validation during build if SKIP_ENV_VALIDATION is set
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return process.env as unknown as z.infer<typeof envSchema>;
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment variables. Please check your .env file.');
    }
    throw error;
  }
};

export const env = parseEnv();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;

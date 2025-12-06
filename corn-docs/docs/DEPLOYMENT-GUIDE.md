# Deployment Guide - Parency Legal

## 🚀 Vercel Deployment

### Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **GitHub Repository**: Code must be pushed to GitHub
3. **Environment Variables**: Prepare all required secrets

### Required Environment Variables

Create these in Vercel Project Settings → Environment Variables:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://postgres.xdpuwjbyjfgtknkmswka:YOUR_PASSWORD@aws-0-us-west-2.pooler.supabase.com:6543/postgres"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# Optional: Analytics & Monitoring
NEXT_PUBLIC_VERCEL_ANALYTICS_ID="..."
SENTRY_DSN="..."
```

### Step-by-Step Deployment

#### 1. Push Code to GitHub

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Phase 1 Complete: Database, Auth, and Cases API

- 63 comprehensive tests (100% passing sequentially)
- 8 database tables with proper relationships
- Clerk authentication integration
- Full CRUD API for cases with authorization
- Application-level security via userId filtering
- Zod validation on all endpoints"

# Push to GitHub
git push origin main
```

#### 2. Create Vercel Project

**Option A: Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Framework Preset: Next.js
5. Root Directory: `./`
6. Build Command: `npm run build`
7. Output Directory: `.next`
8. Install Command: `npm install`

**Option B: Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

#### 3. Configure Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables from the list above
3. Select environments: Production, Preview, Development

**Important**:
- Use the **pooler connection** for DATABASE_URL
- Get Clerk keys from Clerk Dashboard → API Keys
- Add `NEXT_PUBLIC_` prefix for client-side variables

#### 4. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploy if configured)
git push origin main
```

### Post-Deployment Checklist

- [ ] Verify deployment succeeded (check Vercel dashboard)
- [ ] Test homepage loads
- [ ] Test authentication flow (sign up/sign in)
- [ ] Test API endpoints
- [ ] Check database connection
- [ ] Verify environment variables are set
- [ ] Review build logs for warnings
- [ ] Test on mobile devices

### Smoke Tests

Run these tests after deployment:

#### 1. Authentication Test
```bash
# Visit your deployed URL
https://your-app.vercel.app/sign-up

# Create test account
# Verify redirect to dashboard
```

#### 2. API Test
```bash
# Test Cases API (replace with your domain)
curl https://your-app.vercel.app/api/cases \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Should return { cases: [], total: 0 }
```

#### 3. Database Test
```bash
# Check database connection via Drizzle Studio
# Run locally to verify production DB access
npm run db:studio
```

### Common Issues & Solutions

#### Build Failures

**Error**: `Module not found`
- **Solution**: Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error**: `Type errors during build`
- **Solution**: Run `npm run build` locally first
- Fix all TypeScript errors

#### Runtime Errors

**Error**: `Database connection failed`
- **Solution**: Verify DATABASE_URL is set correctly in Vercel
- Use pooler connection, not direct connection
- Check Supabase project is active

**Error**: `Clerk authentication not working`
- **Solution**: Verify all Clerk env vars are set
- Check Clerk dashboard for correct keys
- Ensure domain is whitelisted in Clerk settings

#### Performance Issues

**Slow API responses**
- Enable Vercel Analytics
- Check database query performance
- Consider adding indexes

**High cold start times**
- Use Vercel Edge Functions for critical paths
- Optimize bundle size

### Monitoring & Analytics

#### Vercel Analytics
```bash
# Add to next.config.js
module.exports = {
  experimental: {
    analytics: true,
  },
}
```

#### Sentry Error Tracking
```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard@latest -i nextjs
```

### Rollback Strategy

#### Quick Rollback
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

#### Git Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Vercel will auto-deploy the reverted version
```

### Production Best Practices

1. **Environment Separation**
   - Use separate Supabase projects for staging/production
   - Use separate Clerk applications for staging/production

2. **Database Backups**
   - Enable Supabase automatic backups
   - Test restore process

3. **Monitoring**
   - Set up Vercel Analytics
   - Configure error tracking (Sentry)
   - Monitor database performance

4. **Security**
   - Never commit .env files
   - Rotate secrets regularly
   - Use environment-specific keys

5. **CI/CD**
   - Set up GitHub Actions for automated testing
   - Require tests to pass before merge
   - Use preview deployments for PRs

### Scaling Considerations

#### Database
- Monitor connection pool usage
- Add indexes for slow queries
- Consider read replicas for high traffic

#### Application
- Use Vercel Edge Functions for dynamic content
- Implement caching strategies
- Optimize bundle size

---

## 📝 Deployment Checklist

- [ ] All tests passing (63/63)
- [ ] Code committed to GitHub
- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] Deployment successful
- [ ] Smoke tests passed
- [ ] Monitoring enabled
- [ ] Documentation updated

---

**Last Updated**: November 23, 2025
**Phase**: 1 (Database & Auth)
**Status**: Ready for Deployment

# Parency Legal - AI-Powered Evidence Management

A professional-grade evidence organization platform built for family law attorneys. Automate document classification, track discovery requests, and identify missing evidence using AI.

Built with Next.js 14, Tailwind CSS, ShadCN UI, Supabase, Drizzle ORM, Clerk authentication, and Stripe payments.

---

## 🎯 What is Parency Legal?

Parency Legal (MVP v1.0) is a desktop/web application that helps family law attorneys and paralegals:

- **Automate document organization** - AI-powered classification synced from Dropbox
- **Map documents to discovery requests** - Track which documents satisfy which RFPs/Interrogatories
- **Identify missing documents** - AI detects gaps in financial records and discovery responses
- **Structure parent-client evidence** - Integrate structured logs and incidents from the Parency Parent App

**Key Differentiator:** Unlike Dropbox alone, Parency Legal's AI understands family law discovery - it knows what bank statements look like, can detect missing months in financial records, and automatically maps documents to specific RFPs.

---

## 📋 Table of Contents
1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
   1. [Install Dependencies](#install-dependencies)
   2. [Configure Environment Variables](#configure-environment-variables)
   3. [Database Setup](#database-setup)
   4. [Run Locally](#run-locally)
4. [Project Structure](#project-structure)
5. [Deployment](#deployment)
6. [Development Roadmap](#development-roadmap)
7. [Troubleshooting](#troubleshooting)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router, React Server Components) |
| **Styling** | Tailwind CSS, ShadCN UI, Framer Motion |
| **Backend** | Supabase (PostgreSQL) with Drizzle ORM |
| **Auth** | Clerk |
| **Payments** | Stripe (subscription management) |
| **AI/ML** | OpenAI GPT-4 (document classification, gap detection) |
| **File Storage** | Supabase Storage (will integrate Dropbox sync) |
| **Background Jobs** | Inngest (planned for credit renewal, AI processing) |
| **Deployment** | Vercel |

---

## ✅ Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account (free tier works)
- **Clerk** account (free tier works)
- **Stripe** account (test mode for development)
- **OpenAI** API key (for AI features - coming soon)
- **Dropbox** Developer App (for file sync - coming soon)

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in all required variables:

```env
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Payment Provider
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_...

# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard

# Clerk Session Configuration (optional)
CLERK_COOKIE_DOMAIN=localhost
CLERK_SESSION_TOKEN_LEEWAY=5
CLERK_ROTATE_SESSION_INTERVAL=86400
```

**Important:** The app uses Zod validation and will fail at startup if required environment variables are missing or invalid.

### 3. Database Setup

Run Drizzle migrations to create database tables:

```bash
# Generate migration files (if schema changed)
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
├── app/
│   ├── (auth)/              # Authentication pages (login, signup)
│   ├── (marketing)/         # Public pages (landing, pricing)
│   ├── api/                 # API routes and webhooks
│   │   └── stripe/          # Stripe checkout and webhooks
│   ├── dashboard/           # Protected attorney dashboard
│   └── layout.tsx           # Root layout with auth initialization
├── components/
│   ├── ui/                  # ShadCN UI components
│   ├── utilities/           # Providers and helpers
│   └── [feature]/           # Feature-specific components
├── db/
│   ├── migrations/          # Drizzle ORM migrations
│   ├── queries/             # Database query functions
│   └── schema/              # Database schema definitions
├── lib/
│   ├── env.ts               # Environment variable validation (Zod)
│   ├── stripe.ts            # Stripe client initialization
│   └── utils.ts             # Utility functions
├── types/
│   └── domain.ts            # TypeScript domain type definitions
├── actions/                 # Server actions for data mutations
└── middleware.ts            # Clerk auth + webhook handling
```

---

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy!

**Important:** Set up Stripe webhooks in production:
- Go to Stripe Dashboard → Developers → Webhooks
- Add endpoint: `https://your-domain.com/api/stripe/webhooks`
- Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
- Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## 🗺 Development Roadmap

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Remove Whop payment provider
- [x] Set up Stripe-only payments
- [x] Add environment variable validation
- [x] Optimize database connection pooling
- [x] Rename project to Parency Legal

### 🚧 Phase 2: Core Fixes (IN PROGRESS)
- [ ] Centralize profile creation logic
- [ ] Add structured error logging
- [ ] Create TypeScript domain type definitions
- [ ] Set up usage tracking foundation

### 📅 Phase 3: Core Features (NEXT)
- [ ] Case management system
- [ ] Dropbox OAuth integration
- [ ] Document sync and storage
- [ ] AI document classification
- [ ] Discovery request management
- [ ] Missing document detection

### 📅 Phase 4: Advanced Features
- [ ] Parent App integration
- [ ] Case timeline view
- [ ] PDF export by category/request
- [ ] Search functionality
- [ ] Background jobs for credit renewal

---

## 🐛 Troubleshooting

### Environment Variable Errors

If you see errors like "Invalid environment variables", check:
1. All required variables are set in `.env.local`
2. Stripe keys start with correct prefixes (`sk_`, `whsec_`, `price_`)
3. Clerk keys start with correct prefixes (`pk_`, `sk_`)
4. Database URL is properly formatted

### Database Connection Issues

- Check your Supabase project is active
- Verify DATABASE_URL includes correct password
- Ensure connection pooling isn't exhausted (max 10 connections)

### Stripe Webhook Issues

- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhooks`
- Verify webhook secret matches in `.env.local`
- Check webhook logs in Stripe Dashboard

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙋 Support

For questions or issues:
- Check the [Troubleshooting](#troubleshooting) section
- Review existing GitHub issues
- Create a new issue with detailed description

Built for family law attorneys who need powerful, AI-driven evidence management.

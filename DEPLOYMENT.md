# Ledgerly - Comprehensive Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Git installed
- A GitHub account
- A Supabase account (free tier works)
- A Vercel account (free tier works)

---

## Part 1: Supabase Setup

### 1.1 Create Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Fill in:
   - **Organization**: Create new or select existing
   - **Project Name**: `ledgerly`
   - **Database Password**: Generate and save securely
   - **Region**: Choose closest to your users
4. Click **Create Project**
5. Wait 2-3 minutes for setup

### 1.2 Get API Keys

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: `eyJhbGci...`

### 1.3 Create `.env.local`

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 1.4 Run Database Migration

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Paste contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**

This creates:
- `profiles` table
- `categories` table
- `expenses` table
- `settings` table
- `exchange_rates` table
- Row Level Security policies
- Auto-seeding trigger for default categories

### 1.5 Create Storage Bucket (for avatars)

1. Go to **Storage** in Supabase dashboard
2. Click **New Bucket**
3. Name: `avatars`
4. Make it **Public**
5. Click **Create Bucket**

### 1.6 Create Test User (for seed data)

1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Email: `test@ledgerly.app`
4. Password: `TestPassword123!`
5. Click **Create User**

---

## Part 2: Local Development

### 2.1 Install Dependencies

```bash
npm install
```

### 2.2 Set Environment Variables

Ensure `.env.local` exists with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 2.3 Seed Database (Optional)

```bash
npm run seed
```

This creates:
- 10 expense categories
- 100 sample expenses over 90 days
- User settings (dark theme, KES base currency)

### 2.4 Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 2.5 Test the App

1. Register a new account (or use test credentials)
2. Login
3. Add expenses
4. View dashboard
5. Test settings
6. Test export

---

## Part 3: Vercel Deployment

### 3.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/ledgerly.git
git push -u origin main
```

### 3.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Select **Import Git Repository**
4. Select your `ledgerly` repo
5. Click **Import**

### 3.3 Configure Environment Variables

In Vercel project settings, add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key |

### 3.4 Deploy

1. Click **Deploy**
2. Wait 1-2 minutes
3. Your app is live at `https://ledgerly.vercel.app`

---

## Part 4: Custom Domain (Optional)

### 4.1 Add Domain in Vercel

1. Go to **Project Settings** → **Domains**
2. Enter your domain (e.g., `ledgerly.app`)
3. Click **Add**

### 4.2 Configure DNS

Add these DNS records at your registrar:

**For apex domain (ledgerly.app):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For subdomain (www.ledgerly.app):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4.3 Verify

1. Wait 5-10 minutes for DNS propagation
2. Vercel will auto-provision SSL
3. Visit your custom domain

---

## Part 5: Supabase Production Config

### 5.1 Update Auth Settings

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure:
   - ✅ Confirm email (disable for testing)
   - ✅ Secure password change
4. Add your production URL to **Site URL**

### 5.2 Update RLS Policies

Verify Row Level Security is enabled on all tables:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 5.3 Configure CORS

If needed, add your production domain to allowed origins:

1. Go to **Project Settings** → **API**
2. Add your domain to **Additional allowed CORS origins**

---

## Part 6: Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | App base URL | Auto-detected |
| `SEED_EMAIL` | Test user email for seeding | `test@ledgerly.app` |
| `SEED_PASSWORD` | Test user password for seeding | `TestPassword123!` |

---

## Part 7: Troubleshooting

### Build Errors

**Error: Module not found**
```bash
npm install
```

**Error: Supabase client error**
- Check `.env.local` exists
- Verify URL and key are correct
- Ensure no trailing slashes

### Runtime Errors

**Error: 401 Unauthorized**
- User not logged in
- Session expired
- Check Supabase auth settings

**Error: 403 Forbidden**
- RLS policy blocking access
- Check table policies in Supabase

### Performance Issues

**Slow initial load**
- Enable Vercel Analytics
- Check bundle size
- Consider lazy loading

**Database slow**
- Add indexes for frequently queried columns
- Check query performance in Supabase dashboard

---

## Part 8: Post-Deployment Checklist

- [ ] Supabase project created
- [ ] Database migration run
- [ ] Storage bucket created (avatars)
- [ ] Environment variables set in Vercel
- [ ] App deployed successfully
- [ ] Can register new user
- [ ] Can login
- [ ] Can add expense
- [ ] Can view dashboard
- [ ] Can export CSV/PDF
- [ ] PWA install prompt appears
- [ ] Custom domain configured (optional)
- [ ] SSL working

---

## Part 9: Ongoing Maintenance

### Database Backups

Supabase Pro plan includes daily backups. For free tier:
- Use `pg_dump` for manual backups
- Export via SQL Editor

### Monitoring

1. **Vercel Analytics**: Track performance
2. **Supabase Dashboard**: Monitor database
3. **Vercel Logs**: Check for errors

### Updates

```bash
# Update dependencies
npm update

# Check for security issues
npm audit

# Fix issues
npm audit fix
```

---

## Part 10: Cost Estimate

### Free Tier (Both Vercel + Supabase)

- **Vercel**: 100GB bandwidth, 1000 build minutes
- **Supabase**: 500MB database, 1GB storage, 50K monthly active users

### When to Upgrade

- **Supabase Pro** ($25/mo): When you need more storage or daily backups
- **Vercel Pro** ($20/mo): When you need more bandwidth or team features

---

## Quick Start Commands

```bash
# 1. Clone and install
git clone https://github.com/yourusername/ledgerly.git
cd ledgerly
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Seed database (optional)
npm run seed

# 4. Run locally
npm run dev

# 5. Deploy to Vercel
git push origin main
# Import in Vercel dashboard
```

---

## Support

- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)

---

*Last updated: July 2026*
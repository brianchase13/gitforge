# Supabase Setup Guide for GitForge

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: GitForge (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to you
4. Click "Create new project" and wait ~2 minutes

## Step 2: Get Your Credentials

1. In your Supabase dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Create .env.local

Create a file at `/Users/brianfarello/Desktop/gitforge/.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=GitForge
WEBHOOK_SECRET=generate-a-random-string-here
```

## Step 4: Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the ENTIRE contents of `/Users/brianfarello/Desktop/gitforge/supabase/schema.sql`
4. Paste and click "Run"

You should see "Success. No rows returned" - this is correct!

## Step 5: Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click "New Bucket"
3. Name it: `repositories`
4. **UNCHECK** "Public bucket" (it should be private)
5. Click "Create bucket"

Then add storage policies:

1. Click on the `repositories` bucket
2. Go to "Policies" tab
3. Click "New Policy" → "For full customization"
4. Add these policies:

**Policy 1: Authenticated users can upload**
- Name: `Authenticated users can upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition: `true`

**Policy 2: Owners can read their files**
- Name: `Users can read their repo files`
- Allowed operation: `SELECT`
- Target roles: `authenticated`
- Policy definition: `true`

**Policy 3: Owners can delete their files**
- Name: `Users can delete their repo files`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- Policy definition: `true`

## Step 6: Configure Authentication

1. Go to **Authentication → Providers**
2. Make sure "Email" is enabled
3. Optional: Enable GitHub OAuth
   - In GitHub: Settings → Developer settings → OAuth Apps → New
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase

## Step 7: Restart the Dev Server

```bash
# Kill existing server
pkill -f "next dev"

# Start fresh
cd /Users/brianfarello/Desktop/gitforge
npm run dev
```

## Step 8: Test!

1. Go to http://localhost:3000
2. Click "Sign up"
3. Create an account
4. You should be redirected to the dashboard!

---

## Troubleshooting

### "Invalid API key"
- Check that your .env.local has the correct keys
- Make sure there are no spaces or quotes around the values

### "relation does not exist"
- You need to run the schema.sql in the SQL Editor

### "new row violates row-level security policy"
- RLS is blocking the action - check the policies

### Auth not working
- Make sure Site URL is set in Supabase Auth settings
- Add `http://localhost:3000` to Redirect URLs

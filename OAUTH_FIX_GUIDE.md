# Google OAuth Redirect Fix Guide

## Problem
When signing in with Google, the app was redirecting to `http://localhost:3000/?code=...` instead of your production domain `https://shop.n8nfiroz.site`.

## Solution

### ✅ Code Changes Applied
1. **Updated `app/login/page.tsx`**:
   - Modified `handleSignUp` function to use `NEXT_PUBLIC_APP_URL` environment variable
   - Modified `handleGoogleSignIn` function to use `NEXT_PUBLIC_APP_URL` environment variable
   - Falls back to `window.location.origin` if environment variable is not set

2. **Updated `.env.local`**:
   - Added `NEXT_PUBLIC_APP_URL=https://shop.n8nfiroz.site`

3. **Created `.env.example`**:
   - Documented all required environment variables

### 🚨 CRITICAL: Supabase Dashboard Configuration Required

You **MUST** complete these steps in your Supabase Dashboard:

1. **Navigate to Supabase Dashboard**:
   - Go to https://app.supabase.com
   - Select your project (jwigpecorjxkqwkcctde)

2. **Update Authentication Settings**:
   - Go to **Authentication** → **URL Configuration**
   
3. **Add Redirect URLs**:
   - Add: `https://shop.n8nfiroz.site/auth/callback`
   - (Keep localhost for development): `http://localhost:3000/auth/callback`

4. **Set Site URL**:
   - Set Site URL to: `https://shop.n8nfiroz.site`

5. **Configure Google OAuth Provider** (if not already done):
   - Go to **Authentication** → **Providers** → **Google**
   - Ensure your Google Cloud Console OAuth 2.0 Client has:
     - **Authorized JavaScript origins**: 
       - `https://shop.n8nfiroz.site`
       - `http://localhost:3000` (for development)
     - **Authorized redirect URIs**: 
       - `https://jwigpecorjxkqwkcctde.supabase.co/auth/v1/callback`

### 📋 Deployment Checklist

When deploying to production (Vercel, Netlify, etc.):

1. **Add Environment Variable**:
   ```
   NEXT_PUBLIC_APP_URL=https://shop.n8nfiroz.site
   ```

2. **Also ensure these are set** (copy from .env.local):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://jwigpecorjxkqwkcctde.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **Redeploy** your application after adding environment variables

### 🧪 Testing

1. **Local Testing**:
   - Should still redirect to `http://localhost:3000/auth/callback`
   
2. **Production Testing**:
   - Should redirect to `https://shop.n8nfiroz.site/auth/callback`
   - After configuring Supabase dashboard settings

### 📝 How It Works

- The code now checks for `NEXT_PUBLIC_APP_URL` environment variable
- In development: Uses `window.location.origin` (localhost:3000)
- In production: Uses `NEXT_PUBLIC_APP_URL` (shop.n8nfiroz.site)
- This allows seamless OAuth flow in both environments

### ⚠️ Common Issues

**Issue**: Still redirecting to localhost
- **Solution**: Make sure you've:
  1. Added the environment variable to your hosting platform
  2. Redeployed the application
  3. Updated Supabase dashboard redirect URLs

**Issue**: "Invalid redirect URL" error
- **Solution**: Verify the redirect URL in Supabase matches exactly:
  - `https://shop.n8nfiroz.site/auth/callback` (no trailing slash)

**Issue**: Google OAuth error
- **Solution**: Check Google Cloud Console OAuth 2.0 Client settings include your domain

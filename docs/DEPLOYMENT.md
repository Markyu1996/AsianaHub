# Advance Hub — Deployment Guide (Render)

## Overview

This guide walks a non-developer through deploying Advance Hub to Render.
**Estimated time: 30–45 minutes.**

---

## Prerequisites

1. A [GitHub](https://github.com) account (free)
2. A [Render](https://render.com) account (free tier works)
3. A [Resend](https://resend.com) account for email (free tier: 100 emails/day)
4. Your project code (the `advance-hub` folder)

---

## Step 1: Push Code to GitHub

1. Go to [github.com](https://github.com) and sign in
2. Click **New repository** (the `+` button top-right)
3. Name it `advance-hub`, set it to **Private**, click **Create repository**
4. On your computer, open a terminal in the `advance-hub` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/advance-hub.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2: Create a Persistent Disk on Render

The SQLite database needs a persistent disk so it survives restarts.

1. Log in to [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub account if not already done
4. Select your `advance-hub` repository
5. On the configuration screen, scroll down to **Disks** (under Advanced)
6. Click **Add Disk**:
   - **Name:** `data`
   - **Mount Path:** `/data`
   - **Size:** 1 GB (free tier)
7. Continue to Step 3 before saving

---

## Step 3: Configure the Web Service

Fill in these settings on the Render web service form:

| Setting | Value |
|---|---|
| **Name** | `advance-hub` |
| **Region** | Singapore (or closest to your users) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm ci && npx prisma generate && npm run build` |
| **Start Command** | `npx prisma migrate deploy && tsx prisma/seed.ts && node .next/standalone/server.js` |
| **Instance Type** | Free (or Starter for better performance) |

---

## Step 4: Set Environment Variables

On the same page, scroll to **Environment Variables** and add:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `file:/data/advance.db` | Path on the persistent disk |
| `JWT_SECRET` | *(generate below)* | Long random string |
| `NEXT_PUBLIC_APP_URL` | `https://your-app-name.onrender.com` | Your Render URL |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | From Resend dashboard |
| `EMAIL_FROM` | `noreply@yourdomain.com` | Your verified email |
| `MAX_LOGIN_ATTEMPTS` | `5` | Lockout threshold |
| `RESET_TOKEN_EXPIRY_MINUTES` | `60` | Password reset expiry |
| `NODE_ENV` | `production` | |

### Generating JWT_SECRET

Run this in your terminal to generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as the `JWT_SECRET` value.

---

## Step 5: Setting Up Resend (Email)

1. Go to [resend.com](https://resend.com) and sign up
2. Click **API Keys** → **Create API Key**
3. Copy the key (starts with `re_`) and paste it as `RESEND_API_KEY`
4. For `EMAIL_FROM`, use `onboarding@resend.dev` on the free tier, or verify your own domain

---

## Step 6: Deploy

1. Click **Create Web Service** on Render
2. Render will start building — this takes 3–5 minutes
3. Watch the **Logs** tab for progress
4. When you see `✅ Starting application...` it is live

---

## Step 7: First Login

Once deployed, visit your Render URL (e.g. `https://advance-hub.onrender.com`)

**Default admin credentials:**
```
Email:    admin@advancehub.com
Password: Admin@1234!
```

⚠️ **You will be forced to change this password immediately on first login.**

---

## Step 8: Post-Deployment Checklist

- [ ] Log in with default admin and change password
- [ ] Register a test user account and approve it from the admin panel
- [ ] Submit a test advance request
- [ ] Verify email notifications work (approve a test registration)
- [ ] Note down your Render URL and share with staff

---

## Updating the Application

When you push new code to GitHub:

1. Render will automatically detect the change and redeploy
2. Database migrations run automatically on startup
3. No manual steps needed

---

## Troubleshooting

**App won't start — "DATABASE_URL" error**
→ Check that `DATABASE_URL` is set to `file:/data/advance.db` and the disk is mounted at `/data`

**Emails not sending**
→ Verify `RESEND_API_KEY` is correct and `EMAIL_FROM` matches a verified Resend sender

**"Module not found" errors during build**
→ Check the build logs. Usually means a dependency issue. Run `npm ci` locally and push again.

**Login says "account locked"**
→ Log in as admin → Users → find the user → Edit → the lock will be cleared by saving

---

## Free Tier Limitations

Render free tier spins down after 15 minutes of inactivity. First request after spin-down takes ~30 seconds.
For always-on performance, upgrade to **Starter ($7/month)**.

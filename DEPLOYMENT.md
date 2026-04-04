# Deployment Guide - MedSecure AI

## Step 1: Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub

2. Click **"New Project"** → **"Deploy from GitHub repo"**

3. Select the repository and set the **Root Directory** to `backend`

4. Railway will auto-detect Python and deploy

5. After deployment, go to **Settings** → **Networking** → **Generate Domain**

6. Copy the URL (e.g., `https://your-app.up.railway.app`)

## Step 2: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub

2. Click **"Add New"** → **"Project"**

3. Import your repository

4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add Environment Variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend.up.railway.app` (Railway URL from Step 1)

6. Click **Deploy**

## Step 3: Update ESP32 Firmware

Update `SERVER_URL` in your firmware to point to Railway backend:

```cpp
const char* SERVER_URL = "https://your-backend.up.railway.app";
```

## URLs After Deployment

- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-backend.up.railway.app`
- **API Docs**: `https://your-backend.up.railway.app/docs`

## Notes

- Railway free tier: 500 hours/month
- Vercel free tier: Unlimited for hobby projects
- Database (SQLite) is stored on Railway (will reset on redeploy - consider upgrading to PostgreSQL for production)

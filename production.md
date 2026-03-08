# Vercel Production Deployment Guide

This document outlines the steps to deploy the AI Agency Vibe Coding Dashboard to Vercel.

## Prerequisites
1. A GitHub account.
2. A Vercel account.
3. A Supabase project (for live database) or be okay with using the static CSV block (serverless functions have limited file system access, so Supabase is highly recommended).
4. A Gemini API key.

## 1. Push to GitHub
Make sure your project is pushed to a GitHub repository.

```bash
git remote add origin https://github.com/your-username/your-repo-name.git
git branch -M main
git push -u origin main
```

## 2. Import Project on Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import the GitHub repository for your dashboard.

## 3. Configure Environment Variables
During the import process, or via the **Settings -> Environment Variables** tab on Vercel, add the following variables:

- `DATA_SOURCE`: Set to `supabase` (Strongly recommended for Vercel vs using local CSV logic which might fail if Vercel doesn't bundle the CSV natively).
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_ANON_KEY`: Your Supabase anon public key.
- `NEXT_PUBLIC_GEMINI_API_KEY`: Your Gemini API key.

> **Note:** Even though Next.js doesn't natively use `VITE_`, if your `.env` relies on it, keep the name exactly as it works locally, or update the code to use standard environment variable naming if you refactored fully.

## 4. Deploy
1. Click **Deploy**.
2. Vercel will install dependencies, build the Next.js app, and deploy it.
3. Once the build is finished, click on the **Visit** button to view your live dashboard.

## 5. Verify the Dashboard
- **Data Load**: Check if the charts and data table populate correctly from Supabase.
- **AI Insights**: Click the Generate AI Strategy button to ensure the Gemini connection is successfully making API calls from your live serverless functions.

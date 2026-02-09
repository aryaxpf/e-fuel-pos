# Deployment Guide: E-Fuel POS

This guide will help you deploy your application to the internet so you can access it from your **Phone** or **Tablet**.

We will use **Vercel** (the creators of Next.js) because it is free, fast, and easiest to use.

## Prerequisites
1.  A [GitHub](https://github.com/) account.
2.  A [Vercel](https://vercel.com/) account (Login with GitHub).

## Step 1: Push Code to GitHub
You need to upload your code to GitHub first.

1.  Open your terminal/command prompt in the `e-fuel-pos` folder.
2.  Run these commands:
    ```bash
    git add .
    git commit -m "Final release for deployment"
    ```
3.  Go to [GitHub.com](https://github.com/new) and **Create a New Repository**.
    *   Name: `e-fuel-pos`
    *   Public/Private: **Private** (Recommended for business data).
4.  Copy the commands shown by GitHub to "push an existing repository". They look like this:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/e-fuel-pos.git
    git branch -M main
    git push -u origin main
    ```

## Step 2: Deploy to Vercel
1.  Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  You should see your `e-fuel-pos` repository from GitHub (**aryaxpf/e-fuel-pos**). Click **Import**.
4.  **Configure Project**:
    *   Framework Preset: `Next.js` (Auto-detected).
    *   Root Directory: `./` (Default).
    *   **Environment Variables** (CRITICAL):
        You MUST add these variables from your `.env.local` file for the database to work:
        *   `NEXT_PUBLIC_SUPABASE_URL`
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   **Sound File**: Ensure `success.mp3` is in your `public` folder before pushing.
5.  Click **Deploy**.

## Step 3: Production Database Setup (Supabase)
Since you are deploying to production, ensure your Supabase project is ready:

1.  **Table Policies (RLS)**:
    *   Ensure all RLS policies are applied (run `apply_phase_36.sql` in Supabase SQL Editor if you haven't).
    *   This protects your data from unauthorized access.

2.  **Storage Buckets**:
    *   Make sure the `attendance-photos` bucket is created and Public.
    *   Apply the storage policies from `storage_security.sql`.

3.  **Authentication**:
    *   Go to Supabase -> Authentication -> URL Configuration.
    *   Add your Vercel URL (e.g., `https://e-fuel-pos.vercel.app`) to **Site URL** and **Redirect URLs**.

## Step 4: Use the App
*   Wait about 1 minute for Vercel to build.
*   Your app will be live at `https://e-fuel-pos-aryap.vercel.app`.
*   **Open this link on your Mobile Phone**.
*   **Login**: Use your Admin (`admin`/`admin123`) or Cashier credentials.
*   **Data Sync**: Since we use Supabase, data is synchronized in real-time between your Laptop, Phone, and Tablet!

## Troubleshooting
*   **Build Error?**: Check the "Logs" tab in Vercel.
*   **Update App?**: Just `git commit` and `git push` again. Vercel automatically updates the website.


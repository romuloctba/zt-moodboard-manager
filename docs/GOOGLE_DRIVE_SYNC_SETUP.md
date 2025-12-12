# Google Drive Sync Setup Guide

This guide explains how to set up Google Drive synchronization for the Moodboard Manager app.

## Overview

The Cloud Sync feature allows users to synchronize their projects, characters, and images across multiple devices using Google Drive. Data is stored in a hidden app-specific folder that users cannot see in their regular Drive interface.

## Prerequisites

- A Google Cloud Platform account
- Your app deployed to a domain (for production) or running locally (for development)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project selector dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Moodboard Manager")
5. Click "Create"

## Step 2: Enable the Google Drive API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on it and then click **Enable**

## Step 3: Configure the OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace org)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Moodboard Manager
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**

### Add Scopes

1. Click **Add or Remove Scopes**
2. Search for and add:
   - `https://www.googleapis.com/auth/drive.appdata`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
3. Click **Update**, then **Save and Continue**

### Test Users (During Development)

While the app is in testing mode, you need to add test users:
1. Click **Add Users**
2. Enter the Gmail addresses of your testers
3. Click **Save and Continue**

> **Note**: Once you're ready for production, you'll need to submit the app for verification. For apps using only the `drive.appdata` scope, verification is usually quick.

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application** as the application type
4. Enter a name (e.g., "Moodboard Manager Web")

### Configure Authorized JavaScript Origins

Add all domains where your app will run:

**Development:**
```
http://localhost:3000
```

**Production:**
```
https://your-domain.com
https://www.your-domain.com
```

> **Note**: You do NOT need to add redirect URIs for this implementation as we use the Google Identity Services popup flow.

5. Click **Create**
6. Copy the **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)

## Step 5: Configure the App

### Local Development

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Client ID:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

### Production Deployment

Set the environment variable in your deployment platform:
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Build & Deploy → Environment
- **Other**: Consult your platform's documentation

## Step 6: Test the Integration

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Go to Settings → Cloud Sync

3. Click "Connect Google Drive"

4. Sign in with a test user account (one you added in Step 3)

5. Grant the requested permissions

6. You should see your account connected!

## Troubleshooting

### "Access blocked" Error

- Make sure your email is in the test users list
- Verify the OAuth consent screen is configured correctly

### "Invalid Origin" Error

- Check that your current URL is in the authorized JavaScript origins
- Remember: `http://localhost:3000` and `http://127.0.0.1:3000` are different origins

### "popup_closed_by_user" Error

- The user closed the popup before completing sign-in
- Try again and complete the authentication flow

### Sync Not Working

1. Check browser console for errors
2. Verify the Client ID is correct
3. Make sure the Drive API is enabled
4. Check that the required scopes are added

## Security Notes

- The app uses the `drive.appdata` scope, which only allows access to app-specific data, not the user's other files
- Access tokens are stored in localStorage (automatically refreshed)
- Users can revoke access at any time from their [Google Account Permissions](https://myaccount.google.com/permissions)

## Production Verification

Before launching publicly:

1. Go to **OAuth consent screen**
2. Click **Publish App**
3. If using non-sensitive scopes only (`drive.appdata`), verification is automatic
4. If using sensitive scopes, you'll need to submit for Google review

## Data Storage

Synced data is stored in the user's Google Drive in a hidden folder:
- Location: `Application Data/moodboard-sync/`
- Files include: projects JSON, character JSON, image metadata, and actual image files
- Users can see storage usage in their Google Drive settings but cannot browse the files directly

## Rate Limits

Google Drive API has usage quotas:
- **Queries per day**: 1,000,000,000
- **Queries per 100 seconds per user**: 1,000

For normal usage, these limits are more than sufficient. The app implements:
- Delta sync (only changed items)
- Reasonable sync intervals (minimum 5 minutes)
- Batching where possible

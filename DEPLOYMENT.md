# Netlify Deployment Guide - Tracker Nexus

I have refactored the project to be **deployment-ready** by fixing the build-time environment variable requirement.

## Steps to Deploy

### 1. Configure Environment Variables in Netlify
Before deploying, you **MUST** add your API keys to the Netlify Dashboard:
1.  Go to **Site Configuration > Environment variables**.
2.  Add:
    *   `OPENAI_API_KEY`
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `SUPABASE_SERVICE_ROLE_KEY`

### 2. Trigger Deployment
- If you are using GIt, simply push your changes.
- If you are using the CLI: `netlify deploy --build --prod`

### 3. Built-in Fix for Build Errors
The code has been updated to use a **lazy-initialization** pattern for the OpenAI client. This ensures that the build process will no longer fail if the API key is missing during the static analysis phase of the Next.js build.

## Path Simplified
The project has been successfully migrated to `/tracker-knowledgebase`.

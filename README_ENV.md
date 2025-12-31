# Environment Setup for Tracker Nexus

To run the knowledge base seeding script and the chat functionality, you need to set up a `.env.local` file in the root directory.

## Required Variables

Create a file named `.env.local` and add the following:

```env
# Supabase Configuration
# Get these from your Supabase Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Service Role Key for Seeding (DANGER: Keep secret!)
# Get this from Supabase Project Settings > API > service_role
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Configuration
# Get this from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...
```

## Running the Seeding Script

Once the environment variables are set, you can run the following command to ingest the documents:

```bash
npx tsx scripts/seed-knowledge.ts
```

This will:
1. Read all files in the `references/` folder.
2. Split them into chunks.
3. Generate vector embeddings using OpenAI (`text-embedding-3-small`).
4. Store them in the `documents` table in Supabase.
```

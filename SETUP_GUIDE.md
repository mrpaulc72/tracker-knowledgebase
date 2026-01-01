# Database Setup Instructions

The application errors ("Database Error: Could not find function...") are active because the Supabase database is missing the required schema and functions.

## How to Fix

1.  **Log in to Supabase:** Go to [supabase.com/dashboard](https://supabase.com/dashboard) and select your project (`tracker-knowledgebase` or similar).
2.  **Open SQL Editor:** Click on the **SQL Editor** icon in the left sidebar (it looks like a terminal `>_`).
3.  **New Query:** Click **"New Query"**.
4.  **Copy Script:** Copy the entire contents of the file `supabase_setup.sql` located in this project folder.
5.  **Run:** Paste the code into the SQL Editor and click **"Run"** (bottom right).
6.  **Verify:** You should see "Success. No rows returned."

## What this does
- Enables `vector` extension for AI search.
- Creates the `match_documents` function required by the AI.
- Sets up Security Policies (RLS) so the Ops Manual can actually read the data.

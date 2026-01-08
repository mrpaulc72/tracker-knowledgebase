# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Tracker Nexus is an internal AI-powered knowledge base platform for Tracker Products sales, support, and implementation teams. It provides RAG (Retrieval-Augmented Generation) capabilities to query product documentation, case studies, objection handling, and SOPs.

**Tech Stack:**
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui components
- **Backend:** Next.js API Routes (serverless)
- **Database:** Supabase (PostgreSQL + pgvector for vector search)
- **AI:** OpenAI SDK (GPT-4o/mini, embeddings), Groq SDK (Llama 3.3/Mixtral)
- **Document Processing:** mammoth (DOCX), pdf-parse (PDF)

## Development Commands

### Essential Commands
- **Dev Server:** `npm run dev` - Starts on http://localhost:3000
- **Build:** `npm run build` - Production build (requires all env vars)
- **Lint:** `npm run lint` - ESLint checks
- **Seed Knowledge Base:** `npx tsx scripts/seed-knowledge.ts` - Ingests files from `references/` into Supabase

### Environment Setup
Required environment variables (stored in `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENAI_API_KEY=<openai-key>
GROQ_API_KEY=<groq-key> # Optional
```

Before first run, execute the SQL in `supabase_setup.sql` via Supabase SQL Editor to:
- Enable pgvector extension
- Create `documents` table with embedding column
- Set up `match_documents()` function for similarity search
- Configure Row Level Security (RLS) policies

## Architecture

### Core Flow: RAG Pipeline
1. **Ingestion** (`src/lib/ingestion-service.ts`):
   - Accepts PDFs, DOCX, or text via API routes (`/api/ingest`, `/api/ingest/link`)
   - Extracts text → chunks (2000 chars, 200 overlap)
   - Generates embeddings via OpenAI `text-embedding-3-small`
   - Stores in Supabase `documents` table with metadata
   - Prevents duplicates by checking `metadata->source`

2. **Query** (`src/app/api/chat/route.ts`):
   - User message → embedding generation
   - Calls `match_documents(query_embedding, threshold, count)` to fetch relevant chunks
   - Constructs context from top 5 matches (similarity > 0.3)
   - Sends to OpenAI (GPT-4o/mini) or Groq (Llama/Mixtral) with system prompt
   - Returns answer with source citations

3. **UI Components:**
   - **The War Room** (`ChatInterface.tsx`) - AI chat with model selector
   - **Knowledge Factory** (`KnowledgeFactory.tsx`) - Document upload interface
   - **Ops Manual** (`OpsManual.tsx`) - Browse SOPs filtered by `metadata.type === 'sop'`

### Key Files
- **Client Initialization:** `src/lib/openai.ts`, `src/lib/groq.ts`, `src/lib/supabase.ts` use lazy initialization to prevent build failures when env vars are missing
- **Ingestion Service:** `src/lib/ingestion-service.ts` - Handles file processing, chunking, embedding
- **Database Schema:** `supabase_setup.sql` - Single `documents` table with vector column
- **Seed Script:** `scripts/seed-knowledge.ts` - Batch ingest from `references/` directory

### Data Flow
```
User Upload (PDF/DOCX) → /api/ingest → IngestionService
  → Text Extraction → Chunking → OpenAI Embeddings → Supabase Insert

User Query → /api/chat → Embedding → match_documents() → Context
  → LLM (OpenAI/Groq) → Response + Source Citations
```

## Brand Identity

When modifying UI components, adhere to Tracker Products brand:
- **Colors:** Deep Navy (#1C2A4B), Cincinnati Red (#BD3039), Sky Blue (#60B9D8), Amber Gold (#E8A600)
- **Typography:** Poppins (headers), Inter (body)
- **Product Name:** "SAFE by Tracker Products"
- **Design Motif:** Hexagonal grid background patterns

## RAG Guidelines

- Always include source citations in responses (format: `[Source: filename]`)
- Ground truth documents are in `references/` and `docs/`
- Tone: Professional, trustworthy, solution-oriented
- Lower similarity threshold (0.3) for better recall vs precision

## Common Tasks

### Adding New Documents
1. Place files in `references/` directory
2. Run: `npx tsx scripts/seed-knowledge.ts`
3. Or upload via "Knowledge Factory" tab in UI

### Testing RAG Quality
- Check `references/` files are properly chunked (inspect logs during seed)
- Query `/api/chat` and verify source citations match expected documents
- Adjust `match_threshold` in `src/app/api/chat/route.ts` if needed (default: 0.3)

### Deploying to Netlify
1. Push to git (auto-deploy) or run: `netlify deploy --build --prod`
2. Ensure all environment variables are set in Netlify Site Settings
3. Build succeeds even if API keys are missing (lazy client initialization)
4. See `DEPLOYMENT.md` for details

## Testing & Validation

No formal test suite exists yet. Manual validation:
1. Start dev server: `npm run dev`
2. Test ingestion via Knowledge Factory tab
3. Query uploaded docs via War Room chat
4. Verify source citations appear correctly
5. Check Supabase table has proper embeddings: `select id, metadata->>'source', embedding from documents limit 5;`

## MCP Configuration

### Supabase MCP Server
The project is configured to use the Supabase MCP server for AI-assisted database operations.

**Setup script:** `npx tsx scripts/check-supabase-storage.ts` - Verifies storage bucket and provides MCP configuration

**Recommended configuration for Warp:**
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=agtmqtquctjygzxuapzu&read_only=false"
    }
  }
}
```

See `MCP_SETUP.md` for detailed configuration, security best practices, and troubleshooting.

## Notes

- Deployment target is Netlify (see `netlify.toml`)
- Authentication is configured for `@trackerproducts.com` domain restriction (Supabase Auth)
- PDF files are also stored in Supabase Storage bucket `document-previews` for high-fidelity viewing
- Embeddings use OpenAI `text-embedding-3-small` (1536 dimensions)
- Chunk batch size is 50 to avoid OpenAI rate limits during ingestion
- Storage bucket `document-previews` is configured with public access for PDF previews

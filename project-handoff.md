# Project Handoff: Tracker Nexus (Knowledge Base)

## Status: Operational (Nexus 2.0)
The project has been successfully refactored from a broken state into a stable, multi-model RAG (Retrieval-Augmented Generation) application. It is currently deployed on Netlify and connected to Supabase.

## 1. Technical Architecture
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui.
- **Database**: Supabase (PostgreSQL) with `pgvector` for semantic search.
- **AI Intelligence**: 
  - **OpenAI**: Used for high-precision RAG answering and text embeddings (`text-embedding-3-small`).
  - **Groq**: Integrated for ultra-fast inference using Llama 3.3 70B and Mixtral 8x7B.
- **Parsing**: `mammoth` (DOCX), `pdf-parse` (PDF), and native text buffers.

## 2. Core Features
- **The War Room**: A chat-based search interface. It retrieves context from the Supabase vector store and provides cited answers (e.g., `[Source: document.docx]`). Includes a model selector to switch between OpenAI and Groq.
- **The Knowledge Factory**: A bulk ingestion portal. Supports dragging and dropping folders or multiple files. It handles chunking (2000 chars), batch embedding, and storage. **New**: Includes a searchable Library view and external link (Loom) ingestion support.
- **The Ops Manual**: A digital wiki for Standard Operating Procedures (SOPs). Fetches documents tagged with `type: sop` and renders them via Markdown. **New**: PDF SOPs now include a direct link to the original high-fidelity document in Supabase Storage.

## 3. Critical Fixes & Lessons Learned (Forensic Audit)
If picking up this project in a new environment, be aware of these past blockers:
- **Build-Time Client Trap**: Next.js 15 evaluates server modules during the build. We use a **Lazy-Initialization pattern** in `src/lib/openai.ts` and `src/lib/supabase.ts` to prevent the build from failing when API keys are missing.
- **Ingestion Timeouts**: Netlify functions have a default limit. We increased the timeout to **60 seconds** in `netlify.toml` and implemented **Batching** (50 chunks per OpenAI request).
- **PDF/Word Parsing**: Using `mammoth` (DOCX) and `pdf-parse` (PDF) for robust document handling.

## 4. Environment Variables (Netlify/Local)
Required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GROQ_API_KEY`

## 5. Deployment Guide
The site is deployed at: `https://tracker-knowledgebase.netlify.app`
**Deployment Breakthrough**: When CI failed, a manual deploy via `netlify deploy --build --prod` bypassed build-worker limitations.

## 6. Next Steps
- [x] Implement **Supabase Storage** for PDF previews (`document-previews` bucket).
- [x] Integrate **Supabase MCP** for AI-driven project management.
- [ ] Implement **Supabase Auth** with `@trackerproducts.com` domain restrictions.
- [x] Add **"Deep Search"** (Semantic Search) to the Ops Manual sidebar (Completed via multi-modal chat).
- [x] Implement batch folder ingestion for the Knowledge Factory.

## 7. Change Stacking & Push Policy
> [!IMPORTANT]
> To conserve Netlify deployment credits, **do not push to GitHub for every small change**. 
> Stacking changes locally and pushing only after major milestones or explicit requests is the preferred workflow.

---
**Handoff Update: v1.1.0**
- **Omnibus Support**: 100+ file extensions (Documents, Data, Media, CAD, Creative).
- **Robust PDF Strategy**: Soft-failure model that treats non-extractable PDFs as reference assets instead of throwing errors.
- **Visual Overhaul**: Context-aware UI icons and action buttons (WATCH, VIEW, OPEN).

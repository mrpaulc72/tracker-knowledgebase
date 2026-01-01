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
- **The Knowledge Factory**: A bulk ingestion portal. Supports dragging and dropping folders or multiple files. It handles chunking (2000 chars), batch embedding, and storage.
- **The Ops Manual**: A digital wiki for Standard Operating Procedures (SOPs). Fetches documents tagged with `type: sop` and renders them via Markdown.

## 3. Critical Fixes & Lessons Learned (Forensic Audit)
If picking up this project in a new environment, be aware of these past blockers:
- **Build-Time Client Trap**: Next.js 15 evaluates server modules during the build. We use a **Lazy-Initialization pattern** in `src/lib/openai.ts` and `src/lib/supabase.ts` to prevent the build from failing when API keys are missing.
- **Ingestion Timeouts**: Netlify functions have a default limit. We increased the timeout to **60 seconds** in `netlify.toml` and implemented **Batching** (50 chunks per OpenAI request) to prevent "Gateway Timeouts" (504) or "Server Errors" (500).
- **PDF Parsing Syntax**: The ESM version of `pdf-parse` has unique export requirements. We use a dynamic import in `ingestion-service.ts` to ensure compatibility with Next.js server-side rendering.
- **UI Height Constraints**: Replaced hardcoded `70vh` heights with flexible `min-h-[600px]` containers to prevent the chat window from being cut off on smaller screens.

## 4. Environment Variables (Netlify/Local)
Required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Used by Ingestion)
- `OPENAI_API_KEY`
- `GROQ_API_KEY` (For Groq models)

## 5. Deployment Guide
The site is deployed at: `https://tracker-knowledgebase.netlify.app`
**Deployment Breakthrough**: When automatic Git-based deploys failed due to build worker crashes, a **manual deploy** via `netlify deploy --build --prod` successfully pushed the pre-built `.next` bundle, bypassing CI limitations.

## 6. Future Integration: Call Analyzer
Tracker Nexus is designed to be the "Ground Truth" for the **Call Analyzer Automation**. The automation (built in n8n) can access the `documents` table in Supabase to:
1.  Verify if a salesperson's claims match the documentation.
2.  Grade sales calls based on accurate product knowledge stored in Nexus.
3.  Generate coaching reports linked directly to the Ops Manual.

## 7. Next Steps
- [ ] Implement **Supabase Auth** with `@trackerproducts.com` domain restrictions.
- [ ] Add "Deep Search" to the Ops Manual sidebar.
- [ ] Map the Call Analyzer n8n workflow to the Supabase Vector Store for real-time coaching.

---
**Handoff Complete.** Current Version: v1.0.6


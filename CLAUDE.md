# Tracker Nexus Project Context

## Commands
- Build: `npm run build`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Seed Data: `npx tsx scripts/seed-knowledge.ts`

## Tech Stack
- Frontend: Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Lucide React
- Backend/DB: Supabase (PostgreSQL + pgvector)
- AI: OpenAI SDK (GPT-4o/mini), Groq SDK (Llama/Mixtral)
- PDF/Word: mammoth, pdf-parse
- Auth: Supabase Auth (@trackerproducts.com domain restriction)

## Brand Identity
- **Primary Background/Nav**: Tracker Deep Navy (#1C2A4B)
- **Action/CTA Buttons**: Cincinnati Red (#BD3039)
- **Accents**: Tracker Sky Blue (#60B9D8), Amber Gold (#E8A600)
- **Typography**: Poppins (Headers/Serif), Inter (Body/Sans)
- **Motif**: Hexagonal grid patterns (bg-opacity 5%)
- **Product Name**: "SAFE by Tracker Products"

## RAG Guardrails
- Always cite specific source files (e.g., [Source: Agency Experiences - Forest Park PD]).
- Use text files in `references/` and `docs/` as ground truth.
- Tone: Professional, Trustworthy, Solution-Oriented.

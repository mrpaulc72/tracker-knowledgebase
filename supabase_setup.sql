-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your documents
create table if not exists documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536)
);

-- Enable Row Level Security (RLS)
alter table documents enable row level security;

-- Create a function to search for documents
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create an index for faster similarity search
create index if not exists documents_embedding_idx on documents using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- RLS POLICY: Allow anyone (anon + authenticated) to read documents
-- This is required for the Ops Manual to load SOPs
drop policy if exists "Allow public read access" on documents;
create policy "Allow public read access"
  on documents for select
  to anon, authenticated
  using (true);

-- RLS POLICY: Allow service_role to do everything (Insert/Update/Delete)
-- This is required for the ingestion API / seed scripts
drop policy if exists "Allow service_role full access" on documents;
create policy "Allow service_role full access"
  on documents
  to service_role
  using (true)
  with check (true);

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey || !openaiApiKey) {
    console.error('Missing environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY are set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

const REFERENCES_DIR = path.join(process.cwd(), 'references');

async function getEmbedding(text: string) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' '),
    });
    return response.data[0].embedding;
}

function chunkText(text: string, maxChars = 2000, overlap = 200): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        let endIndex = startIndex + maxChars;

        // If not at the end, try to find a newline or space to break at
        if (endIndex < text.length) {
            const nextNewline = text.lastIndexOf('\n', endIndex);
            if (nextNewline > startIndex + maxChars / 2) {
                endIndex = nextNewline;
            } else {
                const nextSpace = text.lastIndexOf(' ', endIndex);
                if (nextSpace > startIndex + maxChars / 2) {
                    endIndex = nextSpace;
                }
            }
        }

        chunks.push(text.slice(startIndex, endIndex).trim());
        startIndex = endIndex - overlap;

        // Ensure we don't get stuck in an infinite loop if overlap is too large or chunking fails
        if (startIndex >= text.length || endIndex >= text.length) break;
    }

    return chunks.filter(c => c.length > 0);
}

async function seed() {
    console.log('Starting knowledge base seeding...');

    const files = fs.readdirSync(REFERENCES_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.md'));

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const filePath = path.join(REFERENCES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const chunks = chunkText(content);
        console.log(`Split ${file} into ${chunks.length} chunks.`);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`  Vectorizing chunk ${i + 1}/${chunks.length}...`);

            try {
                const embedding = await getEmbedding(chunk);

                const { error } = await supabase
                    .from('documents')
                    .insert({
                        content: chunk,
                        embedding,
                        metadata: {
                            source: file,
                            chunk_index: i,
                            total_chunks: chunks.length
                        }
                    });

                if (error) {
                    console.error(`  Error inserting chunk ${i}:`, error.message);
                }
            } catch (err: any) {
                console.error(`  Error processing chunk ${i}:`, err.message);
            }
        }
    }

    console.log('Seeding complete!');
}

seed().catch(err => {
    console.error('Fatal error during seeding:', err);
    process.exit(1);
});

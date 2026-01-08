import { getOpenAIClient } from './openai';
import { getSupabaseAdmin } from './supabase';

export interface IngestionResult {
    success: boolean;
    documentId?: number;
    classification?: any;
    chunksCount?: number;
    error?: string;
}

export class IngestionService {
    static async ingestDocument(buffer: Buffer, fileName: string): Promise<IngestionResult> {
        try {
            console.log(`[Ingestion] Starting: ${fileName} (${buffer.length} bytes)`);

            // Check for existing document by source name to prevent duplicates
            const supabase = getSupabaseAdmin();
            const { data: existingDocs } = await supabase
                .from('documents')
                .select('id')
                .eq('metadata->>source', fileName)
                .limit(1);

            if (existingDocs && existingDocs.length > 0) {
                console.log(`[Ingestion] Skipping duplicate: ${fileName}`);
                return {
                    success: true,
                    error: 'ALREADY_EXISTS',
                    chunksCount: 0
                };
            }

            const extension = fileName.split('.').pop()?.toLowerCase();
            let text = '';

            // 0. Extract text based on file type
            try {
                if (extension === 'docx') {
                    console.log(`[Ingestion] Loading mammoth dynamically...`);
                    const mammoth = await import('mammoth');
                    console.log(`[Ingestion] Extracting DOCX via mammoth...`);
                    const docResult = await mammoth.extractRawText({ buffer });
                    text = docResult.value;
                } else if (extension === 'pdf') {
                    console.log(`[Ingestion] Loading pdf-parse dynamically...`);
                    try {
                        // Dynamically import pdf-parse
                        const { PDFParse } = await import('pdf-parse');
                        const parser = new (PDFParse as any)({ data: buffer });
                        const pdfResult = await parser.getText();
                        await parser.destroy();
                        text = pdfResult.text;
                    } catch (pdfErr: any) {
                        console.error(`[Ingestion] PDF extraction failed:`, pdfErr);
                        throw new Error(`PDF parse error: ${pdfErr.message}`);
                    }
                } else {
                    console.log(`[Ingestion] Treating as plain text...`);
                    text = buffer.toString('utf-8');
                }
            } catch (extError: any) {
                console.error(`[Ingestion] Text extraction failed for ${fileName}:`, extError);
                throw new Error(`Failed to extract text: ${extError.message}`);
            }

            if (!text || text.trim().length === 0) {
                throw new Error('Document appears to be empty or could not be read.');
            }

            // 1. Upload to Supabase Storage if it's a PDF for high-fidelity viewing
            let storageUrl = undefined;
            if (extension === 'pdf') {
                try {
                    const supabase = getSupabaseAdmin();
                    // Ensure bucket exists (ignore errors if it already does)
                    await supabase.storage.createBucket('document-previews', { public: true }).catch(() => { });

                    const path = `pdfs/${Date.now()}_${fileName}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('document-previews')
                        .upload(path, buffer, {
                            contentType: 'application/pdf',
                            upsert: true
                        });

                    if (uploadError) {
                        console.warn('[Ingestion] PDF upload failed, continuing with text only:', uploadError);
                    } else if (uploadData) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('document-previews')
                            .getPublicUrl(path);
                        storageUrl = publicUrl;
                        console.log(`[Ingestion] PDF stored at: ${storageUrl}`);
                    }
                } catch (storageErr) {
                    console.warn('[Ingestion] Storage logic failed:', storageErr);
                }
            }

            // 1b. Classify
            const classification = await this.classifyDocument(text, fileName);
            console.log(`[Ingestion] Classified: ${classification.type}`);

            // 2. Chunk
            const chunks = this.chunkText(text);
            console.log(`[Ingestion] Created ${chunks.length} chunks.`);

            if (chunks.length === 0) {
                throw new Error('No content chunks created after processing.');
            }

            // 3. Embed (Batch)
            let embeddings: number[][] = [];
            try {
                const openai = getOpenAIClient();
                console.log(`[Ingestion] Generating embeddings for ${chunks.length} chunks...`);

                // Process embeddings in smaller batches of 50 to avoid OpenAI or timeout limits
                const batchSize = 50;
                for (let i = 0; i < chunks.length; i += batchSize) {
                    const chunkBatch = chunks.slice(i, i + batchSize);
                    const embeddingResponse = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: chunkBatch.map(c => c.replace(/\n/g, ' ')),
                    });
                    embeddings.push(...embeddingResponse.data.map(d => d.embedding));
                }
                console.log(`[Ingestion] Generated ${embeddings.length} embeddings.`);
            } catch (aiError: any) {
                console.error('[Ingestion] OpenAI Embedding Error:', aiError);
                throw new Error(`AI Embedding failed: ${aiError.message}`);
            }

            // 4. Store (Batch)
            try {
                const supabase = getSupabaseAdmin();
                console.log('[Ingestion] Inserting into Supabase...');

                const rows = chunks.map((chunk, i) => ({
                    content: chunk,
                    metadata: {
                        ...classification,
                        source: fileName,
                        chunkIndex: i,
                        fileUrl: storageUrl
                    },
                    embedding: embeddings[i]
                }));

                const { error: insertError } = await supabase.from('documents').insert(rows);

                if (insertError) throw insertError;

                console.log(`[Ingestion] Success! Stored ${chunks.length} chunks for ${fileName}.`);
                return { success: true, chunksCount: chunks.length, classification };
            } catch (dbError: any) {
                console.error('[Ingestion] Supabase Insert Error:', dbError);
                throw new Error(`Database storage failed: ${dbError.message}`);
            }

        } catch (error: any) {
            console.error('[Ingestion] Critical Failure:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Ingests an external link (like Loom) with a summary.
     */
    static async ingestLink(title: string, summary: string, url: string): Promise<IngestionResult> {
        try {
            console.log(`[Ingestion] Starting Link: ${title} (${url})`);

            // Check for existing link title
            const supabase = getSupabaseAdmin();
            const { data: existing } = await supabase
                .from('documents')
                .select('id')
                .eq('metadata->>source', title)
                .limit(1);

            if (existing && existing.length > 0) {
                return { success: true, error: 'ALREADY_EXISTS', chunksCount: 0 };
            }

            // 1. Generate Embedding for the summary
            const openai = getOpenAIClient();
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: summary.replace(/\n/g, ' '),
            });
            const embedding = embeddingResponse.data[0].embedding;

            // 2. Store
            const { error: insertError } = await supabase.from('documents').insert({
                content: summary,
                metadata: {
                    type: 'Video Reference',
                    source: title,
                    url: url,
                    summary: summary,
                    tags: ['Video', 'Loom', 'Instructional'],
                    priority: 2
                },
                embedding
            });

            if (insertError) throw insertError;

            return { success: true, chunksCount: 1 };
        } catch (error: any) {
            console.error('[Ingestion] Link Failure:', error);
            return { success: false, error: error.message };
        }
    }

    private static async classifyDocument(content: string, fileName: string) {
        try {
            const openai = getOpenAIClient();
            const prompt = `Analyze the following document content and provide a classification in JSON format.
Include:
- type: (e.g., "Case Study", "Product Manual", "SOP", "Avatar Info", "Objection Handling")
- tags: Array of keywords (e.g., ["Cloud", "Security", "Law Enforcement"])
- summary: A 1-sentence summary of the content.
- priority: (1-5)

Document Name: ${fileName}
Content Snippet (first 4000 chars):
${content.slice(0, 4000)}

Return ONLY valid JSON.`;

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini', // Using mini for speed and cost
                messages: [
                    { role: 'system', content: 'You are a professional knowledge librarian for Tracker Products.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            });

            const result = JSON.parse(response.choices[0].message.content || '{}');
            return {
                type: result.type || 'General',
                tags: result.tags || ['Unclassified'],
                summary: result.summary || 'Content uploaded via Knowledge Factory.',
                priority: result.priority || 3
            };
        } catch (error) {
            console.error('[Ingestion] Classification failed, falling back to default:', error);
            return {
                type: 'General',
                tags: ['Unclassified'],
                summary: 'Content uploaded via Knowledge Factory.',
                priority: 3
            };
        }
    }

    private static chunkText(text: string, maxChars = 2000, overlap = 200): string[] {
        const chunks: string[] = [];
        let startIndex = 0;

        while (startIndex < text.length) {
            let endIndex = startIndex + maxChars;

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
            if (startIndex >= text.length || endIndex >= text.length) break;
        }

        return chunks.filter(c => c.length > 0);
    }
}

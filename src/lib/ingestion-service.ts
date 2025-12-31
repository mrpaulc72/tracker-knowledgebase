import { getOpenAIClient } from './openai';
import { getSupabaseAdmin } from './supabase';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export interface IngestionResult {
    success: boolean;
    documentId?: number;
    classification?: any;
    chunksCount?: number;
    error?: string;
}

export class IngestionService {
    /**
     * Automatically ingests, classifies, and embeds a document from a Buffer.
     */
    static async ingestDocument(buffer: Buffer, fileName: string): Promise<IngestionResult> {
        try {
            console.log(`[Ingestion] Starting process for ${fileName}...`);

            const extension = fileName.split('.').pop()?.toLowerCase();
            let content = '';

            // 0. Extract text based on file type
            if (extension === 'docx') {
                const docResult = await mammoth.extractRawText({ buffer });
                content = docResult.value;
            } else if (extension === 'pdf') {
                const parser = new PDFParse({ data: buffer });
                const pdfResult = await parser.getText();
                await parser.destroy();
                content = pdfResult.text;
            } else {
                // Treat as text (txt, md, json, ts, js, etc.)
                content = buffer.toString('utf-8');
            }

            if (!content || content.trim().length === 0) {
                throw new Error('Could not extract any text from the document.');
            }

            // Use lazy client initialization to prevent build errors
            const openai = getOpenAIClient();
            const supabaseAdmin = getSupabaseAdmin();

            // 1. Classify the document using AI
            const classification = await this.classifyDocument(content, fileName);
            console.log(`[Ingestion] Classified as: ${classification.type}`);

            // 2. Chunk the document
            const chunks = this.chunkText(content);
            console.log(`[Ingestion] Created ${chunks.length} chunks.`);

            // 3. Process each chunk (Embed and Upload)
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const embedding = await this.getEmbedding(chunk);

                const { error } = await supabaseAdmin
                    .from('documents')
                    .insert({
                        content: chunk,
                        embedding,
                        metadata: {
                            source: fileName,
                            chunk_index: i,
                            total_chunks: chunks.length,
                            ...classification
                        }
                    });

                if (error) throw new Error(`Supabase insert error: ${error.message}`);
            }

            return {
                success: true,
                classification,
                chunksCount: chunks.length
            };

        } catch (error: any) {
            console.error(`[Ingestion] Failed for ${fileName}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    private static async classifyDocument(content: string, fileName: string) {
        const openai = getOpenAIClient();
        const prompt = `Analyze the following document content and provide a classification in JSON format.
Include:
- type: (e.g., "Case Study", "Product Manual", "SOP", "Avatar Info", "Objection Handling", "Source Code", "Configuration")
- tags: Array of keywords (e.g., ["Cloud", "Security", "Law Enforcement", "React", "NodeJS"])
- summary: A 1-sentence summary of the content.
- priority: (1-5)

Document Name: ${fileName}
Extension: ${fileName.split('.').pop()?.toLowerCase()}
Content Snippet (first 4000 chars):
${content.slice(0, 4000)}

Return ONLY valid JSON.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: 'You are a professional knowledge librarian.' }, { role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        return result;
    }

    private static async getEmbedding(text: string) {
        const openai = getOpenAIClient();
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text.replace(/\n/g, ' '),
        });
        return response.data[0].embedding;
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

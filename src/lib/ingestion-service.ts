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

            const extension = fileName.split('.').pop()?.toLowerCase() || '';
            let text = '';
            let isMedia = false;

            // 0. Extract text based on file type
            try {
                const textExtensions = [
                    'txt', 'md', 'mdx', 'json', 'yaml', 'yml', 'xml', 'html', 'htm', 'xhtml',
                    'css', 'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'php', 'sh', 'sql', 'java',
                    'cpp', 'c', 'h', 'cs', 'rs', 'go', 'kt', 'env', 'ini', 'cfg', 'conf', 'log',
                    'rtf', 'tex', 'rst', 'srt', 'vtt', 'sub', 'sbv', 'nfo', 'asc', 'sig'
                ];

                const imageExtensions = [
                    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'svg', 'ico', 'icns',
                    'cur', 'tif', 'tiff', 'eps', 'ai', 'ps', 'cdr', 'emf', 'wmf'
                ];

                const mediaExtensions = [
                    'mp4', 'm4v', 'mov', 'avi', 'wmv', 'mkv', 'webm', 'flv', 'mpeg', 'mpg',
                    'ogv', '3gp', '3g2', 'mts', 'm2ts', 'vob', 'mp3', 'wav', 'aac', 'm4a',
                    'flac', 'ogg', 'oga', 'wma', 'aif', 'aiff', 'opus'
                ];

                const spreadsheetExtensions = ['xlsx', 'xls', 'xlsm', 'xltx', 'ods', 'csv', 'tsv', 'psv'];

                const documentExtensions = ['docx', 'dotx', 'doc', 'dot', 'odt', 'ott', 'pages', 'rtf'];

                const presentationExtensions = ['pptx', 'ppt', 'pps', 'ppsx', 'odp', 'key'];

                const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'iso', 'img', 'dmg'];

                const projectExtensions = [
                    'psd', 'psb', 'indd', 'indm', 'idml', 'prproj', 'aep', 'aepx', 'sesx', 'fla', 'swf',
                    'dwg', 'dxf', 'step', 'stp', 'stl', 'obj', 'blend', 'skp', 'fbx', 'max', '3ds'
                ];

                if (documentExtensions.includes(extension)) {
                    console.log(`[Ingestion] Loading mammoth dynamically for ${extension}...`);
                    const mammoth = await import('mammoth');
                    try {
                        const docResult = await mammoth.extractRawText({ buffer });
                        text = docResult.value;
                    } catch (mErr) {
                        console.warn(`[Ingestion] Mammoth failed for ${extension}, trying text fallback`);
                        text = buffer.toString('utf-8');
                    }
                } else if (extension === 'pdf') {
                    console.log(`[Ingestion] Extracting PDF...`);
                    try {
                        // Correct pdf-parse usage: handle both ESM and CJS shapes
                        const pdfModule = await import('pdf-parse');
                        const pdf = (pdfModule as any).default || pdfModule;

                        const pdfResult = await pdf(buffer);
                        text = pdfResult.text;

                        if (!text || text.trim().length < 5) {
                            console.log(`[Ingestion] PDF text extraction yielded very little content. Treating as reference/image PDF.`);
                            isMedia = true;
                            text = `PDF Document (Reference): ${fileName}. Content appears to be image-based or protected. Use the link to view the original file.`;
                        }
                    } catch (pdfErr: any) {
                        console.error(`[Ingestion] PDF extraction failed:`, pdfErr);
                        // Strategic Fallback: Instead of throwing, we treat it as a media/reference file
                        isMedia = true;
                        text = `PDF Document (Reference): ${fileName}. Note: Automated text extraction failed (${pdfErr.message}). You can still access this file via the direct link in citations.`;
                    }

                } else if (spreadsheetExtensions.includes(extension)) {
                    console.log(`[Ingestion] Extracting Spreadsheet...`);
                    const XLSX = await import('xlsx');
                    const workbook = XLSX.read(buffer, { type: 'buffer' });
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        text += `\n--- Sheet: ${sheetName} ---\n`;
                        text += XLSX.utils.sheet_to_csv(sheet);
                    });
                } else if (imageExtensions.includes(extension)) {
                    isMedia = true;
                    text = `Image file: ${fileName}. Use the linked asset to view. Description: ${extension.toUpperCase()} graphic.`;
                } else if (mediaExtensions.includes(extension)) {
                    isMedia = true;
                    text = `Audio/Video file: ${fileName}. Use the linked asset to play. Format: ${extension.toUpperCase()}.`;
                } else if (textExtensions.includes(extension)) {
                    console.log(`[Ingestion] Reading as text...`);
                    text = buffer.toString('utf-8');
                } else if (archiveExtensions.includes(extension) || projectExtensions.includes(extension)) {
                    isMedia = true;
                    text = `Reference/Archive file: ${fileName}. Format: ${extension.toUpperCase()}. Stored for download and metadata lookup.`;
                } else {
                    console.log(`[Ingestion] Defaulting to text for unknown extension: ${extension}`);
                    text = buffer.toString('utf-8');
                }
            } catch (extError: any) {
                console.error(`[Ingestion] Text extraction failed for ${fileName}:`, extError);
                // Final safety net: If anything crashes during extraction, don't block the whole upload
                isMedia = true;
                text = `Reference asset: ${fileName}. Support for this file type is limited or the file is corrupted. Content: ${extError.message}`;
            }



            if (!isMedia && (!text || text.trim().length === 0)) {
                throw new Error('Document appears to be empty or could not be read.');
            }

            // 1. Upload to Supabase Storage if it's a "displayable" or "reference" file
            let storageUrl = undefined;
            const storableTypes = [
                'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'wav', 'mov', 'mp3',
                'docx', 'xlsx', 'csv', 'pptx', 'zip', 'rar', '7z', 'psd', 'ai', 'dwg', 'dxf',
                'stl', 'obj', 'blend', 'heic', 'svg', 'ico', 'm4v', 'avi', 'wmv', 'mkv', 'webm',
                'exe', 'dmg', 'pkg', 'apk'
            ];

            if (storableTypes.includes(extension) || isMedia) {

                try {
                    const supabase = getSupabaseAdmin();
                    await supabase.storage.createBucket('document-previews', { public: true }).catch(() => { });

                    const path = `${extension}s/${Date.now()}_${fileName}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('document-previews')
                        .upload(path, buffer, {
                            contentType: this.getMimeType(extension),
                            upsert: true
                        });

                    if (uploadError) {
                        console.warn(`[Ingestion] ${extension} upload failed, continuing with text/metadata only:`, uploadError);
                    } else if (uploadData) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('document-previews')
                            .getPublicUrl(path);
                        storageUrl = publicUrl;
                        console.log(`[Ingestion] File stored at: ${storageUrl}`);
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
                        fileUrl: storageUrl,
                        type: isMedia ? 'Media' : classification.type,
                        extension: extension
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

    private static getMimeType(extension: string): string {
        const mimes: Record<string, string> = {
            // Documents
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'odt': 'application/vnd.oasis.opendocument.text',
            'ods': 'application/vnd.oasis.opendocument.spreadsheet',
            'odp': 'application/vnd.oasis.opendocument.presentation',
            'csv': 'text/csv',
            'tsv': 'text/tab-separated-values',
            'txt': 'text/plain',
            'md': 'text/markdown',
            'json': 'application/json',
            'xml': 'application/xml',

            // Images
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'ico': 'image/x-icon',
            'heic': 'image/heic',
            'tif': 'image/tiff',
            'tiff': 'image/tiff',
            'bmp': 'image/bmp',

            // Audio
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'm4a': 'audio/mp4',
            'aac': 'audio/aac',
            'oga': 'audio/ogg',
            'flac': 'audio/flac',

            // Video
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'm4v': 'video/x-m4v',
            'avi': 'video/x-msvideo',
            'wmv': 'video/x-ms-wmv',
            'mkv': 'video/x-matroska',
            'webm': 'video/webm',

            // Archives
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            '7z': 'application/x-7z-compressed',
            'tar': 'application/x-tar',

            // Project Files
            'psd': 'image/vnd.adobe.photoshop',
            'dwg': 'image/vnd.dwg',
            'skp': 'application/vnd.sketchup.skp'
        };
        return mimes[extension] || 'application/octet-stream';
    }
}


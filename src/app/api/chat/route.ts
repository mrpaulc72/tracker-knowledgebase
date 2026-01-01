import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { getSupabase } from '@/lib/supabase';

export const maxDuration = 60; // Allow up to 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { messages, model = 'gpt-4o' } = await req.json();

        const lastMessage = messages[messages.length - 1].content;

        // Use lazy client initialization to prevent build errors
        const openai = getOpenAIClient();
        const supabase = getSupabase();

        // 1. Generate embedding for the user query
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: lastMessage.replace(/\n/g, ' '),
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 2. Query Supabase for relevant documents
        const { data: documents, error: matchError } = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: 0.3, // Lowered threshold for better recall
            match_count: 5,
        });

        if (matchError) {
            console.error('Supabase error:', matchError);
            return NextResponse.json({ error: `Database Error: ${matchError.message}` }, { status: 500 });
        }

        // 3. Construct context from retrieved documents
        const contextText = documents && documents.length > 0
            ? documents.map((doc: any) => `[Source: ${doc.metadata.source}]\n${doc.content}`).join('\n\n---\n\n')
            : 'No specific internal documents found for this query.';

        // 4. Determine System Prompt
        const systemPrompt = `You are "Tracker Nexus AI", a highly efficient assistant for the Tracker Products team. 
Use the following pieces of retrieved context to answer the user's question.
If you don't know the answer based on the context, say that you don't know, but try to be as helpful as possible using the specialized internal knowledge provided.
Always cite your sources using the [Source: filename] format.

Context:
${contextText}`;

        // Use OpenAI
        const response = await openai.chat.completions.create({
            model: model, // 'gpt-4o' or 'gpt-4o-mini'
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.5,
        });
        
        const content = response.choices[0]?.message?.content || '';

        return NextResponse.json({
            content,
            sources: documents?.map((doc: any) => doc.metadata.source) || []
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({
            error: error.message || 'Internal server error',
        }, { status: 500 });
    }
}

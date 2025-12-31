import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { messages, mode } = await req.json();
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
            match_threshold: 0.5,
            match_count: 5,
        });

        if (matchError) {
            console.error('Supabase error:', matchError);
            return NextResponse.json({ error: 'Failed to retrieve context' }, { status: 500 });
        }

        // 3. Construct context from retrieved documents
        const contextText = documents
            ?.map((doc: any) => `[Source: ${doc.metadata.source}]\n${doc.content}`)
            .join('\n\n---\n\n');

        // 4. Determine System Prompt based on Mode
        let systemPrompt = `You are "Tracker Nexus AI", a highly efficient assistant for the Tracker Products team. 
Use the following pieces of retrieved context to answer the user's question.
If you don't know the answer based on the context, say that you don't know, but try to be as helpful as possible using the specialized internal knowledge provided.
Always cite your sources using the [Source: filename] format.

Context:
${contextText}`;

        if (mode === 'roleplay') {
            systemPrompt = `You are a skeptical, tough, but realistic prospect evaluating Tracker Products. 
The user is a sales rep trying to alleviate your concerns.
Use the context below to find REASONS to be skeptical or DETAILS to challenge them on, but do NOT simply repeat the context.
Challenge the user. Be concise. Do not helpful. Make them earn your business.
If the context contains a rebuttal, act AS IF you are the person claiming the objection that the rebuttal addresses.

Context:
${contextText}`;
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.7,
        });

        return NextResponse.json({
            content: response.choices[0].message.content,
            sources: documents?.map((doc: any) => doc.metadata.source)
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

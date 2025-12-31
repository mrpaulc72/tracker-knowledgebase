import { NextResponse } from 'next/server';
import { IngestionService } from '@/lib/ingestion-service';

export async function POST(req: Request) {
    try {
        const { content, fileName } = await req.json();

        if (!content || !fileName) {
            return NextResponse.json({ error: 'Missing content or fileName' }, { status: 400 });
        }

        const result = await IngestionService.ingestDocument(content, fileName);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[Ingest API] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

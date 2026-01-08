import { NextRequest, NextResponse } from 'next/server';
import { IngestionService } from '@/lib/ingestion-service';

export async function POST(req: NextRequest) {
    try {
        const { title, summary, url } = await req.json();

        if (!title || !summary || !url) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await IngestionService.ingestLink(title, summary, url);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Link Ingest API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

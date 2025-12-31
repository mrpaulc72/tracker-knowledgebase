import { NextResponse } from 'next/server';
import { IngestionService } from '@/lib/ingestion-service';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Missing file' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await IngestionService.ingestDocument(buffer, file.name);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[Ingest API] error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

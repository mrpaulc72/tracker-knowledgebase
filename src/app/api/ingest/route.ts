import { NextResponse } from 'next/server';
import { IngestionService } from '@/lib/ingestion-service';

export const maxDuration = 300; // Allow up to 5 minutes for larger files
export const dynamic = 'force-dynamic';

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
            console.error('[Ingest API] Ingestion failed:', result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Ingestion API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error', details: error.toString() },
            { status: 500 }
        );
    }
}

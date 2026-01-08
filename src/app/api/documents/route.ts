import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getSupabaseAdmin();

        // Fetch sources and their metadata
        const { data, error } = await supabase
            .from('documents')
            .select('metadata')
            .not('metadata', 'is', null);

        if (error) throw error;

        // Group by source to get unique documents with their latest metadata
        const uniqueDocs = Object.values((data || []).reduce((acc: any, item: any) => {
            const meta = item.metadata || {};
            const source = meta.source;
            if (source && (!acc[source] || meta.chunkIndex === 0)) {
                acc[source] = {
                    source,
                    type: meta.type || 'General',
                    url: meta.url,
                    fileUrl: meta.fileUrl
                };
            }
            return acc;
        }, {}));

        // Sort by source name
        uniqueDocs.sort((a: any, b: any) => a.source.localeCompare(b.source));

        return NextResponse.json({ sources: uniqueDocs });

    } catch (error: any) {
        console.error('[Documents API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch document library', details: error.message },
            { status: 500 }
        );
    }
}

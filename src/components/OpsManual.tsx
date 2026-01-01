'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Book, Search, FileText, ChevronRight, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Mock Data for "Seed" functionality
const MOCK_SOPS = [
    {
        content: `# How to Handle Refunds

**Effective Date:** 2024-01-01
**Department:** Customer Success

## Overview
Refunds should be processed within 24 hours of approval.

### Steps
1. Log into Stripe.
2. Find the customer by email.
3. Click "Refund Payment".
4. Select "Requested by Customer" as the reason.

> [!NOTE]
> Refunds over $500 require Manager approval.
`,
        metadata: {
            source: 'refund-process.md',
            type: 'sop',
            title: 'How to Handle Refunds',
            category: 'Finance'
        }
    },
    {
        content: `# Escalation Policy

**Severity Levels:**

- **Sev 1:** System Down. Call Engineering Lead immediately.
- **Sev 2:** Feature Broken. Slack #engineering-urgent.
- **Sev 3:** Minor Bug. File a Jira ticket.

## Contact List
- Paul (CTO): 555-0123
- Sarah (Eng Lead): 555-0124
`,
        metadata: {
            source: 'escalation-policy.md',
            type: 'sop',
            title: 'Escalation Policy',
            category: 'Engineering'
        }
    }
];

export default function OpsManual() {
    const [sops, setSops] = useState<any[]>([]);
    const [selectedSop, setSelectedSop] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [supabase, setSupabase] = useState<any>(null);

    useEffect(() => {
        const client = getSupabase();
        setSupabase(client);
        if (client) {
            fetchSops(client);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchSops = async (client: any) => {
        if (!client) return;
        setIsLoading(true);
        try {
            // Fetch all documents. We'll filter for SOPs in-memory for better flexibility with case-sensitivity
            const { data, error } = await client
                .from('documents')
                .select('*');

            if (error) throw error;
            
            // Filter for type === 'sop' or 'SOP'
            const sopData = (data || []).filter((doc: any) => 
                doc.metadata?.type?.toLowerCase() === 'sop'
            );
            
            setSops(sopData);

            // Select first SOP by default if available
            if (sopData.length > 0 && !selectedSop) {
                setSelectedSop(sopData[0]);
            }
        } catch (err) {
            console.error('Error fetching SOPs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const seedMockData = async () => {
        if (!supabase) {
            alert('Supabase client not initialized. Check environment variables.');
            return;
        }
        setIsLoading(true);
        try {
            const dummyEmbedding = new Array(1536).fill(0.01);

            for (const doc of MOCK_SOPS) {
                await supabase.from('documents').insert({
                    content: doc.content,
                    metadata: doc.metadata,
                    embedding: dummyEmbedding
                });
            }
            await fetchSops(supabase);
            alert('Mock SOPs seeded!');
        } catch (err) {
            console.error('Error seeding data:', err);
            alert('Failed to seed data. Check console.');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter and Group SOPs
    const filteredSops = sops.filter(sop =>
        sop.metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sop.metadata?.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedSops = filteredSops.reduce((acc, sop) => {
        const category = sop.metadata.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(sop);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="flex h-[75vh] min-h-[600px] border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Sidebar */}
            <div className="w-1/3 border-r border-zinc-200 bg-zinc-50 flex flex-col">
                <div className="p-4 border-b border-zinc-200">
                    <h2 className="font-semibold text-tracker-navy mb-2 flex items-center gap-2">
                        <Book className="w-4 h-4" /> Ops Manual
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search SOPs..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tracker-navy/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="p-4 text-center text-zinc-400 text-sm">Loading...</div>
                    ) : Object.keys(groupedSops).length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-zinc-400 text-sm mb-4">No SOPs found.</p>
                            <button
                                onClick={seedMockData}
                                className="flex items-center gap-2 mx-auto px-4 py-2 bg-tracker-navy/10 text-tracker-navy text-xs rounded-full hover:bg-tracker-navy/20 transition-colors"
                            >
                                <PlusCircle className="w-3 h-3" /> Seed Mock Data
                            </button>
                        </div>
                    ) : (
                        Object.entries(groupedSops).map(([category, items]) => (
                            <div key={category} className="mb-4">
                                <h3 className="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    {category}
                                </h3>
                                <div className="space-y-0.5">
                                    {(items as any[]).map((sop: any) => (
                                        <button
                                            key={sop.id}
                                            onClick={() => setSelectedSop(sop)}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${selectedSop?.id === sop.id
                                                ? 'bg-tracker-navy text-white shadow-sm'
                                                : 'text-zinc-700 hover:bg-zinc-200'
                                                }`}
                                        >
                                            <FileText className={`w-3.5 h-3.5 ${selectedSop?.id === sop.id ? 'opacity-100' : 'opacity-50'}`} />
                                            <span className="truncate">{sop.metadata.title || 'Untitled SOP'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white overflow-y-auto">
                {selectedSop ? (
                    <div className="p-8 max-w-3xl mx-auto">
                        <div className="mb-6 pb-6 border-b border-zinc-100">
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                                <span>{selectedSop.metadata.category || 'General'}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span>Last updated today</span>
                            </div>
                            <h1 className="text-3xl font-bold text-tracker-navy tracking-tight">
                                {selectedSop.metadata.title}
                            </h1>
                        </div>

                        <article className="prose prose-zinc prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-a:text-tracker-blue prose-blockquote:border-l-4 prose-blockquote:border-tracker-navy/30 prose-blockquote:bg-zinc-50 prose-blockquote:py-1 prose-blockquote:px-4 max-w-none">
                            <ReactMarkdown>
                                {selectedSop.content}
                            </ReactMarkdown>
                        </article>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                        <Book className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select an SOP from the sidebar to view details.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

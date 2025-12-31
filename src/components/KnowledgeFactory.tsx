'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText, Tags, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngestionStats {
    type: string;
    tags: string[];
    summary: string;
    priority: number;
}

export default function KnowledgeFactory() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [stats, setStats] = useState<IngestionStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            const content = await file.text();
            const response = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    fileName: file.name
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setStats(data.classification);
            setFile(null);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <Card className="border-tracker-navy/10 shadow-lg overflow-hidden">
                <CardHeader className="bg-tracker-navy/5 border-b border-tracker-navy/5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-tracker-navy text-white">
                            <Upload className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold text-tracker-navy">Knowledge Factory</CardTitle>
                            <CardDescription>
                                Upload documents to automatically classify, tag, and add them to the Nexus intelligence.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8">
                    <div
                        className={cn(
                            "relative border-2 border-dashed rounded-xl p-12 transition-all flex flex-col items-center justify-center gap-4",
                            file ? "border-tracker-blue bg-tracker-blue/5" : "border-zinc-200 hover:border-tracker-blue/50 bg-zinc-50/50"
                        )}
                    >
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                            accept=".txt,.md"
                        />
                        {file ? (
                            <>
                                <FileText className="w-12 h-12 text-tracker-blue" />
                                <div className="text-center">
                                    <p className="text-sm font-bold text-tracker-navy">{file.name}</p>
                                    <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-4 rounded-full bg-white shadow-sm">
                                    <Upload className="w-8 h-8 text-zinc-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-tracker-navy">Click or drag & drop to upload</p>
                                    <p className="text-xs text-zinc-500 mt-1">Supports Markdown and Text files</p>
                                </div>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-3 text-sm font-medium border border-destructive/20">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {stats && (
                        <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <h3 className="font-bold text-tracker-navy">Ingestion Successful</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-zinc-50 border border-tracker-navy/5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        <Tags className="w-3 h-3" />
                                        Classification
                                    </div>
                                    <div>
                                        <Badge className="bg-tracker-navy text-white hover:bg-tracker-navy">
                                            {stats.type}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {stats.tags.map((tag, i) => (
                                            <Badge key={i} variant="outline" className="text-[10px] bg-white border-tracker-blue/20 text-tracker-blue">
                                                #{tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-zinc-50 border border-tracker-navy/5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        <Info className="w-3 h-3" />
                                        AI Summary
                                    </div>
                                    <p className="text-sm text-tracker-navy font-medium leading-relaxed">
                                        {stats.summary}
                                    </p>
                                    <div className="pt-2 flex items-center gap-2">
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase">Priority</div>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((p) => (
                                                <div
                                                    key={p}
                                                    className={cn(
                                                        "w-4 h-1 rounded-full",
                                                        p <= stats.priority ? "bg-tracker-gold" : "bg-zinc-200"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="bg-zinc-50/50 border-t border-tracker-navy/5 p-6 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Safe Environment • Ingestion Mode
                    </p>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="bg-tracker-navy hover:bg-tracker-navy/90 text-white gap-2 px-8 min-w-[140px]"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Ingest Document
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

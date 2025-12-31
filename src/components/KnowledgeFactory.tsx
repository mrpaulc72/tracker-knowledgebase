'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, Upload, CheckCircle2, AlertCircle, FileText,
    Tags, Info, X, FolderOpen, FileCode, Check, Trash2,
    FileDigit, FileJson, Clock, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QueuedFile {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'success' | 'error';
    error?: string;
    classification?: {
        type: string;
        tags: string[];
        summary: string;
        priority: number;
    };
}

export default function KnowledgeFactory() {
    const [queue, setQueue] = useState<QueuedFile[]>([]);
    const [isIngesting, setIsIngesting] = useState(false);
    const [envStatus, setEnvStatus] = useState({
        supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Filter out system files or non-readable entities
    const addFilesToQueue = (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const filteredFiles = fileArray.filter(file => {
            // Ignore system files like .DS_Store, thumbs.db, etc.
            if (file.name.startsWith('.') || file.name.toLowerCase() === 'thumbs.db') return false;
            // Ignore empty files
            if (file.size === 0) return false;
            return true;
        });

        const newFiles: QueuedFile[] = filteredFiles.map(file => ({
            id: crypto.randomUUID(),
            file,
            status: 'pending'
        }));
        setQueue(prev => [...prev, ...newFiles]);

        // Reset inputs so the same file selection triggers onChange again
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFilesToQueue(e.target.files);
        }
    };

    // Improved Drop Handler
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFilesToQueue(e.dataTransfer.files);
        }
    };

    const removeFile = (id: string) => {
        setQueue(prev => prev.filter(f => f.id !== id));
    };

    const clearQueue = () => {
        if (isIngesting) return;
        setQueue([]);
    };

    const handleIngestAll = async () => {
        const pending = queue.filter(f => f.status === 'pending');
        if (pending.length === 0) return;

        setIsIngesting(true);

        for (const queuedFile of pending) {
            setQueue(prev => prev.map(f => f.id === queuedFile.id ? { ...f, status: 'processing' } : f));

            try {
                const formData = new FormData();
                formData.append('file', queuedFile.file);

                const response = await fetch('/api/ingest', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Ingestion failed');
                }

                setQueue(prev => prev.map(f => f.id === queuedFile.id ? {
                    ...f,
                    status: 'success',
                    classification: data.classification
                } : f));
            } catch (err: any) {
                console.error(`Error ingesting ${queuedFile.file.name}:`, err);
                setQueue(prev => prev.map(f => f.id === queuedFile.id ? {
                    ...f,
                    status: 'error',
                    error: err.message
                } : f));
            }
        }

        setIsIngesting(false);
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'docx') return <FileText className="w-5 h-5 text-blue-600" />;
        if (ext === 'pdf') return <FileDigit className="w-5 h-5 text-red-600" />;
        if (ext === 'json') return <FileJson className="w-5 h-5 text-orange-500" />;
        if (['ts', 'js', 'tsx', 'jsx', 'html', 'css'].includes(ext || '')) return <FileCode className="w-5 h-5 text-tracker-blue" />;
        return <FileText className="w-5 h-5 text-zinc-400" />;
    };

    const successCount = queue.filter(f => f.status === 'success').length;
    const errorCount = queue.filter(f => f.status === 'error').length;
    const pendingCount = queue.filter(f => f.status === 'pending').length;

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {!envStatus.supabase && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-4 text-destructive">
                    <Database className="w-5 h-5 shrink-0" />
                    <div className="text-xs">
                        <p className="font-bold">Supabase Environment Error</p>
                        <p className="opacity-80">Public environment variables are missing. Please add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to Netlify Site Settings.</p>
                    </div>
                </div>
            )}

            <Card className="border-tracker-navy/10 shadow-lg overflow-hidden flex flex-col min-h-[600px]">
                <CardHeader className="bg-tracker-navy/5 border-b border-tracker-navy/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-tracker-navy text-white">
                                <Upload className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-tracker-navy">Knowledge Factory</CardTitle>
                                <CardDescription>
                                    Bulk ingestion for Word, PDF, Code, and Folders.
                                </CardDescription>
                            </div>
                        </div>
                        {queue.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearQueue}
                                disabled={isIngesting}
                                className="text-zinc-500 hover:text-destructive gap-2 font-bold uppercase text-[10px] tracking-widest"
                            >
                                <Trash2 className="w-3 h-3" />
                                Clear Queue
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-0 flex flex-col flex-1">
                    {queue.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-6">
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                className="w-full max-w-md border-2 border-dashed border-zinc-200 rounded-2xl p-12 transition-all hover:border-tracker-blue/50 hover:bg-zinc-50/50 flex flex-col items-center justify-center gap-4 relative"
                            >
                                <input
                                    type="file"
                                    multiple
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                <div className="p-4 rounded-full bg-white shadow-sm ring-1 ring-black/5">
                                    <Upload className="w-8 h-8 text-zinc-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-tracker-navy">Click or drag & drop</p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Supports .docx, .pdf, .md, .txt, and code files
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    className="gap-2 border-tracker-navy/10"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FileCode className="w-4 h-4 text-tracker-blue" />
                                    Select Files
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2 border-tracker-navy/10"
                                    onClick={() => folderInputRef.current?.click()}
                                >
                                    <FolderOpen className="w-4 h-4 text-tracker-gold" />
                                    Select Folder
                                </Button>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                multiple
                                onChange={handleFileChange}
                            />
                            <input
                                type="file"
                                ref={folderInputRef}
                                className="hidden"
                                {...{ webkitdirectory: "", directory: "" } as any}
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-4 bg-zinc-50/50 border-b border-tracker-navy/5 flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <span>Queue ({queue.length} files)</span>
                                <div className="flex gap-4">
                                    <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> {successCount}</span>
                                    <span className="flex items-center gap-1 text-destructive"><AlertCircle className="w-3 h-3" /> {errorCount}</span>
                                    <span className="flex items-center gap-1 text-zinc-500"><Clock className="w-3 h-3" /> {pendingCount}</span>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="divide-y divide-zinc-100">
                                    {queue.map((item) => (
                                        <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-zinc-50/50 transition-colors group">
                                            <div className="shrink-0">
                                                {getFileIcon(item.file.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-tracker-navy truncate">
                                                        {item.file.name}
                                                    </p>
                                                    <span className="text-[10px] text-zinc-400">
                                                        {(item.file.size / 1024).toFixed(1)} KB
                                                    </span>
                                                </div>
                                                {item.status === 'processing' && (
                                                    <p className="text-[10px] text-tracker-blue animate-pulse font-medium">Classifying and Embedding...</p>
                                                )}
                                                {item.status === 'success' && item.classification && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-[9px] h-4 bg-tracker-navy/5 text-tracker-navy border-none">
                                                            {item.classification.type}
                                                        </Badge>
                                                        <p className="text-[10px] text-green-600 font-medium line-clamp-1">
                                                            Ingested: {item.classification.summary}
                                                        </p>
                                                    </div>
                                                )}
                                                {item.status === 'error' && (
                                                    <div className="mt-1">
                                                        <p className="text-[10px] text-destructive font-bold">
                                                            Error: {item.error}
                                                        </p>
                                                        {item.error?.toLowerCase().includes('environment variables') && (
                                                            <p className="text-[9px] text-zinc-500 italic">Check your Netlify Site Settings for correctly spelled keys.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 flex items-center gap-2">
                                                {item.status === 'pending' && !isIngesting && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-zinc-300 hover:text-destructive"
                                                        onClick={() => removeFile(item.id)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {item.status === 'processing' && (
                                                    <Loader2 className="w-4 h-4 animate-spin text-tracker-blue" />
                                                )}
                                                {item.status === 'success' && (
                                                    <Check className="w-5 h-5 text-green-500" />
                                                )}
                                                {item.status === 'error' && (
                                                    <AlertCircle className="w-5 h-5 text-destructive" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="bg-zinc-50/50 border-t border-tracker-navy/5 p-6 flex justify-between items-center">
                    <div className="flex flex-col">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            Safe Environment • Batch Mode
                        </p>
                        {pendingCount > 0 && !isIngesting && (
                            <p className="text-[9px] text-tracker-blue font-bold mt-1">
                                Ready to ingest {pendingCount} files
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {queue.length > 0 && !isIngesting && (
                            <Button
                                variant="outline"
                                onClick={() => folderInputRef.current?.click()}
                                className="border-tracker-navy/10 h-10 px-4 text-xs font-bold"
                            >
                                Add More
                            </Button>
                        )}
                        <Button
                            onClick={handleIngestAll}
                            disabled={pendingCount === 0 || isIngesting || !envStatus.supabase}
                            className="bg-tracker-navy hover:bg-tracker-navy/90 text-white gap-2 px-8 min-w-[160px] h-10 shadow-md shadow-tracker-navy/20"
                        >
                            {isIngesting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Ingesting...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Ingest All {pendingCount > 0 && `(${pendingCount})`}
                                </>
                            )}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

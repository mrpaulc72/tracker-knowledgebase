'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Loader2, Upload, CheckCircle2, AlertCircle, FileText,
    Tags, Info, X, FolderOpen, FileCode, Check, Trash2,
    FileDigit, FileJson, Clock, Database, Link as LinkIcon, ExternalLink, Video,
    Image, Music, FileSpreadsheet, Archive, Box, Presentation, Scissors
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Filter out system files or non-readable entities
    const addFilesToQueue = (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const filteredFiles = fileArray.filter(file => {
            if (file.name.startsWith('.') || file.name.toLowerCase() === 'thumbs.db') return false;
            // Ignore empty files
            if (file.size === 0) return false;
            // NEW: Ignore files larger than 4.5MB (Netlify/Vercel Serverless Function body limit)
            if (file.size > 4.5 * 1024 * 1024) {
                console.warn(`Skipping ${file.name} because it exceeds 4.5MB limit.`);
                // Ideally we'd notify the user, but for now we filter it out to prevent crash.
                return false;
            }
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

                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    // If not JSON, it's likely an HTML error page (timeout, 413, 500)
                    const text = await response.text();
                    console.error('Non-JSON response:', text.slice(0, 500));
                    const statusText = response.status === 504 ? 'Gateway Timeout' : `Status ${response.status}`;
                    throw new Error(`Server Error (${statusText}): The file processing failed at the infrastructure level. Check Netlify logs.`);
                }

                if (!response.ok) {
                    throw new Error(data.error || data.details || 'Ingestion failed');
                }

                if (data.error === 'ALREADY_EXISTS') {
                    setQueue(prev => prev.map(f => f.id === queuedFile.id ? {
                        ...f,
                        status: 'success',
                        error: 'Skipped (Already exists in library)'
                    } : f));
                } else {
                    setQueue(prev => prev.map(f => f.id === queuedFile.id ? {
                        ...f,
                        status: 'success',
                        classification: data.classification
                    } : f));
                    // Refresh library after successful ingestion
                    fetchLibrary();
                }
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

    const [library, setLibrary] = useState<any[]>([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [linkData, setLinkData] = useState({ title: '', summary: '', url: '' });

    const fetchLibrary = async () => {
        setIsLoadingLibrary(true);
        try {
            const res = await fetch('/api/documents');
            const data = await res.json();
            if (data.sources) {
                setLibrary(data.sources);
            }
        } catch (err) {
            console.error('Failed to fetch library:', err);
        } finally {
            setIsLoadingLibrary(false);
        }
    };

    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsIngesting(true);
        try {
            const res = await fetch('/api/ingest/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(linkData),
            });
            const data = await res.json();

            if (data.error === 'ALREADY_EXISTS') {
                alert('A reference with this title already exists.');
            } else if (res.ok) {
                setLinkData({ title: '', summary: '', url: '' });
                setIsAddingLink(false);
                fetchLibrary();
            } else {
                throw new Error(data.error || 'Failed to add link');
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsIngesting(false);
        }
    };

    useEffect(() => {
        fetchLibrary();
    }, []);

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        // Documents
        if (['docx', 'dotx', 'doc', 'dot', 'odt', 'pages', 'rtf'].includes(ext))
            return <FileText className="w-5 h-5 text-blue-600" />;
        if (ext === 'pdf') return <FileDigit className="w-5 h-5 text-red-600" />;

        // Data & Code
        if (ext === 'json') return <FileJson className="w-5 h-5 text-orange-500" />;
        if (['xlsx', 'xls', 'xlsm', 'xltx', 'ods', 'csv', 'tsv', 'psv'].includes(ext))
            return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
        if (['ts', 'js', 'tsx', 'jsx', 'html', 'css', 'py', 'rb', 'php', 'sh', 'sql', 'java', 'rs', 'go'].includes(ext))
            return <FileCode className="w-5 h-5 text-tracker-blue" />;

        // Media
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'svg', 'ico'].includes(ext))
            return <Image className="w-5 h-5 text-purple-500" />;
        if (['mp4', 'mov', 'm4v', 'avi', 'wmv', 'mkv', 'webm'].includes(ext))
            return <Video className="w-5 h-5 text-indigo-500" />;
        if (['wav', 'mp3', 'aac', 'm4a', 'flac'].includes(ext))
            return <Music className="w-5 h-5 text-pink-500" />;

        // Presentations
        if (['pptx', 'ppt', 'pps', 'key', 'odp'].includes(ext))
            return <Presentation className="w-5 h-5 text-orange-600" />;

        // Archives & Projects
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
            return <Archive className="w-5 h-5 text-amber-600" />;
        if (['dwg', 'dxf', 'stl', 'obj', 'blend', 'skp', 'fbx'].includes(ext))
            return <Box className="w-5 h-5 text-cyan-600" />;
        if (['psd', 'ai', 'indd', 'prproj', 'aep', 'xd', 'fig'].includes(ext))
            return <Scissors className="w-5 h-5 text-pink-400" />;

        return <FileText className="w-5 h-5 text-zinc-400" />;
    };


    const successCount = queue.filter(f => f.status === 'success').length;
    const errorCount = queue.filter(f => f.status === 'error').length;
    const pendingCount = queue.filter(f => f.status === 'pending').length;

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            <Card className="border-tracker-navy/10 shadow-lg overflow-hidden flex flex-col min-h-[600px]">
                <CardHeader className="bg-tracker-navy/5 border-b border-tracker-navy/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-tracker-navy text-white">
                                <Upload className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-tracker-navy">Knowledge Factory</CardTitle>
                                Omnibus ingestion for Documents, Data, Media, and Project Assets.
                            </CardDescription>

                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddingLink(!isAddingLink)}
                            className={`text-[10px] font-bold h-8 border-tracker-navy/20 ${isAddingLink ? 'bg-tracker-navy text-white' : ''}`}
                        >
                            <LinkIcon className="w-3 h-3 mr-2" />
                            {isAddingLink ? 'BACK TO UPLOAD' : 'ADD VIDEO/LINK'}
                        </Button>
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
                </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col flex-1">
                {isAddingLink ? (
                    <div className="p-12">
                        <form onSubmit={handleAddLink} className="space-y-4 max-w-md mx-auto py-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-zinc-500">Video/Reference Title</label>
                                <Input
                                    className="h-10 border-tracker-navy/10"
                                    placeholder="e.g. How to Research for LinkedIn Posts"
                                    value={linkData.title}
                                    onChange={e => setLinkData(prev => ({ ...prev, title: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-zinc-500">Loom/External URL</label>
                                <Input
                                    className="h-10 border-tracker-navy/10"
                                    placeholder="https://www.loom.com/share/..."
                                    value={linkData.url}
                                    onChange={e => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                                    type="url"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-zinc-500">Brief Summary (for AI Search)</label>
                                <textarea
                                    className="w-full min-h-[100px] p-3 rounded-md border border-tracker-navy/10 text-sm focus:outline-none focus:ring-1 focus:ring-tracker-navy bg-white"
                                    placeholder="Briefly describe what happens in this video..."
                                    value={linkData.summary}
                                    onChange={e => setLinkData(prev => ({ ...prev, summary: e.target.value }))}
                                    required
                                />
                            </div>
                            <Button
                                className="w-full bg-tracker-navy text-white hover:bg-tracker-navy/90"
                                disabled={isIngesting}
                                type="submit"
                            >
                                {isIngesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                                Index Video Reference
                            </Button>
                        </form>
                    </div>
                ) : queue.length === 0 ? (
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
                                    Supports Documents, Data, Media, CAD, and Creative files
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
                                            {item.status === 'success' && item.error?.includes('Already exists') && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[9px] h-4 bg-tracker-gold/10 text-tracker-gold border-none">
                                                        SKIPPED
                                                    </Badge>
                                                    <p className="text-[10px] text-tracker-gold font-medium">
                                                        {item.error}
                                                    </p>
                                                </div>
                                            )}
                                            {item.status === 'success' && !item.error && item.classification && (
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
                        disabled={pendingCount === 0 || isIngesting}
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

            {/* Managed Library Section */ }
    <Card className="border-tracker-navy/10 shadow-lg overflow-hidden flex flex-col">
        <CardHeader className="bg-zinc-50 border-b border-tracker-navy/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-tracker-navy" />
                    <div>
                        <CardTitle className="text-lg font-bold text-tracker-navy">In-Storage Library</CardTitle>
                        <CardDescription className="text-[10px]">
                            {library.length} documents currently indexed and available for RAG.
                        </CardDescription>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchLibrary}
                    disabled={isLoadingLibrary}
                    className="h-8 text-[10px] font-bold uppercase tracking-widest text-zinc-500"
                >
                    {isLoadingLibrary ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Clock className="w-3 h-3 mr-2" />}
                    Refresh
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="h-[500px] w-full">
                {library.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400">
                        <p className="text-sm">No documents found in storage.</p>
                        <p className="text-xs mt-1">Upload files above to populate the library.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-100">
                        {library.map((doc, idx) => (
                            <div key={idx} className="bg-white p-3 flex items-center gap-3 hover:bg-zinc-50 transition-colors">
                                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-400">
                                    {(() => {
                                        const ext = doc.source.split('.').pop()?.toLowerCase() || '';
                                        if (doc.type === 'Video Reference' || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return <Video className="w-4 h-4 text-purple-600" />;
                                        if (['wav', 'mp3', 'aac', 'flac'].includes(ext)) return <Music className="w-4 h-4 text-pink-600" />;
                                        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'svg'].includes(ext)) return <Image className="w-4 h-4 text-indigo-600" />;
                                        if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
                                        if (['pptx', 'ppt', 'key'].includes(ext)) return <Presentation className="w-4 h-4 text-orange-600" />;
                                        if (['zip', 'rar', '7z'].includes(ext)) return <Archive className="w-4 h-4 text-amber-600" />;
                                        if (['dwg', 'obj', 'blend'].includes(ext)) return <Box className="w-4 h-4 text-cyan-600" />;
                                        if (ext === 'pdf') return <FileText className="w-4 h-4 text-blue-600" />;
                                        return <CheckCircle2 className="w-4 h-4" />;
                                    })()}

                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[11px] font-bold text-tracker-navy truncate">{doc.source}</p>
                                        <Badge variant="outline" className="text-[8px] h-3 px-1 bg-zinc-50 border-none uppercase text-zinc-400 font-black">
                                            {doc.type}
                                        </Badge>
                                    </div>
                                    <p className="text-[9px] text-zinc-400">Status: Indexed & Searchable</p>
                                </div>
                                {(doc.fileUrl || doc.url) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="h-7 text-[9px] font-bold text-tracker-navy hover:bg-tracker-navy/5"
                                    >
                                        <a href={doc.fileUrl || doc.url} target="_blank" rel="noopener noreferrer">
                                            {doc.fileUrl ? 'VIEW PDF' : 'WATCH'}
                                            <ExternalLink className="w-2 h-2 ml-1" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </CardContent>
    </Card>
        </div >
    );
}

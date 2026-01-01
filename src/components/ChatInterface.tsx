'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Send, Bot, User, Loader2, BookOpen, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
}

const MODELS = [
    { id: 'gpt-4o', label: 'GPT-4o (High Precision)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
];

const QUICK_ACTIONS = [
// ... (keep the same)
    {
        label: "SAFE Core Capabilities",
        question: "What are the core capabilities of the SAFE platform?",
        icon: ShieldCheck,
        color: "text-tracker-blue"
    },
    {
        label: "Digital Evidence Management",
        question: "How does SAFE handle digital evidence management?",
        icon: Zap,
        color: "text-tracker-gold"
    },
    {
        label: "Customer Avatars (ICAs)",
        question: "Describe the 'Evidence Room Manager' customer avatar and their pain points.",
        icon: User,
        color: "text-tracker-red"
    },
    {
        label: "Case Study: Bowling Green PD",
        question: "What were the key results for Bowling Green PD after adopting SAFE?",
        icon: BookOpen,
        color: "text-tracker-navy"
    },
    {
        label: "Auto-Disposition",
        question: "How does the auto-disposition feature work in SAFE?",
        icon: Zap,
        color: "text-tracker-blue"
    },
    {
        label: "Chain of Custody",
        question: "Explain how SAFE maintains chain of custody security.",
        icon: ShieldCheck,
        color: "text-tracker-gold"
    },
    {
        label: "Task Force Management",
        question: "How does SAFE support multi-agency task forces?",
        icon: User,
        color: "text-tracker-red"
    },
    {
        label: "Pricing & ROI",
        question: "What are the standard pricing models for SAFE?",
        icon: BookOpen,
        color: "text-tracker-navy"
    },
    {
        label: "Legacy Data Migration",
        question: "What is the process for migrating data from a legacy system to SAFE?",
        icon: ShieldCheck,
        color: "text-tracker-blue"
    },
    {
        label: "Mobile Capabilities",
        question: "What features are available on the SAFE mobile app?",
        icon: Zap,
        color: "text-tracker-gold"
    }
];

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [quickActions, setQuickActions] = useState<typeof QUICK_ACTIONS>([]);
    const [selectedModel, setSelectedModel] = useState('gpt-4o');

    useEffect(() => {
        // Randomly select 4 actions on mount
        const shuffled = [...QUICK_ACTIONS].sort(() => 0.5 - Math.random());
        setQuickActions(shuffled.slice(0, 4));
    }, []);

    const submitMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: messageText };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: [...messages, userMessage],
                    model: selectedModel
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch response');
            }

            const data = await response.json();
            setMessages((prev) => [...prev, { role: 'assistant', content: data.content, sources: data.sources }]);
        } catch (error: any) {
            console.error('Chat error:', error);
            setMessages((prev) => [...prev, { 
                role: 'assistant', 
                content: `Error: ${error.message || 'I encountered an error. Please check your connection and environment variables.'}` 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        await submitMessage(input);
    };

    const handleQuickAction = (question: string) => {
        submitMessage(question);
    };

    return (
        <div className="flex flex-col w-full max-w-5xl mx-auto h-[75vh] min-h-[600px] gap-4">
            <Card className="flex-1 flex flex-col border-tracker-navy/10 overflow-hidden shadow-xl">
                <CardHeader className="bg-tracker-navy text-white py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Bot className="w-6 h-6 text-tracker-blue" />
                                Tracker Nexus AI
                                <Badge variant="secondary" className="bg-tracker-blue/20 text-tracker-blue border-tracker-blue/30 ml-2">
                                    BETA
                                </Badge>
                            </CardTitle>
                            <p className="text-xs text-tracker-blue/80 font-medium tracking-wide mt-1">
                                Internal Knowledge Base & Strategy Assistant
                            </p>
                        </div>
                        <div className="w-[200px]">
                            <Select value={selectedModel} onValueChange={setSelectedModel}>
                                <SelectTrigger className="bg-white/10 border-white/20 text-white text-xs h-8">
                                    <SelectValue placeholder="Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MODELS.map(m => (
                                        <SelectItem key={m.id} value={m.id} className="text-xs">
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>

                <ScrollArea className="flex-1 p-4 bg-zinc-50/50">
                    <div className="flex flex-col gap-6 min-h-full">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                                <div className="p-4 rounded-full bg-tracker-navy/5 text-tracker-navy">
                                    <Search className="w-12 h-12 opacity-20" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-tracker-navy">How can I help you today?</h3>
                                    <p className="text-zinc-500 max-w-sm mt-2">
                                        Search our product truths, objection rebuttals, and agency case studies.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                                    {quickActions.map((action, idx) => (
                                        <Button
                                            key={idx}
                                            variant="outline"
                                            className="justify-start gap-2 h-auto py-3 px-4 border-tracker-navy/10 hover:bg-tracker-navy/5"
                                            onClick={() => handleQuickAction(action.question)}
                                        >
                                            <action.icon className={cn("w-4 h-4", action.color)} />
                                            <span className="text-xs text-left">{action.label}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex flex-col gap-2 max-w-[85%]",
                                    m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                        m.role === 'user'
                                            ? "bg-tracker-navy text-white rounded-tr-none"
                                            : "bg-white border border-tracker-navy/10 text-tracker-navy rounded-tl-none"
                                    )}
                                >
                                    {m.content}
                                </div>

                                {m.sources && m.sources.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {Array.from(new Set(m.sources)).map((s, si) => (
                                            <Badge key={si} variant="outline" className="text-[10px] py-0 h-5 bg-tracker-blue/5 text-tracker-blue border-tracker-blue/20">
                                                {s}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="bg-white border border-tracker-navy/10 p-3 rounded-2xl rounded-tl-none shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-tracker-blue" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <CardFooter className="p-4 border-t border-tracker-navy/5 bg-white">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex w-full gap-2 relative"
                    >
                        <Input
                            placeholder="Ask anything about Tracker Products..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="pr-12 py-6 bg-zinc-50 border-tracker-navy/10 focus-visible:ring-tracker-blue/50"
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="absolute right-1.5 top-1.5 h-9 w-9 bg-tracker-navy hover:bg-tracker-navy/90"
                            disabled={isLoading || !input.trim()}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </CardFooter>
            </Card>

            <p className="text-[10px] text-center text-zinc-400 font-medium uppercase tracking-widest">
                Confidential Internal Tool • Tracker Products © 2025
            </p>
        </div>
    );
}

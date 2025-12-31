'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Send, Bot, User, Loader2, BookOpen, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage] }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const data = await response.json();
            setMessages((prev) => [...prev, { role: 'assistant', content: data.content, sources: data.sources }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your connection and environment variables.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col w-full max-w-4xl mx-auto h-[70vh] gap-4">
            <Card className="flex-1 flex flex-col border-tracker-navy/10 overflow-hidden shadow-xl">
                <CardHeader className="bg-tracker-navy text-white py-4">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Bot className="w-6 h-6 text-tracker-blue" />
                        Tracker Nexus AI
                        <Badge variant="secondary" className="bg-tracker-blue/20 text-tracker-blue border-tracker-blue/30 ml-2">
                            BETA
                        </Badge>
                    </CardTitle>
                    <p className="text-sm text-tracker-blue/80 font-medium tracking-wide">
                        Internal Knowledge Base & Strategy Assistant
                    </p>
                </CardHeader>

                <ScrollArea className="flex-1 p-4 bg-zinc-50/50">
                    <div className="flex flex-col gap-6">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6">
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
                                    <Button variant="outline" className="justify-start gap-2 h-auto py-3 px-4 border-tracker-navy/10 hover:bg-tracker-navy/5" onClick={() => setInput("What are the core capabilities of the SAFE platform?")}>
                                        <ShieldCheck className="w-4 h-4 text-tracker-blue" />
                                        <span className="text-xs text-left">SAFE Core Capabilities</span>
                                    </Button>
                                    <Button variant="outline" className="justify-start gap-2 h-auto py-3 px-4 border-tracker-navy/10 hover:bg-tracker-navy/5" onClick={() => setInput("How does SAFE handle digital evidence?")}>
                                        <Zap className="w-4 h-4 text-tracker-gold" />
                                        <span className="text-xs text-left">Digital Evidence Management</span>
                                    </Button>
                                    <Button variant="outline" className="justify-start gap-2 h-auto py-3 px-4 border-tracker-navy/10 hover:bg-tracker-navy/5" onClick={() => setInput("Tell me about the Evidence Room Manager avatar.")}>
                                        <User className="w-4 h-4 text-tracker-red" />
                                        <span className="text-xs text-left">Customer Avatars (ICAs)</span>
                                    </Button>
                                    <Button variant="outline" className="justify-start gap-2 h-auto py-3 px-4 border-tracker-navy/10 hover:bg-tracker-navy/5" onClick={() => setInput("What was the result for Bowling Green PD?")}>
                                        <BookOpen className="w-4 h-4 text-tracker-navy" />
                                        <span className="text-xs text-left">Case Study: Bowling Green PD</span>
                                    </Button>
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

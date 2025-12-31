'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sword, Shield, Send, Loader2, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Pre-defined objections for quick access
const COMMON_OBJECTIONS = [
    { id: 'price', label: 'Price / Budget', prompt: "Your price is too high compared to competitors." },
    { id: 'timing', label: 'Bad Timing', prompt: "We are in the middle of a different migration right now." },
    { id: 'competitor', label: 'Competitor (Generic)', prompt: "We are already using a competitor and don't want to switch." },
    { id: 'complexity', label: 'Complexity', prompt: "SAFE looks too complicated for our officers to learn." },
    { id: 'cloud', label: 'Cloud Security', prompt: "We don't trust the cloud for our evidence." },
];

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ObjectionCrusher() {
    const [mode, setMode] = useState<'lookup' | 'roleplay'>('lookup');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedObjection, setSelectedObjection] = useState('');

    const handleObjectionSelect = (value: string) => {
        const objection = COMMON_OBJECTIONS.find(o => o.id === value);
        if (objection) {
            setSelectedObjection(value);
            // In Lookup mode, we auto-send the request for a rebuttal
            if (mode === 'lookup') {
                handleSend(objection.prompt);
            } else {
                // In Roleplay mode, we start the session with the objection
                startRoleplay(objection.prompt);
            }
        }
    };

    const startRoleplay = async (initialPrompt: string) => {
        setMessages([{ role: 'assistant', content: `(Prospect): ${initialPrompt}` }]);
        // Usually roleplay waits for USER output, but here we set the stage.
        // Actually, to make it realistic, we might want the SYSTEM to say this.
        // For now, we simulate the 'Assistant' (acting as prospect) saying it first.
    };

    const handleSend = async (manualInput?: string) => {
        const textToSend = manualInput || input;
        if (!textToSend.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: textToSend };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const endpointMode = mode === 'lookup' ? 'standard' : 'roleplay';
            // In lookup mode, we explicitly ask for a rebuttal if it's from the dropdown
            // If manual input, we just send it.

            // NOTE: In roleplay mode, we send the messages history so the context is kept.
            // In lookup mode, we typically just want a one-shot answer, but keeping history is fine.

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    mode: endpointMode
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const data = await response.json();
            setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Error connecting to AI.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const resetSession = () => {
        setMessages([]);
        setSelectedObjection('');
        setInput('');
    };

    return (
        <div className="flex flex-col w-full max-w-4xl mx-auto h-[70vh] gap-4">
            {/* Header / Mode Switcher */}
            <div className="flex bg-white p-1 rounded-xl border border-tracker-navy/10 shadow-sm w-fit self-center">
                <Tabs value={mode} onValueChange={(v) => { setMode(v as 'lookup' | 'roleplay'); resetSession(); }} className="w-[300px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="lookup" className="gap-2">
                            <Shield className="w-4 h-4" />
                            Lookup
                        </TabsTrigger>
                        <TabsTrigger value="roleplay" className="gap-2">
                            <Sword className="w-4 h-4" />
                            Roleplay
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <Card className={cn(
                "flex-1 flex flex-col overflow-hidden shadow-xl border-t-4",
                mode === 'roleplay' ? "border-t-tracker-red" : "border-t-tracker-blue"
            )}>
                <CardHeader className="bg-zinc-50 border-b border-zinc-100 py-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg text-tracker-navy">
                            {mode === 'lookup' ? "Objection Rebuttal Library" : "Sales Roleplay Simulator"}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={resetSession} className="text-zinc-400 hover:text-tracker-navy">
                            <RefreshCcw className="w-4 h-4 mr-1" /> Reset
                        </Button>
                    </div>
                </CardHeader>

                <ScrollArea className="flex-1 p-4 bg-white">
                    <div className="flex flex-col gap-6">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-[40vh] space-y-6 text-center">
                                <p className="text-zinc-500 max-w-sm">
                                    {mode === 'lookup'
                                        ? "Select a common objection to see the approved rebuttal, or type a custom one."
                                        : "Choose a scenario to start practicing. The AI will act as the prospect."}
                                </p>

                                <div className="w-full max-w-xs">
                                    <Select onValueChange={handleObjectionSelect} value={selectedObjection}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an Objection..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COMMON_OBJECTIONS.map((obj) => (
                                                <SelectItem key={obj.id} value={obj.id}>
                                                    {obj.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} className={cn(
                                "flex flex-col gap-2 max-w-[85%]",
                                m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                            )}>
                                <div className={cn(
                                    "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                    m.role === 'user'
                                        ? "bg-tracker-navy text-white rounded-tr-none"
                                        : (mode === 'roleplay' ? "bg-red-50 text-red-900 border border-red-100" : "bg-zinc-50 text-tracker-navy border border-zinc-100")
                                )}>
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="bg-zinc-50 p-3 rounded-2xl rounded-tl-none shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-tracker-blue" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <CardFooter className="p-4 border-t border-zinc-100">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex w-full gap-2 relative"
                    >
                        <Input
                            placeholder={mode === 'lookup' ? "Type a custom objection..." : "Type your response to the prospect..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="pr-12 py-6 bg-zinc-50 border-tracker-navy/10 focus-visible:ring-tracker-blue/50"
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className={cn(
                                "absolute right-1.5 top-1.5 h-9 w-9",
                                mode === 'roleplay' ? "bg-tracker-red hover:bg-tracker-red/90" : "bg-tracker-navy hover:bg-tracker-navy/90"
                            )}
                            disabled={isLoading || !input.trim()}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}

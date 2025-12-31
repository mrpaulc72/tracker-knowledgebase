import ChatInterface from "@/components/ChatInterface";
import KnowledgeFactory from "@/components/KnowledgeFactory";
import ObjectionCrusher from "@/components/ObjectionCrusher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans selection:bg-tracker-blue/30">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 w-full border-b border-tracker-navy/5 bg-white/80 backdrop-blur-md dark:bg-black/80 dark:border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-tracker-navy text-white font-bold">
              T
            </div>
            <span className="text-sm font-bold tracking-tight text-tracker-navy dark:text-white uppercase transition-opacity hover:opacity-80">
              Tracker <span className="text-tracker-blue font-black">Nexus</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              <span className="cursor-pointer hover:text-tracker-navy transition-colors">Strategy</span>
              <span className="cursor-pointer hover:text-tracker-navy transition-colors">Products</span>
              <span className="cursor-pointer hover:text-tracker-navy transition-colors">Support</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-tracker-navy/10 border border-tracker-navy/5 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-tracker-navy/20 animate-pulse" />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 pt-12 pb-24">
        {/* Hero Section */}
        <div className="mb-12 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-tracker-blue/20 bg-tracker-blue/5 px-4 py-1.5 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tracker-blue opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tracker-blue"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-tracker-navy/80">
              Active Intelligence: v1.0.4
            </span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-tracker-navy dark:text-white sm:text-5xl lg:text-6xl max-w-2xl leading-[1.1]">
            Unlock the <span className="text-tracker-red">Truth</span>. <br />
            Master the <span className="text-tracker-blue">SAFE</span> Platform.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
            The ultimate internal resource for sales, support, and implementation teams.
            Real-time access to our entire internal knowledge base.
          </p>
        </div>

        {/* Main Content Area */}
        <section className="relative">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-tracker-blue/5 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-tracker-red/5 blur-3xl" />

          <Tabs defaultValue="war-room" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto mb-8 bg-zinc-100/50 p-1 border border-tracker-navy/10 rounded-xl">
              <TabsTrigger value="war-room" className="rounded-lg data-[state=active]:bg-tracker-navy data-[state=active]:text-white transition-all uppercase text-[10px] font-bold tracking-widest py-2">
                The War Room
              </TabsTrigger>
              <TabsTrigger value="objection-crusher" className="rounded-lg data-[state=active]:bg-tracker-navy data-[state=active]:text-white transition-all uppercase text-[10px] font-bold tracking-widest py-2">
                Objection Crusher
              </TabsTrigger>
              <TabsTrigger value="knowledge-factory" className="rounded-lg data-[state=active]:bg-tracker-navy data-[state=active]:text-white transition-all uppercase text-[10px] font-bold tracking-widest py-2">
                Knowledge Factory
              </TabsTrigger>
            </TabsList>
            <TabsContent value="war-room" className="animate-in fade-in duration-500">
              <ChatInterface />
            </TabsContent>
            <TabsContent value="objection-crusher" className="animate-in fade-in duration-500">
              <ObjectionCrusher />
            </TabsContent>
            <TabsContent value="knowledge-factory" className="animate-in fade-in duration-500">
              <KnowledgeFactory />
            </TabsContent>
          </Tabs>
        </section>
      </main>

      {/* Background Motifs */}
      <div className="fixed inset-0 -z-10 h-full w-full opacity-[0.03] pointer-events-none overflow-hidden">
        <svg className="h-full w-full" viewBox="0 0 100 100">
          <pattern id="hexagons" width="10" height="17.32" patternUnits="userSpaceOnUse" patternTransform="scale(0.5)">
            <path d="M5 0 L10 2.89 L10 8.66 L5 11.55 L0 8.66 L0 2.89 Z" fill="none" stroke="currentColor" strokeWidth="0.1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hexagons)" ghost-active="true" />
        </svg>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { gsap } from "gsap";
import {
    Bot,
    Loader2,
    MessageCircle,
    Send,
    Sparkles,
    User,
    X,
} from "lucide-react";

type MessageRole = "user" | "assistant";

type Message = {
    role: MessageRole;
    content: string;
};

type ChatResponse = {
    reply?: string;
};

export default function GeminiChatbot() {
    const [open, setOpen] = React.useState<boolean>(false);
    const [messages, setMessages] = React.useState<Message[]>([
        { role: "assistant", content: "Hi 👋 How can I help you?" },
    ]);
    const [input, setInput] = React.useState<string>("");
    const [loading, setLoading] = React.useState<boolean>(false);

    const panelRef = React.useRef<HTMLDivElement | null>(null);
    const messagesRef = React.useRef<HTMLDivElement | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (!open || !panelRef.current) return;

        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion) return;

        gsap.fromTo(
            panelRef.current,
            {
                opacity: 0,
                y: 18,
                scale: 0.97,
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.35,
                ease: "power3.out",
            }
        );
    }, [open]);

    React.useEffect(() => {
        if (!messagesRef.current) return;
        messagesRef.current.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, loading]);

    React.useEffect(() => {
        if (open) {
            const id = window.setTimeout(() => inputRef.current?.focus(), 150);
            return () => window.clearTimeout(id);
        }
    }, [open]);

    const sendMessage = async (): Promise<void> => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMessage: Message = {
            role: "user",
            content: trimmed,
        };

        const newMessages: Message[] = [...messages, userMessage];

        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: newMessages }),
            });

            const data: ChatResponse = await res.json();

            const assistantMessage: Message = {
                role: "assistant",
                content: data.reply ?? "No reply received.",
            };

            setMessages([...newMessages, assistantMessage]);
        } catch {
            const errorMessage: Message = {
                role: "assistant",
                content: "Error occurred while contacting AI.",
            };

            setMessages([...newMessages, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Trigger */}
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="group fixed bottom-6 right-6 z-50 flex h-15 w-15 items-center justify-center rounded-2xl border border-emerald-300/20 bg-white/10 text-white shadow-[0_16px_45px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition duration-200 hover:scale-[1.03] hover:bg-white/14"
                aria-label="Toggle chatbot"
            >
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-lime-300/10 opacity-80" />
                <span className="relative">
          {open ? <X size={20} /> : <MessageCircle size={20} />}
        </span>
            </button>

            {/* Chat Panel */}
            {open && (
                <div
                    ref={panelRef}
                    className="fixed bottom-24 right-6 z-50 flex h-[560px] w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#071510]/90 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
                >
                    {/* top glow */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_60%)]" />

                    {/* Header */}
                    <div className="relative border-b border-white/10 px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/25 to-lime-300/10 text-white shadow-[0_8px_24px_rgba(16,185,129,0.18)]">
                                    <Bot className="h-5 w-5 text-emerald-200" />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-white">
                                            EcoPlate AI Assistant
                                        </h3>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-200">
                      <Sparkles className="h-3 w-3" />
                      Live
                    </span>
                                    </div>
                                    <p className="mt-1 text-xs text-white/45">
                                        Smart support for donations, claims, and logistics
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/8 hover:text-white/70"
                                aria-label="Close chatbot"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        ref={messagesRef}
                        className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4"
                    >
                        {messages.map((msg, i) => {
                            const isUser = msg.role === "user";

                            return (
                                <div
                                    key={i}
                                    className={`flex items-end gap-2 ${
                                        isUser ? "justify-end" : "justify-start"
                                    }`}
                                >
                                    {!isUser && (
                                        <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/6">
                                            <Bot className="h-4 w-4 text-emerald-200" />
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm ${
                                            isUser
                                                ? "rounded-br-md bg-gradient-to-r from-emerald-400 to-lime-300 text-[#062116]"
                                                : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white/86 backdrop-blur-xl"
                                        }`}
                                    >
                                        {msg.content}
                                    </div>

                                    {isUser && (
                                        <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10">
                                            <User className="h-4 w-4 text-emerald-100" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {loading && (
                            <div className="flex items-end gap-2">
                                <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/6">
                                    <Bot className="h-4 w-4 text-emerald-200" />
                                </div>

                                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/60 backdrop-blur-xl">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-emerald-200" />
                                        Thinking...
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="border-t border-white/10 bg-black/10 px-4 py-4">
                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-2 backdrop-blur-xl">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        void sendMessage();
                                    }
                                }}
                                className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/35"
                                placeholder="Ask about donations, pickup, or support..."
                            />

                            <button
                                type="button"
                                onClick={() => void sendMessage()}
                                disabled={loading || !input.trim()}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-lime-300 text-[#062116] shadow-[0_10px_26px_rgba(52,211,153,0.25)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Send message"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="mt-3 px-1 text-[11px] leading-5 text-white/30">
                            EcoPlate AI helps users with food donation flow, coordination, and common support questions.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
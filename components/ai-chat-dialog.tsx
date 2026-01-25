"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { processUserQuery } from "@/lib/ai-service";
import { Send, Sparkles, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";



interface AiChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export function AiChatDialog({ open, onOpenChange }: AiChatDialogProps) {
    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hi! I'm Pailo, your LifeOS Assistant. How can I help you manage your inventory or expenses today?",
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch User ID
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id || null);
        };
        fetchUser();
    }, [supabase.auth]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading || !userId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const currentInput = inputValue.trim();
        setInputValue("");
        setIsLoading(true);

        try {
            const responseText = await processUserQuery(currentInput, userId);

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: responseText,
            };
            setMessages((prev) => [...prev, aiResponse]);
        } catch (error) {
            const errorResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I encountered an internal error. Please try again.",
            };
            setMessages((prev) => [...prev, errorResponse]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden border-border bg-background shadow-2xl">
                <DialogHeader className="p-4 bg-muted/30 border-b border-border">
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Sparkles className="h-5 w-5 text-emerald-600" />
                        LifeOS Assistant
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col h-[500px]">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""
                                        }`}
                                >
                                    <Avatar className="h-8 w-8 shrink-0 bg-muted border border-border">
                                        {message.role === "assistant" ? (
                                            <div className="flex items-center justify-center w-full h-full bg-emerald-100 text-emerald-600">
                                                <Bot className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-600">
                                                <User className="h-5 w-5" />
                                            </div>
                                        )}
                                    </Avatar>
                                    <div
                                        className={`rounded-2xl px-4 py-2 text-sm max-w-[80%] shadow-sm ${message.role === "user"
                                            ? "bg-emerald-600 text-white rounded-tr-sm"
                                            : "bg-card border border-border text-foreground rounded-tl-sm"
                                            }`}
                                    >
                                        {message.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 shrink-0 bg-emerald-100 border border-emerald-200">
                                        <div className="flex items-center justify-center w-full h-full text-emerald-600">
                                            <Bot className="h-5 w-5" />
                                        </div>
                                    </Avatar>
                                    <div className="rounded-2xl px-4 py-3 bg-card border border-border rounded-tl-sm shadow-sm">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    </ScrollArea>

                    <div className="p-4 bg-background border-t border-border">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <Input
                                placeholder="Ask me anything..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="flex-1 bg-muted/30 border-input focus-visible:ring-emerald-500"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!inputValue.trim() || isLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

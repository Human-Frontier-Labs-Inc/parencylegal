"use client";

/**
 * Case Chat Component
 * Phase 6: AI Chat Interface
 *
 * Chat with AI about case documents using RAG
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  FileText,
  RefreshCw,
  Zap,
  AlertCircle,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface CaseChatProps {
  caseId: string;
  caseName: string;
}

export function CaseChat({ caseId, caseName }: CaseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [contextCount, setContextCount] = useState(0);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [needsEmbedding, setNeedsEmbedding] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if documents need embedding - only show prompt if we got a response with 0 context
  // Reset needsEmbedding when context is found
  useEffect(() => {
    if (contextCount > 0) {
      // We have context, no need to show the embed prompt
      setNeedsEmbedding(false);
    }
  }, [contextCount]);

  const handleEmbedDocuments = async () => {
    setIsEmbedding(true);
    setEmbedError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/embed-documents`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to embed documents");
      }

      if (data.processed > 0) {
        setNeedsEmbedding(false);
        // Add a system message
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I've now indexed ${data.processed} documents for search. You can ask me questions about them!`,
          },
        ]);
      } else if (data.alreadyEmbedded > 0) {
        setNeedsEmbedding(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Your documents are already indexed. Try asking a more specific question, or the documents may not contain relevant information.`,
          },
        ]);
      } else {
        setEmbedError("No documents to embed. Make sure documents are classified first.");
      }
    } catch (error: any) {
      setEmbedError(error.message);
    } finally {
      setIsEmbedding(false);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Add user message
    const userMessage: Message = { role: "user", content: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/cases/${caseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedInput,
          sessionId,
          includeContext: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "content") {
                fullContent += data.content;
                setStreamingContent(fullContent);
              } else if (data.type === "done") {
                setSessionId(data.sessionId);
                const chunks = data.contextChunks || 0;
                setContextCount(chunks);
                // Always hide embed prompt when we get context
                // Only show it if explicitly triggered by embed-documents returning 0 processed
                if (chunks > 0) {
                  setNeedsEmbedding(false);
                }
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Add assistant message
      if (fullContent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullContent },
        ]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setContextCount(0);
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium">AI Assistant</span>
          {contextCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {contextCount} docs referenced
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={startNewChat}>
          <RefreshCw className="h-4 w-4 mr-1" />
          New Chat
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-4 text-primary/50" />
            <h3 className="text-lg font-medium mb-2">Ask about your case</h3>
            <p className="text-sm max-w-md">
              I can help you find information in your documents, summarize
              content, and answer questions about {caseName}.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {[
                "What documents do we have?",
                "Summarize the financial records",
                "Find any mentions of income",
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInput(suggestion);
                    textareaRef.current?.focus();
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <Card
                  className={`max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }`}
                >
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </CardContent>
                </Card>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming response */}
            {streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <Card className="max-w-[80%]">
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">
                      {streamingContent}
                      <span className="animate-pulse">▊</span>
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <Card className="max-w-[80%]">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching documents...
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Enable AI Search prompt */}
            {needsEmbedding && !isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </div>
                <Card className="max-w-[80%] border-yellow-200 bg-yellow-50">
                  <CardContent className="p-3">
                    <p className="text-sm mb-3">
                      Your documents haven't been indexed for AI search yet.
                      Would you like me to index them now?
                    </p>
                    {embedError && (
                      <p className="text-sm text-red-600 mb-2">{embedError}</p>
                    )}
                    <Button
                      size="sm"
                      onClick={handleEmbedDocuments}
                      disabled={isEmbedding}
                    >
                      {isEmbedding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Indexing documents...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Enable AI Search
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your case documents..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}

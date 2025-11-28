"use client";

/**
 * Case Chat Component
 * Phase 6: AI Chat Interface with Multiple Chats, Citations, and Token Usage
 *
 * Chat with AI about case documents using RAG
 */

import { useState, useRef, useEffect, useCallback } from "react";
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
  MessageSquare,
  Trash2,
  Clock,
  Coins,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface ChatSource {
  documentId: string;
  documentName: string;
  chunkId?: string;
  excerpt: string;
  similarity: number;
  pageNumber?: number;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  inputTokens?: number;
  outputTokens?: number;
  contextTokens?: number;
  model?: string;
  createdAt?: string;
}

interface Chat {
  id: string;
  title: string;
  status: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

interface CaseChatProps {
  caseId: string;
  caseName: string;
  onDocumentClick?: (documentId: string) => void;
}

export function CaseChat({ caseId, caseName, onDocumentClick }: CaseChatProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentSources, setCurrentSources] = useState<ChatSource[]>([]);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [needsEmbedding, setNeedsEmbedding] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0, cost: 0 });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch chats on mount
  useEffect(() => {
    fetchChats();
  }, [caseId]);

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/chat`);
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  }, [caseId]);

  // Load chat messages when switching chats
  const loadChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/chat?chatId=${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setCurrentChatId(chatId);

        // Calculate total token usage for this chat
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
          setTokenUsage({
            input: chat.totalInputTokens,
            output: chat.totalOutputTokens,
            cost: chat.totalCost,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
    }
  }, [caseId, chats]);

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
    setCurrentSources([]);

    try {
      const response = await fetch(`/api/cases/${caseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedInput,
          chatId: currentChatId,
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
                setCurrentChatId(data.chatId);
                setCurrentSources(data.sources || []);

                // Update token usage
                setTokenUsage((prev) => ({
                  input: prev.input + (data.tokensUsed || 0),
                  output: prev.output + (data.tokensUsed || 0),
                  cost: prev.cost + (data.costCents || 0),
                }));

                // Refresh chat list
                fetchChats();
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Add assistant message with sources
      if (fullContent) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: fullContent,
            sources: currentSources,
          },
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
    setCurrentChatId(null);
    setCurrentSources([]);
    setTokenUsage({ input: 0, output: 0, cost: 0 });
  };

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/chat?chatId=${chatId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (currentChatId === chatId) {
          startNewChat();
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  // Parse citations from content and make them clickable
  const renderMessageContent = (content: string, sources?: ChatSource[]) => {
    // Match [Document: filename.ext] pattern
    const citationRegex = /\[Document:\s*([^\]]+)\]/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      const documentName = match[1].trim();
      const source = sources?.find((s) => s.documentName === documentName);

      parts.push(
        <button
          key={`citation-${match.index}`}
          onClick={() => source?.documentId && onDocumentClick?.(source.documentId)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium transition-colors"
          title={source ? `View ${documentName}` : documentName}
        >
          <FileText className="h-3 w-3" />
          {documentName}
          {source && <ExternalLink className="h-3 w-3" />}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const formatCost = (cents: number) => {
    if (cents < 1) return "<$0.01";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-[600px]">
      {/* Chat History Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Chat History</span>
            <Button variant="ghost" size="sm" onClick={startNewChat}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {chats.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No chats yet</p>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted ${
                      currentChatId === chat.id ? "bg-muted" : ""
                    }`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{chat.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(chat.updatedAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${showSidebar ? "rotate-180" : ""}`}
              />
            </Button>
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-medium">AI Assistant</span>
            {currentSources.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {currentSources.length} docs referenced
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Token Usage Display */}
            {tokenUsage.cost > 0 && (
              <Badge variant="outline" className="text-xs">
                <Coins className="h-3 w-3 mr-1" />
                {formatCost(tokenUsage.cost)}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={startNewChat}>
              <RefreshCw className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>
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
                  key={message.id || i}
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
                        {message.role === "assistant"
                          ? renderMessageContent(message.content, message.sources)
                          : message.content}
                      </p>
                      {/* Source citations for assistant messages */}
                      {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map((source, idx) => (
                              <button
                                key={idx}
                                onClick={() => onDocumentClick?.(source.documentId)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-xs transition-colors"
                                title={source.excerpt}
                              >
                                <FileText className="h-3 w-3" />
                                {source.documentName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
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
    </div>
  );
}

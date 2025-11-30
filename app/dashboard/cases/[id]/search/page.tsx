"use client";

/**
 * Case Search Page
 * Phase 9: Timeline, Search & Export
 *
 * Advanced hybrid search (full-text + semantic)
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  FileText,
  Loader2,
  AlertCircle,
  Filter,
  Sparkles,
  Clock,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  documentId: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  relevanceScore: number;
  matchType: "full-text" | "semantic" | "both";
  snippet: string;
  highlights: string[];
  metadata: Record<string, any> | null;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchMode: string;
  tokensUsed?: number;
  timing: {
    fullTextMs?: number;
    semanticMs?: number;
    totalMs: number;
  };
}

const MATCH_TYPE_COLORS: Record<string, string> = {
  "full-text": "bg-blue-100 text-blue-800",
  semantic: "bg-purple-100 text-purple-800",
  both: "bg-green-100 text-green-800",
};

const CATEGORY_COLORS: Record<string, string> = {
  Financial: "bg-green-100 text-green-800",
  Medical: "bg-red-100 text-red-800",
  Legal: "bg-blue-100 text-blue-800",
  Communications: "bg-purple-100 text-purple-800",
  Property: "bg-yellow-100 text-yellow-800",
  Employment: "bg-orange-100 text-orange-800",
  Personal: "bg-pink-100 text-pink-800",
};

export default function SearchPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"hybrid" | "full-text" | "semantic">("hybrid");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minConfidence, setMinConfidence] = useState<number>(0);

  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const filters: any = {};

      if (categoryFilter !== "all") {
        filters.categories = [categoryFilter];
      }

      if (minConfidence > 0) {
        filters.confidence = { min: minConfidence, max: 100 };
      }

      const response = await fetch(`/api/cases/${caseId}/search/advanced`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          options: {
            mode: searchMode,
            limit: 20,
            minSimilarity: 0.6,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || "Search failed");
        return;
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const highlightSnippet = (snippet: string, highlights: string[]): JSX.Element => {
    if (!highlights.length) {
      return <span>{snippet}</span>;
    }

    let result = snippet;
    for (const term of highlights) {
      const regex = new RegExp(`(${term})`, "gi");
      result = result.replace(regex, "**$1**");
    }

    // Convert **text** to <mark>text</mark>
    const parts = result.split(/\*\*([^*]+)\*\*/g);
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <mark key={i} className="bg-yellow-200 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <main className="p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/cases/${caseId}`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Case
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="h-8 w-8" />
          Document Search
        </h1>
        <p className="text-muted-foreground mt-1">
          Search case documents using keywords or natural language
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch}>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Input
                  type="search"
                  placeholder="Search documents... (e.g., 'bank statements from 2023' or 'monthly income')"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="text-lg h-12"
                />
              </div>
              <Button type="submit" size="lg" disabled={loading || !query.trim()}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Search Options */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mode:</span>
                <Select
                  value={searchMode}
                  onValueChange={(val) => setSearchMode(val as typeof searchMode)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">
                      <div className="flex items-center">
                        <Zap className="mr-1 h-3 w-3 text-green-500" />
                        Hybrid
                      </div>
                    </SelectItem>
                    <SelectItem value="full-text">
                      <div className="flex items-center">
                        <Search className="mr-1 h-3 w-3 text-blue-500" />
                        Full-text
                      </div>
                    </SelectItem>
                    <SelectItem value="semantic">
                      <div className="flex items-center">
                        <Sparkles className="mr-1 h-3 w-3 text-purple-500" />
                        Semantic
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Category:</span>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Communications">Communications</SelectItem>
                    <SelectItem value="Property">Property</SelectItem>
                    <SelectItem value="Employment">Employment</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Min confidence:</span>
                <Select
                  value={String(minConfidence)}
                  onValueChange={(val) => setMinConfidence(parseInt(val))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any</SelectItem>
                    <SelectItem value="60">60%+</SelectItem>
                    <SelectItem value="80">80%+</SelectItem>
                    <SelectItem value="90">90%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Mode Explanation */}
      {!results && !loading && (
        <Card className="mb-6 bg-muted/30">
          <CardContent className="py-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 font-medium mb-1">
                  <Search className="h-4 w-4 text-blue-500" />
                  Full-text
                </div>
                <p className="text-sm text-muted-foreground">
                  Exact keyword matching. Fast and precise.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 font-medium mb-1">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Semantic
                </div>
                <p className="text-sm text-muted-foreground">
                  AI-powered meaning-based search. Finds related concepts.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 font-medium mb-1">
                  <Zap className="h-4 w-4 text-green-500" />
                  Hybrid
                </div>
                <p className="text-sm text-muted-foreground">
                  Best of both. Combines keywords with meaning.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {results.totalResults} result{results.totalResults !== 1 ? "s" : ""} for "
                  {results.query}"
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {results.timing.totalMs}ms
                </span>
                {results.tokensUsed && (
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    {results.tokensUsed} tokens
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {results.results.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try different keywords or switch to semantic search for related concepts.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.results.map((result) => (
                  <Link
                    key={result.id}
                    href={`/dashboard/cases/${caseId}/documents/${result.documentId}`}
                  >
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">{result.fileName}</span>
                          </div>

                          {/* Snippet with highlights */}
                          <p className="text-sm text-muted-foreground mt-2">
                            {highlightSnippet(result.snippet, result.highlights)}
                          </p>

                          {/* Tags */}
                          <div className="flex items-center gap-2 mt-2">
                            {result.category && (
                              <Badge
                                variant="outline"
                                className={CATEGORY_COLORS[result.category] || ""}
                              >
                                {result.category}
                              </Badge>
                            )}
                            {result.subtype && (
                              <Badge variant="outline">{result.subtype}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {/* Relevance score */}
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {Math.round(result.relevanceScore * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">relevance</div>
                          </div>

                          {/* Match type */}
                          <Badge className={MATCH_TYPE_COLORS[result.matchType]}>
                            {result.matchType === "both"
                              ? "Keyword + AI"
                              : result.matchType === "semantic"
                              ? "AI match"
                              : "Keyword"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

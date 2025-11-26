"use client";

/**
 * Cases List Page
 * Displays all cases for the authenticated attorney
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Folder,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface Case {
  id: string;
  name: string;
  clientName: string | null;
  opposingParty: string | null;
  caseNumber: string | null;
  status: string;
  dropboxFolderPath: string | null;
  lastSyncedAt: string | null;
  documentCount?: number;
  needsReviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  discovery: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  trial_prep: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  settlement: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cases");
      if (response.ok) {
        const data = await response.json();
        setCases(data.cases || []);
      }
    } catch (error) {
      console.error("Failed to fetch cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: cases.length,
    active: cases.filter((c) => c.status === "active").length,
    discovery: cases.filter((c) => c.status === "discovery").length,
    needsReview: cases.reduce((sum, c) => sum + (c.needsReviewCount || 0), 0),
  };

  return (
    <main className="p-6 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Cases</h1>
          <p className="text-muted-foreground mt-1">
            Manage your legal cases and documents
          </p>
        </div>
        <Link href="/dashboard/cases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Case
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cases</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Folder className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Discovery</p>
                <p className="text-2xl font-bold">{stats.discovery}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Review</p>
                <p className="text-2xl font-bold">{stats.needsReview}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="trial_prep">Trial Prep</SelectItem>
                <SelectItem value="settlement">Settlement</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No cases found</h3>
              <p className="text-muted-foreground mb-4">
                {cases.length === 0
                  ? "Get started by creating your first case"
                  : "No cases match your search criteria"}
              </p>
              {cases.length === 0 && (
                <Link href="/dashboard/cases/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Case
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dropbox</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/cases/${caseItem.id}`}
                        className="font-medium hover:underline"
                      >
                        {caseItem.name}
                      </Link>
                      {caseItem.opposingParty && (
                        <p className="text-sm text-muted-foreground">
                          v. {caseItem.opposingParty}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{caseItem.clientName || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {caseItem.caseNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[caseItem.status] || ""}>
                        {caseItem.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {caseItem.dropboxFolderPath ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          <Folder className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Not connected
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {caseItem.lastSyncedAt ? (
                        <span className="text-sm flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {new Date(caseItem.lastSyncedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/cases/${caseItem.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

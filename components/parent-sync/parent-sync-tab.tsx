"use client";

import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign,
  MessageSquare,
  Shield,
  Filter,
  Image,
  FileText,
  Settings,
  XCircle,
} from "lucide-react";
import type {
  ParencySyncData,
  DataType,
  Incident,
  Expense,
  CalendarSchedule,
  Message,
} from "@/lib/parency-sync";

interface ParentSyncTabProps {
  caseId: string;
  parentSyncToken: string | null;
  parentName: string | null;
  parentEmail: string | null;
  parentSyncConnectedAt: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const REIMBURSEMENT_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  paid: "bg-blue-100 text-blue-800",
};

export function ParentSyncTab({
  caseId,
  parentSyncToken,
  parentName,
  parentEmail,
  parentSyncConnectedAt,
}: ParentSyncTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const [data, setData] = useState<ParencySyncData | null>(null);
  const [filter, setFilter] = useState<DataType | "all">("all");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = async () => {
    if (!parentSyncToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/parent-sync-data`);

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          setIsRevoked(true);
          setError(errorData.error || "Access has been revoked by the parent");
        } else {
          setError(errorData.error || "Failed to fetch data");
        }
        return;
      }

      const result = await response.json();
      setData(result);
      setLastFetched(new Date());
      setIsRevoked(false);
    } catch (err) {
      console.error("Error fetching parent data:", err);
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount if we have a token
  useEffect(() => {
    if (parentSyncToken) {
      fetchData();
    }
  }, [parentSyncToken, caseId]);

  if (!parentSyncToken) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Parent Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect to a parent&apos;s CoParency account to view their shared data.
            </p>
            <Link href={`/dashboard/cases/${caseId}/settings`}>
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Connect in Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isRevoked) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-12">
          <div className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-red-600">Access Revoked</h3>
            <p className="text-muted-foreground mb-4">
              {parentName} has revoked access to their shared data.
              Contact them to get a new access token.
            </p>
            <Link href={`/dashboard/cases/${caseId}/settings`}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Reconnect in Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredIncidents = filter === "all" || filter === "incidents" ? (data?.data.incidents || []) : [];
  const filteredExpenses = filter === "all" || filter === "expenses" ? (data?.data.expenses || []) : [];
  const filteredCalendar = filter === "all" || filter === "calendar" ? (data?.data.calendar || []) : [];
  const filteredMessages = filter === "all" || filter === "messages" ? (data?.data.messages || []) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Parent Data from {parentName}</CardTitle>
                <CardDescription>
                  {parentEmail} &middot; Connected {parentSyncConnectedAt ? new Date(parentSyncConnectedAt).toLocaleDateString() : ""}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as DataType | "all")}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="incidents">Incidents</SelectItem>
                  <SelectItem value="expenses">Expenses</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                  <SelectItem value="messages">Messages</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchData} disabled={loading} variant="outline">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
          {lastFetched && (
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {lastFetched.toLocaleTimeString()}
            </p>
          )}
          {data?.sharing && !data.sharing.includePrivateIncidents && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Private incidents are hidden by the parent
            </div>
          )}
        </CardHeader>
      </Card>

      {error && !isRevoked && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={fetchData} className="ml-auto">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && !data && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading parent data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Incidents */}
          {filteredIncidents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Incidents ({filteredIncidents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Child</TableHead>
                      <TableHead>Photos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(incident.occurredAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{incident.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="line-clamp-2">{incident.description}</p>
                          {incident.aiSummary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              AI: {incident.aiSummary}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={SEVERITY_COLORS[incident.severity] || ""}>
                            {incident.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{incident.childName || "-"}</TableCell>
                        <TableCell>
                          {incident.photos.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <Image className="h-4 w-4" />
                              <span>{incident.photos.length}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Expenses */}
          {filteredExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Expenses ({filteredExpenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Split</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Child</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(expense.paidOn).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="line-clamp-2">{expense.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${parseFloat(expense.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>{expense.splitPercentage}%</TableCell>
                        <TableCell>
                          <Badge className={REIMBURSEMENT_COLORS[expense.reimbursementStatus] || ""}>
                            {expense.reimbursementStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.childName || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Calendar */}
          {filteredCalendar.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Custody Schedules ({filteredCalendar.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredCalendar.map((schedule) => (
                    <div key={schedule.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          Starting {new Date(schedule.startDate).toLocaleDateString()}
                        </span>
                        <Badge variant="outline">{schedule.templateId}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {schedule.cycleLength}-day cycle
                      </p>
                      {schedule.overrides.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Schedule Overrides:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {schedule.overrides.map((override, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {new Date(override.date).toLocaleDateString()}: {override.reason}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          {filteredMessages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  Messages ({filteredMessages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredMessages.map((message) => (
                    <div key={message.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                        {message.hasAttachment && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            {message.attachmentName}
                          </div>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {filteredIncidents.length === 0 &&
            filteredExpenses.length === 0 &&
            filteredCalendar.length === 0 &&
            filteredMessages.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <p>No data found{filter !== "all" ? ` for ${filter}` : ""}.</p>
                  </div>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  );
}

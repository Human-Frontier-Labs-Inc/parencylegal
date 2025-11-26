"use client";

/**
 * Dashboard page for Parency Legal
 * Displays case overview and quick actions for attorneys
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Folder,
  FileText,
  AlertCircle,
  CheckCircle,
  Plus,
  ArrowRight,
  Loader2
} from "lucide-react";

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalDocuments: number;
  needsReview: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    totalDocuments: 0,
    needsReview: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/cases");
      if (response.ok) {
        const data = await response.json();
        const cases = data.cases || [];
        setStats({
          totalCases: cases.length,
          activeCases: cases.filter((c: any) => c.status === "active").length,
          totalDocuments: cases.reduce((sum: number, c: any) => sum + (c.documentCount || 0), 0),
          needsReview: cases.reduce((sum: number, c: any) => sum + (c.needsReviewCount || 0), 0),
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to Parency Legal
          </p>
        </div>
        <Link href="/dashboard/cases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Case
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cases</p>
                    <p className="text-3xl font-bold">{stats.totalCases}</p>
                  </div>
                  <Folder className="h-10 w-10 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Cases</p>
                    <p className="text-3xl font-bold">{stats.activeCases}</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documents</p>
                    <p className="text-3xl font-bold">{stats.totalDocuments}</p>
                  </div>
                  <FileText className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Needs Review</p>
                    <p className="text-3xl font-bold">{stats.needsReview}</p>
                  </div>
                  <AlertCircle className="h-10 w-10 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Get Started</CardTitle>
                <CardDescription>
                  Quick actions to manage your cases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/cases/new" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center">
                      <Plus className="mr-2 h-4 w-4" />
                      Create a New Case
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/cases" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center">
                      <Folder className="mr-2 h-4 w-4" />
                      View All Cases
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/settings" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      Connect Dropbox
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>
                  AI-powered document classification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium mr-3">
                      1
                    </span>
                    <span>Connect your Dropbox account in Settings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium mr-3">
                      2
                    </span>
                    <span>Create a case and link a Dropbox folder</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium mr-3">
                      3
                    </span>
                    <span>Sync documents and let AI classify them</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium mr-3">
                      4
                    </span>
                    <span>Review and approve AI classifications</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}

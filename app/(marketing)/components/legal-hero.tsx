"use client";

/**
 * Legal-focused Hero Section
 * Phase 12.1: Homepage redesign for Parency Legal
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LegalHero() {
  return (
    <motion.div
      className="text-center space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Trust Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
          <Shield className="w-4 h-4 mr-2" />
          Trusted by Family Law Attorneys Nationwide
        </Badge>
      </motion.div>

      {/* Main Headline */}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
        Stop Drowning in
        <span className="block text-primary">Discovery Documents</span>
      </h1>

      {/* Subheadline */}
      <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
        AI-powered document management for family law. Automatically classify,
        organize, and export your case files in minutes—not hours.
      </p>

      {/* Key Value Props */}
      <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>AI Classification in Seconds</span>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-primary"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
          <span>Dropbox Sync</span>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Court-Ready Exports</span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <Button asChild size="lg" className="font-semibold text-base px-8">
          <Link href="/dashboard">
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="font-semibold text-base px-8"
          asChild
        >
          <Link href="#how-it-works">
            <Play className="mr-2 h-4 w-4" />
            See How It Works
          </Link>
        </Button>
      </div>

      {/* Trust Indicators */}
      <motion.div
        className="pt-8 flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm text-muted-foreground">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </motion.div>
    </motion.div>
  );
}

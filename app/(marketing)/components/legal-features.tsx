"use client";

/**
 * Legal Features Section
 * Phase 12.1: Homepage redesign for Parency Legal
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CloudIcon,
  Sparkles,
  FileSearch,
  FileOutput,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { motion } from "motion/react";

const features = [
  {
    icon: CloudIcon,
    title: "Dropbox Sync",
    description:
      "Connect your Dropbox and sync case folders with one click. No more uploading files twice.",
    badge: "Auto-Sync",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Sparkles,
    title: "AI Classification",
    description:
      "Documents automatically sorted into Financial, Medical, Legal, Communications, and more categories.",
    badge: "AI-Powered",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: FileSearch,
    title: "Discovery Tracking",
    description:
      "Map documents to RFPs and Interrogatories. See coverage percentage and what's missing at a glance.",
    badge: "Smart Mapping",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: AlertTriangle,
    title: "Gap Detection",
    description:
      "AI identifies missing bank statements, pay stubs, and other required documents before you do.",
    badge: "Proactive Alerts",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: FileOutput,
    title: "Court-Ready Exports",
    description:
      "Generate organized PDF bundles with cover pages, table of contents, and page numbers.",
    badge: "One-Click",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: MessageSquare,
    title: "AI Case Assistant",
    description:
      "Ask questions about your case documents. Draft discovery requests. Research legal citations.",
    badge: "Chat",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function LegalFeatures() {
  return (
    <>
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Badge variant="outline" className="mb-4">
          Features
        </Badge>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Everything You Need for Family Law Discovery
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          From document chaos to court-ready organization in minutes
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {features.map((feature) => (
          <motion.div key={feature.title} variants={itemVariants}>
            <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 hover:border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div
                    className={`p-3 rounded-lg w-fit ${feature.bgColor}`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}

"use client";

/**
 * Legal CTA Section
 * Phase 12.1: Homepage redesign for Parency Legal
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Shield } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

const benefits = [
  "14-day free trial",
  "No credit card required",
  "Cancel anytime",
  "SOC 2 compliant",
  "Bank-level encryption",
];

export default function LegalCTA() {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-3xl p-8 md:p-12 border border-primary/20">
        <Badge variant="secondary" className="mb-6">
          <Shield className="w-3 h-3 mr-1" />
          Start Risk-Free
        </Badge>

        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Transform Your Practice?
        </h2>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Join hundreds of family law attorneys who save 10+ hours per case with
          Parency. Start your free trial today.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
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
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>

        {/* Benefits List */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

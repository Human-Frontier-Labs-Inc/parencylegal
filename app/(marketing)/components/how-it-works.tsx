"use client";

/**
 * How It Works Section
 * Phase 12.1: Homepage redesign for Parency Legal
 */

import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";

const steps = [
  {
    number: "01",
    title: "Connect Dropbox",
    description:
      "Link your Dropbox account and select your case folders. Parency syncs automatically whenever files change.",
    icon: (
      <svg
        className="w-12 h-12"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L6 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm0 9.17L8.83 9 12 6.83 15.17 9 12 11.17z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "AI Classifies Documents",
    description:
      "Our AI reads every document, extracts key information, and categorizes it—bank statements, pay stubs, medical records, and more.",
    icon: (
      <svg
        className="w-12 h-12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Export for Court",
    description:
      "Generate organized PDF bundles with cover pages, tables of contents, and page numbers. Ready to file in minutes.",
    icon: (
      <svg
        className="w-12 h-12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <div id="how-it-works">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Badge variant="outline" className="mb-4">
          How It Works
        </Badge>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          From Chaos to Court-Ready in 3 Steps
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Set up once, save hours on every case
        </p>
      </motion.div>

      <div className="relative">
        {/* Connecting Line (desktop only) */}
        <div className="hidden lg:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="relative text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              {/* Step Number Circle */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground mb-6 shadow-lg">
                <span className="text-2xl font-bold">{step.number}</span>
              </div>

              {/* Icon */}
              <div className="flex justify-center mb-4 text-primary">
                {step.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

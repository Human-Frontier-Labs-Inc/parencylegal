"use client";

/**
 * Testimonials Section
 * Phase 12.1: Homepage redesign for Parency Legal
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Sarah Mitchell",
    title: "Family Law Attorney",
    firm: "Mitchell & Associates",
    location: "Dallas, TX",
    content:
      "Parency cut my discovery prep time by 70%. What used to take my paralegal 8 hours now takes under 2. The AI classification is remarkably accurate—even with handwritten notes and scanned documents.",
    rating: 5,
    highlight: "70% time savings",
  },
  {
    name: "Michael Rodriguez",
    title: "Senior Partner",
    firm: "Rodriguez Family Law",
    location: "Los Angeles, CA",
    content:
      "The gap detection feature alone is worth the subscription. Last month it caught 3 missing bank statements that would have delayed our filing. My clients get better representation because I catch these issues early.",
    rating: 5,
    highlight: "Caught missing documents",
  },
  {
    name: "Jennifer Walsh",
    title: "Solo Practitioner",
    firm: "Walsh Law Office",
    location: "Chicago, IL",
    content:
      "As a solo attorney, I don't have paralegals to organize files. Parency is like having a tireless assistant who never misses a document. The Dropbox sync means I can work from anywhere.",
    rating: 5,
    highlight: "Perfect for solo practice",
  },
  {
    name: "David Chen",
    title: "Managing Partner",
    firm: "Chen & Partners",
    location: "Houston, TX",
    content:
      "We handle high-asset divorces with thousands of financial documents. Parency's AI identified duplicate accounts we would have missed manually. It's become essential to our practice.",
    rating: 5,
    highlight: "High-asset divorce expert",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
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

export default function Testimonials() {
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
          Testimonials
        </Badge>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Trusted by Family Law Attorneys
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          See how attorneys are transforming their practice with Parency
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {testimonials.map((testimonial, index) => (
          <motion.div key={testimonial.name} variants={itemVariants}>
            <Card className="h-full hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                {/* Quote Icon */}
                <Quote className="h-8 w-8 text-primary/20 mb-4" />

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-lg mb-6 leading-relaxed">
                  "{testimonial.content}"
                </blockquote>

                {/* Highlight Badge */}
                <Badge variant="secondary" className="mb-4">
                  {testimonial.highlight}
                </Badge>

                {/* Author */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {testimonial.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.title}, {testimonial.firm}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}

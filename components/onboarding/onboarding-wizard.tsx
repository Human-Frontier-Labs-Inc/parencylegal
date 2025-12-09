/**
 * Onboarding Wizard Component
 * Phase 12.5.1: Multi-step onboarding for new legal professionals
 *
 * Steps:
 * 1. Welcome - Introduction to Parency Legal
 * 2. Connect Dropbox - Link cloud storage
 * 3. Create Case - Set up first case
 * 4. Next Steps - Quick tips and done
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Scale,
  Cloud,
  FolderPlus,
  Sparkles,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
  userId: string;
  hasDropboxConnected?: boolean;
  hasCases?: boolean;
}

type OnboardingStep = "welcome" | "dropbox" | "create-case" | "complete";

const STEPS: OnboardingStep[] = ["welcome", "dropbox", "create-case", "complete"];

export default function OnboardingWizard({
  userId,
  hasDropboxConnected = false,
  hasCases = false,
}: OnboardingWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [dropboxStatus, setDropboxStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [caseCreated, setCaseCreated] = useState(false);
  const [newCaseId, setNewCaseId] = useState<string | null>(null);
  const [caseError, setCaseError] = useState<string | null>(null);

  // Form state for case creation
  const [caseName, setCaseName] = useState("");
  const [clientName, setClientName] = useState("");
  const [opposingParty, setOpposingParty] = useState("");

  // Check if onboarding should show
  useEffect(() => {
    const onboardingKey = `onboarding_completed_${userId}`;
    const hasCompletedOnboarding = localStorage.getItem(onboardingKey);

    // Show onboarding if not completed and user doesn't have cases
    if (!hasCompletedOnboarding && !hasCases) {
      // Small delay for smoother UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userId, hasCases]);

  // Check Dropbox status
  useEffect(() => {
    if (hasDropboxConnected) {
      setDropboxStatus("connected");
    } else {
      checkDropboxStatus();
    }
  }, [hasDropboxConnected]);

  const checkDropboxStatus = async () => {
    try {
      const response = await fetch("/api/auth/dropbox/status");
      if (response.ok) {
        const data = await response.json();
        setDropboxStatus(data.connected ? "connected" : "disconnected");
      } else {
        setDropboxStatus("disconnected");
      }
    } catch {
      setDropboxStatus("disconnected");
    }
  };

  const handleNext = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const handleSkipDropbox = () => {
    handleNext();
  };

  const handleConnectDropbox = () => {
    // Open Dropbox OAuth in a popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      "/api/auth/dropbox/connect",
      "dropbox_auth",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Poll for popup closure and check status
    const checkInterval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkInterval);
        checkDropboxStatus();
      }
    }, 500);
  };

  const handleCreateCase = async () => {
    if (!caseName.trim()) return;

    setIsCreatingCase(true);
    setCaseError(null);

    try {
      // Build request body - only include fields that have values
      // Zod schema expects undefined for optional fields, not null
      const requestBody: { name: string; clientName?: string; opposingParty?: string } = {
        name: caseName.trim(),
      };
      if (clientName.trim()) {
        requestBody.clientName = clientName.trim();
      }
      if (opposingParty.trim()) {
        requestBody.opposingParty = opposingParty.trim();
      }

      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 401) {
          setCaseError("Your session has expired. Please refresh the page and sign in again.");
          return;
        }

        if (response.status === 400) {
          try {
            const errorData = await response.json();
            const message = errorData.details?.[0]?.message || errorData.error || "Invalid case details.";
            setCaseError(message);
          } catch {
            setCaseError("Invalid case details. Please check your input.");
          }
          return;
        }

        if (response.status === 415) {
          setCaseError("Request error. Please try again.");
          return;
        }

        // Generic server error
        setCaseError("Failed to create case. Please try again in a moment.");
        return;
      }

      const data = await response.json();
      setCaseCreated(true);
      setNewCaseId(data.id);
      // Auto-advance after a moment
      setTimeout(() => handleNext(), 1000);
    } catch (error) {
      console.error("Failed to create case:", error);
      setCaseError("Network error. Please check your internet connection and try again.");
    } finally {
      setIsCreatingCase(false);
    }
  };

  const handleComplete = () => {
    // Mark onboarding as complete
    const onboardingKey = `onboarding_completed_${userId}`;
    localStorage.setItem(onboardingKey, new Date().toISOString());
    setIsOpen(false);

    // Redirect to the new case if created
    if (newCaseId) {
      window.location.href = `/dashboard/cases/${newCaseId}`;
    }
  };

  const handleSkipAll = () => {
    const onboardingKey = `onboarding_completed_${userId}`;
    localStorage.setItem(onboardingKey, new Date().toISOString());
    setIsOpen(false);
  };

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center pt-6 pb-2">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    index < currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : index === currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {index < currentStepIndex ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-1",
                      index < currentStepIndex ? "bg-primary" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {currentStep === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Scale className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  Welcome to Parency Legal
                </h2>
                <p className="text-muted-foreground mb-6">
                  AI-powered document management for family law attorneys.
                  Let&apos;s get you set up in under 2 minutes.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-medium mb-3">What you&apos;ll do:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-primary" />
                      Connect your Dropbox for document sync
                    </li>
                    <li className="flex items-center gap-2">
                      <FolderPlus className="w-4 h-4 text-primary" />
                      Create your first case
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Let AI classify your documents automatically
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={handleSkipAll} className="flex-1">
                    Skip for now
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    Get Started
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Connect Dropbox */}
            {currentStep === "dropbox" && (
              <motion.div
                key="dropbox"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-6"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                    <Cloud className="w-8 h-8 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Connect Dropbox</h2>
                  <p className="text-muted-foreground">
                    Sync your case files directly from Dropbox.
                    No manual uploads needed.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#0061FF">
                          <path d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zM6 20l6 4 6-4-6-4-6 4z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Dropbox</p>
                        <p className="text-sm text-muted-foreground">
                          {dropboxStatus === "checking" && "Checking connection..."}
                          {dropboxStatus === "connected" && "Connected"}
                          {dropboxStatus === "disconnected" && "Not connected"}
                        </p>
                      </div>
                    </div>
                    <div>
                      {dropboxStatus === "checking" && (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      )}
                      {dropboxStatus === "connected" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {dropboxStatus === "disconnected" && (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {dropboxStatus === "connected" ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-800">
                      Dropbox is connected!
                    </p>
                    <p className="text-sm text-green-600">
                      You can sync documents from your cases.
                    </p>
                  </div>
                ) : dropboxStatus === "disconnected" ? (
                  <Button
                    onClick={handleConnectDropbox}
                    className="w-full mb-4"
                    size="lg"
                  >
                    <Cloud className="w-4 h-4 mr-2" />
                    Connect Dropbox
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                ) : null}

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={dropboxStatus === "connected" ? handleNext : handleSkipDropbox}
                    className="flex-1"
                    variant={dropboxStatus === "connected" ? "default" : "outline"}
                  >
                    {dropboxStatus === "connected" ? "Continue" : "Skip for now"}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Create Case */}
            {currentStep === "create-case" && (
              <motion.div
                key="create-case"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-6"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
                    <FolderPlus className="w-8 h-8 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Create Your First Case</h2>
                  <p className="text-muted-foreground">
                    Set up a case to start organizing documents.
                  </p>
                </div>

                {caseCreated ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="font-medium text-green-800 text-lg">
                      Case created successfully!
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Taking you to your new case...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Error message display */}
                    {caseError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-red-700">{caseError}</p>
                          <button
                            onClick={() => setCaseError(null)}
                            className="text-xs text-red-600 hover:text-red-800 underline mt-1"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 mb-6">
                      <div>
                        <Label htmlFor="caseName">Case Name *</Label>
                        <Input
                          id="caseName"
                          placeholder="e.g., Smith v. Jones Divorce"
                          value={caseName}
                          onChange={(e) => setCaseName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientName">Client Name</Label>
                        <Input
                          id="clientName"
                          placeholder="e.g., John Smith"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="opposingParty">Opposing Party</Label>
                        <Input
                          id="opposingParty"
                          placeholder="e.g., Jane Jones"
                          value={opposingParty}
                          onChange={(e) => setOpposingParty(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={handleBack}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                      </Button>
                      <Button
                        onClick={handleCreateCase}
                        disabled={!caseName.trim() || isCreatingCase}
                        className="flex-1"
                        variant={caseError ? "outline" : "default"}
                      >
                        {isCreatingCase ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : caseError ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                          </>
                        ) : (
                          <>
                            Create Case
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {currentStep === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">You&apos;re All Set!</h2>
                <p className="text-muted-foreground mb-6">
                  Your workspace is ready. Here&apos;s what to do next:
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-medium mb-3">Next Steps:</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Link a Dropbox Folder</p>
                        <p className="text-muted-foreground">
                          Go to your case and click &quot;Link Dropbox Folder&quot;
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Sync Documents</p>
                        <p className="text-muted-foreground">
                          Click &quot;Sync from Dropbox&quot; to import files
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Review Classifications</p>
                        <p className="text-muted-foreground">
                          AI will categorize documents automatically
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                <Button onClick={handleComplete} className="w-full" size="lg">
                  {newCaseId ? "Go to My Case" : "Go to Dashboard"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

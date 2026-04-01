/**
 * Enhanced Wizard Page Component
 * 
 * Key Changes:
 * 1. Works without login (optional auth)
 * 2. Shows login prompt when user tries to:
 *    - Save a template
 *    - Extract more than 5 URLs
 * 3. Tracks usage in session storage for non-logged users
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  checkExtractionLimit, 
  recordExtraction, 
  getSessionUsage 
} from "@/lib/session-usage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, UserPlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// This is a wrapper component that adds auth checks to the existing wizard
// Import the original wizard as a child component
import OriginalWizard from "./wizard-original";

export default function WizardPage() {
  const { currentUser } = useAuth();
  const [location, navigate] = useLocation();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptReason, setLoginPromptReason] = useState<'template' | 'urlLimit' | null>(null);
  const [sessionUsage, setSessionUsage] = useState(getSessionUsage());

  // Update session usage periodically
  useEffect(() => {
    if (!currentUser) {
      const interval = setInterval(() => {
        setSessionUsage(getSessionUsage());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Handler when user tries to save template
  const handleSaveTemplateAttempt = (callback: () => void) => {
    if (!currentUser) {
      setLoginPromptReason('template');
      setShowLoginPrompt(true);
      return false; // Block the action
    }
    callback(); // Allow the action
    return true;
  };

  // Handler when user tries to extract URLs
  const handleExtractAttempt = (urlCount: number, callback: () => void) => {
    if (!currentUser) {
      const limitCheck = checkExtractionLimit(urlCount);
      
      if (!limitCheck.canProceed) {
        setLoginPromptReason('urlLimit');
        setShowLoginPrompt(true);
        return false; // Block the action
      }
      
      // Record the extraction
      recordExtraction(urlCount);
      setSessionUsage(getSessionUsage());
    }
    
    callback(); // Allow the action
    return true;
  };

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  const handleSignupRedirect = () => {
    navigate("/signup");
  };

  return (
    <>
      {/* Show usage warning for non-logged users */}
      {!currentUser && sessionUsage.extractionCount > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              You have extracted <strong>{sessionUsage.extractionCount}</strong> URL{sessionUsage.extractionCount !== 1 ? 's' : ''} this session.
              {' '}
              Free limit: <strong>5 URLs per session</strong>.
              {' '}
              <button 
                onClick={handleLoginRedirect}
                className="underline font-semibold hover:text-amber-700"
              >
                Login for unlimited access
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Pass handlers to original wizard */}
      <OriginalWizard
        onSaveTemplateAttempt={handleSaveTemplateAttempt}
        onExtractAttempt={handleExtractAttempt}
      />

      {/* Login Prompt Dialog */}
      <AlertDialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {loginPromptReason === 'template' ? 'Login Required to Save Template' : 'Login Required for More URLs'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {loginPromptReason === 'template' ? (
                <p>
                  You need to login or create an account to save extraction templates.
                  Templates allow you to reuse your field mappings for future extractions.
                </p>
              ) : (
                <p>
                  Free users can extract up to 5 URLs per session.
                  Login or create an account to extract unlimited URLs.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Current session usage: {sessionUsage.extractionCount} URL{sessionUsage.extractionCount !== 1 ? 's' : ''} extracted
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowLoginPrompt(false)}>
              Cancel
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={handleSignupRedirect}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Sign Up
            </Button>
            <AlertDialogAction onClick={handleLoginRedirect} className="gap-2">
              <LogIn className="w-4 h-4" />
              Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

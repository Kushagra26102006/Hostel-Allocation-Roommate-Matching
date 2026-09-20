"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsentPanel } from "@/components/compatibility/consent-panel";
import { QuestionnaireCards } from "@/components/compatibility/questionnaire-cards";
import type { QuestionnaireDefinition, QuestionnaireAnswers } from "@hostelhub/domain";

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params?.id as string;

  const [definition, setDefinition] = useState<QuestionnaireDefinition | null>(null);
  const [hasConsent, setHasConsent] = useState<boolean>(false);
  const [existingAnswers, setExistingAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [completed, setCompleted] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [defRes, qRes] = await Promise.all([
          fetch("/api/v1/questionnaire"),
          fetch("/api/v1/me/questionnaire"),
        ]);

        if (defRes.ok) {
          const defData = await defRes.json();
          setDefinition(defData.definition);
        }

        if (qRes.ok) {
          const qData = await qRes.json();
          setHasConsent(qData.hasConsent);
          setExistingAnswers(qData.answers);
          if (qData.hasSubmitted && qData.answers) {
            setCompleted(true);
          }
        }
      } catch (err) {
        console.error("Failed to load questionnaire data:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        <p className="text-xs text-muted">Loading questionnaire...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/applications/${applicationId}`)}
          className="text-muted hover:text-text"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Application
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/privacy")}
          className="text-xs border-brand-500/30 text-brand-300 hover:bg-brand-500/10"
        >
          <Shield className="w-4 h-4 mr-2" /> Privacy Centre
        </Button>
      </div>

      {!hasConsent ? (
        <ConsentPanel onConsentGranted={() => setHasConsent(true)} />
      ) : completed && existingAnswers ? (
        <div className="max-w-md mx-auto text-center space-y-4 p-8 rounded-2xl border border-emerald-500/30 bg-surface/80 backdrop-blur-md shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-text">Questionnaire Completed</h2>
          <p className="text-xs text-muted">
            Your preferences have been encrypted and stored securely. Roommate compatibility scoring
            is active for your application.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => setCompleted(false)} className="text-xs">
              Retake Questionnaire
            </Button>
            <Button
              onClick={() => router.push(`/applications/${applicationId}`)}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
            >
              Continue Application
            </Button>
          </div>
        </div>
      ) : definition ? (
        <QuestionnaireCards definition={definition} onCompleted={() => setCompleted(true)} />
      ) : (
        <div className="text-center py-12 text-muted text-xs">
          Questionnaire definition could not be loaded.
        </div>
      )}
    </div>
  );
}

"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "../../../firebase";
// Usunięto: import Image from "next/image"; (nieużywany)
import {
  IconArrowLeft,
  IconActivity,
  IconAlertTriangle,
  IconPaw,
  IconTarget,
  IconInfoCircle,
  IconEdit,
  IconVirus,
  IconStethoscope,
  IconClock,
  IconAlertCircle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";

interface Diagnosis {
  diseaseName: string;
  probability: number;
  riskLevel: "low" | "medium" | "high";
  description: string;
  confidenceReasoning: string;
  recommendedActions: string[];
  recommendedTests: string[];
  requiresVetVisit: boolean;
  urgency: "immediate" | "within_24h" | "within_72h" | "within_week";
  differential: string[];
}

interface AnalysisResult {
  analysisId: number;
  overallHealth: "healthy" | "hard to tell" | "unhealthy";
  diagnoses: Diagnosis[];
  createdAt: string; // ISO date
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

const URGENCY_COLORS: Record<string, string> = {
  immediate: "bg-red-500 text-white",
  within_24h: "bg-orange-500 text-white",
  within_72h: "bg-yellow-500 text-white",
  within_week: "bg-green-500 text-white",
};

const URGENCY_LABELS: Record<string, string> = {
  immediate: "Natychmiastowa",
  within_24h: "W ciągu 24h",
  within_72h: "W ciągu 72h",
  within_week: "W ciągu tygodnia",
};

const OVERALL_HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-green-100 text-green-800",
  "hard to tell": "bg-yellow-100 text-yellow-800",
  unhealthy: "bg-red-100 text-red-800",
};

const OVERALL_HEALTH_LABELS: Record<string, string> = {
  healthy: "Zdrowy",
  "hard to tell": "Trudno ocenić",
  unhealthy: "Niezdrowy",
};

export default function DiagnosisResults() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!user || !analysisId) {
        router.push("/sign-in");
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/analysis/${analysisId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch results");
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        console.error("Error fetching results:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Nie udało się załadować wyników."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [user, analysisId, router]);

  const handleBack = () => {
    router.push("/diagnose");
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-600 text-lg font-medium">
            Ładowanie wyników...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md text-center">
          <IconAlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Błąd</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700"
          >
            Powrót
          </button>
        </div>
      </div>
    );
  }

  if (!results || results.diagnoses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6"
          >
            <IconArrowLeft className="mr-2" size={20} />
            Powrót
          </button>
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <IconInfoCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Brak wyników
            </h2>
            <p className="text-gray-600">Nie znaleziono analizy.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={handleBack}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors"
        >
          <IconArrowLeft className="mr-2" size={20} />
          Powrót do diagnozy
        </button>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white">
          <div className="flex items-center justify-center mb-8">
            <IconActivity className="text-blue-500 mr-3" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">
              Wyniki analizy zdrowia pupila
            </h1>
          </div>

          <div className="flex justify-center mb-4">
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                OVERALL_HEALTH_COLORS[results.overallHealth]
              }`}
            >
              Ogólna ocena zdrowia:{" "}
              {OVERALL_HEALTH_LABELS[results.overallHealth]}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-start">
              <IconAlertTriangle
                className="text-amber-600 mt-0.5 mr-3 flex-shrink-0"
                size={20}
              />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Pamiętaj:</p>
                <p>
                  To wstępne sugestie AI oparte na podanych danych. Zawsze
                  skonsultuj z weterynarzem!
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-center mb-8">
            Analiza z {new Date(results.createdAt).toLocaleDateString("pl-PL")}.
            Oto 3 możliwe diagnozy, posortowane wg prawdopodobieństwa.
          </p>

          <div className="space-y-6">
            {results.diagnoses.map((diagnosis, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-xl p-6 border-l-4 border-indigo-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {diagnosis.diseaseName}
                    </h2>
                    <div className="flex items-center space-x-4 mt-2">
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          RISK_COLORS[diagnosis.riskLevel]
                        }`}
                      >
                        Ryzyko:{" "}
                        {diagnosis.riskLevel === "low"
                          ? "Niskie"
                          : diagnosis.riskLevel === "medium"
                          ? "Średnie"
                          : "Wysokie"}
                      </div>
                      <div className="flex items-center">
                        <IconTarget className="mr-1" size={16} />
                        <span className="text-lg font-semibold text-indigo-600">
                          {Math.round(diagnosis.probability * 100)}%
                          prawdopodobieństwa
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                      <IconInfoCircle className="mr-2" size={18} />
                      Opis
                    </h3>
                    <p className="text-gray-600">{diagnosis.description}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                      <IconEdit className="mr-2" size={18} />
                      Uzasadnienie
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {diagnosis.confidenceReasoning}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                      <IconStethoscope className="mr-2" size={18} />
                      Zalecane działania
                    </h3>
                    <ul className="space-y-2">
                      {diagnosis.recommendedActions.map((action, i) => (
                        <li
                          key={i}
                          className="flex items-center text-sm text-gray-600"
                        >
                          <IconCheck
                            className="mr-2 text-green-500"
                            size={16}
                          />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                      <IconVirus className="mr-2" size={18} />
                      Zalecane badania
                    </h3>
                    <ul className="space-y-2">
                      {diagnosis.recommendedTests.map((test, i) => (
                        <li
                          key={i}
                          className="flex items-center text-sm text-gray-600"
                        >
                          <IconCheck
                            className="mr-2 text-green-500"
                            size={16}
                          />
                          {test}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center">
                    <IconAlertCircle
                      className={`mr-2 ${
                        diagnosis.requiresVetVisit
                          ? "text-red-500"
                          : "text-green-500"
                      }`}
                      size={20}
                    />
                    <span
                      className={`font-medium ${
                        diagnosis.requiresVetVisit
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {diagnosis.requiresVetVisit
                        ? "Wymagana wizyta u weterynarza"
                        : "Można monitorować w domu"}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      URGENCY_COLORS[diagnosis.urgency]
                    }`}
                  >
                    <IconClock className="inline mr-1" size={14} />
                    {URGENCY_LABELS[diagnosis.urgency]}
                  </div>
                </div>

                {diagnosis.differential.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                      <IconX className="mr-2" size={18} />
                      Diagnostyka różnicowa
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {diagnosis.differential.map((diff, i) => (
                        <span
                          key={i}
                          className="bg-gray-200 px-2 py-1 rounded text-sm text-gray-600"
                        >
                          {diff}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={handleBack}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <IconPaw className="mr-2" size={20} />
              <span>Nowa analiza</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

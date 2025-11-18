// app/profile/[petId]/diagnoses/page.tsx
"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "../../../firebase";
import { IconArrowLeft, IconActivity, IconCalendar } from "@tabler/icons-react";

interface PetDiagnosisSummary {
  idAnalysis: number;
  createdAt: string;
  overallHealth: "healthy" | "hard to tell" | "unhealthy";
}

const HEALTH_BADGE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  healthy: { bg: "bg-green-100", text: "text-green-800", label: "Healthy" },
  "hard to tell": {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "Hard to tell",
  },
  unhealthy: { bg: "bg-red-100", text: "text-red-800", label: "Unhealthy" },
};

export default function PetDiagnosesHistory() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const petId = params.petId as string;

  const [diagnoses, setDiagnoses] = useState<PetDiagnosisSummary[]>([]);
  const [petName, setPetName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !petId) return;

      try {
        const token = await user.getIdToken();

        // Fetch pet name
        const petRes = await fetch(`/api/pets/${petId}`);
        if (petRes.ok) {
          const petData = await petRes.json();
          setPetName(petData.pet.name);
        }

        // Fetch diagnoses
        const res = await fetch(`/api/pets/${petId}/diagnoses`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load diagnosis history");

        const data = await res.json();
        setDiagnoses(data.analyses || []);
      } catch (err) {
        setError("Could not load diagnosis history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, petId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push(`/profile/${petId}`)}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <IconArrowLeft size={20} className="mr-2" />
          Back to {petName}'s profile
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center mb-8">
            <IconActivity className="text-emerald-500 mr-3" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">
              Diagnosis History – {petName}
            </h1>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {diagnoses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <IconActivity size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No diagnostic analyses yet</p>
              <button
                onClick={() => router.push("/diagnose")}
                className="mt-4 bg-emerald-500 text-white px-6 py-3 rounded-xl hover:bg-emerald-600"
              >
                Run first analysis
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {diagnoses.map((diag) => {
                const health = HEALTH_BADGE[diag.overallHealth];
                return (
                  <div
                    key={diag.idAnalysis}
                    onClick={() =>
                      router.push(`/diagnose/results/${diag.idAnalysis}`)
                    }
                    className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <IconCalendar className="text-gray-500" size={20} />
                          <span className="font-medium text-gray-700">
                            {new Date(diag.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-full text-sm font-medium ${health.bg} ${health.text}`}
                      >
                        {health.label}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Click to view full analysis result
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
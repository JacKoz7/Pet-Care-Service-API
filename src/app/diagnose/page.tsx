// src/app/diagnose/page.tsx
"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "../firebase";
import Image from "next/image";
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowLeft,
  IconScale,
  IconGenderMale,
  IconCheck,
  IconActivityHeartbeat,
  IconApple,
  IconHome,
  IconVirus,
  IconVaccine,
  IconPaw,
  IconEdit,
} from "@tabler/icons-react";

interface Symptom {
  idSymptom: number;
  code: string;
  name: string;
  description: string | null;
  defaultSeverity: string;
}

interface Pet {
  id: number;
  name: string;
  age: number;
  description: string | null;
  keyImage: string | null;
  breed: string;
  species: string;
}

export default function DiagnosePet() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isLoadingSymptoms, setIsLoadingSymptoms] = useState(true);
  const [symptomsError, setSymptomsError] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<number>>(
    new Set()
  );
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(true);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [weight, setWeight] = useState<string>("");
  const [sex, setSex] = useState<"MALE" | "FEMALE" | "UNKNOWN" | "">("");
  const [isSterilized, setIsSterilized] = useState<boolean | null>(null);
  const [activityLevel, setActivityLevel] = useState<
    "LOW" | "MEDIUM" | "HIGH" | ""
  >("");
  const [dietType, setDietType] = useState<
    "DRY" | "WET" | "BARF" | "HOMEMADE" | "OTHER" | ""
  >("");
  const [knownAllergies, setKnownAllergies] = useState<string>("");
  const [vaccinationUpToDate, setVaccinationUpToDate] = useState<
    boolean | null
  >(null);
  const [environmentType, setEnvironmentType] = useState<
    "INDOOR" | "OUTDOOR" | "MIXED" | ""
  >("");
  const [chronicDiseases, setChronicDiseases] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/sign-in");
      return;
    }

    const fetchData = async () => {
      try {
        const token = await user.getIdToken();

        // Fetch symptoms
        const symptomsResponse = await fetch("/api/symptoms", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!symptomsResponse.ok) {
          throw new Error("Failed to fetch symptoms");
        }

        const symptomsData = await symptomsResponse.json();
        setSymptoms(symptomsData.symptoms || []);

        // Fetch pets
        const petsResponse = await fetch("/api/pets", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!petsResponse.ok) {
          throw new Error("Failed to fetch pets");
        }

        const petsData = await petsResponse.json();
        setPets(petsData.pets || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setSymptomsError("Failed to load symptoms. Please try again.");
        setPetsError("Failed to load pets. Please try again.");
      } finally {
        setIsLoadingSymptoms(false);
        setIsLoadingPets(false);
      }
    };

    fetchData();
  }, [user, loading, router]);

  const handleSymptomChange = (id: number) => {
    setSelectedSymptoms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAnalyze = async () => {
    if (!selectedPetId) {
      alert("Please select a pet first.");
      return;
    }

    // Construct inputData JSON
    const inputData = {
      petId: selectedPetId,
      weight: weight ? parseFloat(weight) : null,
      sex: sex || null,
      isSterilized: isSterilized,
      activityLevel: activityLevel || null,
      dietType: dietType || null,
      knownAllergies: knownAllergies
        ? knownAllergies
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : [],
      vaccinationUpToDate: vaccinationUpToDate,
      environmentType: environmentType || null,
      chronicDiseases: chronicDiseases
        ? chronicDiseases
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : [],
      selectedSymptoms: Array.from(selectedSymptoms)
        .map((id) => {
          const symptom = symptoms.find((s) => s.idSymptom === id);
          return symptom
            ? {
                id: symptom.idSymptom,
                code: symptom.code,
                name: symptom.name,
                description: symptom.description,
                defaultSeverity: symptom.defaultSeverity,
              }
            : null;
        })
        .filter((s) => s),
    };

    console.log("Input Data JSON:", JSON.stringify(inputData, null, 2));

    setIsAnalyzing(true);

    try {
      const token = await user!.getIdToken();
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inputData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      console.log("Analysis Results:", JSON.stringify(data.diagnoses, null, 2));
    } catch (error) {
      console.error("Error during analysis:", error);
      alert(
        `Analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBack = () => {
    router.push("/dashboard");
  };

  if (loading || isLoadingSymptoms || isLoadingPets) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-600 text-lg font-medium">Loading...</p>
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
          Back to Dashboard
        </button>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white">
          <div className="flex items-center justify-center mb-8">
            <IconActivity className="text-red-500 mr-3" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">
              Diagnose Your Pet
            </h1>
          </div>
          <p className="text-gray-600 text-center mb-12">
            Select a pet, provide additional details if available, and choose
            symptoms.
          </p>

          {/* Pet Selection */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <IconPaw className="mr-2 text-amber-600" size={24} />
              Select Pet
            </h2>
            {petsError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center text-red-600">
                  <IconAlertTriangle size={20} className="mr-2" />
                  <p>{petsError}</p>
                </div>
              </div>
            ) : pets.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <IconAlertTriangle
                  className="mx-auto text-amber-500 mb-4"
                  size={48}
                />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No pets found
                </h3>
                <p className="text-gray-500">
                  Add a pet in your profile to start diagnosis.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pets.map((pet) => (
                  <div
                    key={pet.id}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedPetId === pet.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                    onClick={() => setSelectedPetId(pet.id)}
                  >
                    <div className="relative h-16 w-16 flex-shrink-0 mr-4">
                      <Image
                        src={pet.keyImage || "/placeholder-pet.jpg"}
                        alt={pet.name}
                        fill
                        className="object-cover rounded-full"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {pet.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {pet.species} - {pet.breed}, Age: {pet.age}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Attributes */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <IconEdit className="mr-2 text-blue-600" size={24} />
              Additional Pet Details (Optional)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconScale className="mr-2 text-gray-500" size={16} />
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g., 15.5"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconGenderMale className="mr-2 text-gray-500" size={16} />
                  Sex
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as typeof sex)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select sex</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isSterilized"
                  checked={isSterilized ?? false}
                  onChange={(e) => setIsSterilized(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="isSterilized"
                  className="ml-2 text-sm font-medium text-gray-700 flex items-center"
                >
                  <IconCheck className="mr-2 text-gray-500" size={16} />
                  Sterilized
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconActivityHeartbeat
                    className="mr-2 text-gray-500"
                    size={16}
                  />
                  Activity Level
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) =>
                    setActivityLevel(e.target.value as typeof activityLevel)
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select activity level</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconApple className="mr-2 text-gray-500" size={16} />
                  Diet Type
                </label>
                <select
                  value={dietType}
                  onChange={(e) =>
                    setDietType(e.target.value as typeof dietType)
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select diet type</option>
                  <option value="DRY">Dry</option>
                  <option value="WET">Wet</option>
                  <option value="BARF">BARF</option>
                  <option value="HOMEMADE">Homemade</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconVirus className="mr-2 text-gray-500" size={16} />
                  Known Allergies (comma-separated)
                </label>
                <input
                  type="text"
                  value={knownAllergies}
                  onChange={(e) => setKnownAllergies(e.target.value)}
                  placeholder="e.g., peanuts, dairy"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="vaccinationUpToDate"
                  checked={vaccinationUpToDate ?? false}
                  onChange={(e) => setVaccinationUpToDate(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="vaccinationUpToDate"
                  className="ml-2 text-sm font-medium text-gray-700 flex items-center"
                >
                  <IconVaccine className="mr-2 text-gray-500" size={16} />
                  Vaccinations Up to Date
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconHome className="mr-2 text-gray-500" size={16} />
                  Environment Type
                </label>
                <select
                  value={environmentType}
                  onChange={(e) =>
                    setEnvironmentType(e.target.value as typeof environmentType)
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select environment type</option>
                  <option value="INDOOR">Indoor</option>
                  <option value="OUTDOOR">Outdoor</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconVirus className="mr-2 text-gray-500" size={16} />
                  Chronic Diseases (comma-separated)
                </label>
                <input
                  type="text"
                  value={chronicDiseases}
                  onChange={(e) => setChronicDiseases(e.target.value)}
                  placeholder="e.g., diabetes, arthritis"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <IconAlertTriangle className="mr-2 text-red-600" size={24} />
              Select Symptoms
            </h2>
            {symptomsError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center text-red-600">
                  <IconAlertTriangle size={20} className="mr-2" />
                  <p>{symptomsError}</p>
                </div>
              </div>
            ) : symptoms.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <IconAlertTriangle
                  className="mx-auto text-amber-500 mb-4"
                  size={48}
                />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No symptoms available
                </h3>
                <p className="text-gray-500">
                  Please check back later or contact support.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {symptoms.map((symptom) => (
                  <div
                    key={symptom.idSymptom}
                    className="flex items-start p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      id={`symptom-${symptom.idSymptom}`}
                      checked={selectedSymptoms.has(symptom.idSymptom)}
                      onChange={() => handleSymptomChange(symptom.idSymptom)}
                      className="mt-1 mr-4 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`symptom-${symptom.idSymptom}`}
                      className="flex-grow"
                    >
                      <h3 className="font-semibold text-gray-800">
                        {symptom.name}
                      </h3>
                      {symptom.description && (
                        <p className="text-sm text-gray-600">
                          {symptom.description}
                        </p>
                      )}
                      <span className="text-xs text-gray-500">
                        Severity: {symptom.defaultSeverity}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <div className="flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !selectedPetId}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-red-600 hover:to-orange-600 transition-all duration-300 transform hover:-translate-y-1 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <span>Wykonaj analizę</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

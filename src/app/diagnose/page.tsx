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
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

interface Symptom {
  idSymptom: number;
  code: string;
  name: string;
  description: string | null;
  defaultSeverity: string;
}

interface PetBasic {
  id: number;
  name: string;
  age: number;
  description: string | null;
  keyImage: string | null;
  species: string;
}

interface PetFull extends PetBasic {
  weight?: number | null;
  sex?: "MALE" | "FEMALE" | "UNKNOWN" | null;
  isSterilized?: boolean | null;
  activityLevel?: "LOW" | "MEDIUM" | "HIGH" | null;
  dietType?: "DRY" | "WET" | "BARF" | "HOMEMADE" | "OTHER" | null;
  knownAllergies?: string[];
  vaccinationUpToDate?: boolean | null;
  environmentType?: "INDOOR" | "OUTDOOR" | "MIXED" | null;
  chronicDiseases?: string[];
}

// Mapowania dla polskich nazw enumów
const SEX_MAP: Record<string, string> = {
  MALE: "Samiec",
  FEMALE: "Samica",
  UNKNOWN: "Nieznany",
};

const ACTIVITY_LEVEL_MAP: Record<string, string> = {
  LOW: "Niski",
  MEDIUM: "Średni",
  HIGH: "Wysoki",
};

const DIET_TYPE_MAP: Record<string, string> = {
  DRY: "Sucha",
  WET: "Mokra",
  BARF: "BARF",
  HOMEMADE: "Domowa",
  OTHER: "Inna",
};

const ENVIRONMENT_TYPE_MAP: Record<string, string> = {
  INDOOR: "Wewnątrz",
  OUTDOOR: "Na zewnątrz",
  MIXED: "Mieszany",
};

const SEVERITY_MAP: Record<string, string> = {
  LOW: "Niski",
  MODERATE: "Średni",
  HIGH: "Wysoki",
};

export default function DiagnosePet() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isLoadingSymptoms, setIsLoadingSymptoms] = useState(true);
  const [symptomsError, setSymptomsError] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<number>>(
    new Set()
  );
  const [pets, setPets] = useState<PetBasic[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(true);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedPet, setSelectedPet] = useState<PetFull | null>(null);
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
  const [showAllSymptoms, setShowAllSymptoms] = useState(false); // Nowy state dla collapse/expand symptomów

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

        // Fetch pets (basic data for selection)
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
        setSymptomsError(
          "Nie udało się załadować symptomów. Spróbuj ponownie."
        );
        setPetsError("Nie udało się załadować zwierząt. Spróbuj ponownie.");
      } finally {
        setIsLoadingSymptoms(false);
        setIsLoadingPets(false);
      }
    };

    fetchData();
  }, [user, loading, router]);

  // Load full pet data and prefill form when pet is selected
  useEffect(() => {
    const loadPetData = async () => {
      if (!selectedPetId || !user) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/pets/${selectedPetId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch pet details");
        }

        const data = await response.json();
        const pet = data.pet as PetFull;
        setSelectedPet(pet);

        // Prefill form with pet data
        setWeight(pet.weight?.toString() || "");
        setSex(pet.sex || "");
        setIsSterilized(pet.isSterilized || null);
        setActivityLevel(pet.activityLevel || "");
        setDietType(pet.dietType || "");
        setKnownAllergies(pet.knownAllergies?.join(", ") || "");
        setVaccinationUpToDate(pet.vaccinationUpToDate || null);
        setEnvironmentType(pet.environmentType || "");
        setChronicDiseases(pet.chronicDiseases?.join(", ") || "");
      } catch (err) {
        console.error("Error loading pet data:", err);
      }
    };

    loadPetData();
  }, [selectedPetId, user]);

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
    if (!selectedPetId || !selectedPet) {
      alert("Proszę najpierw wybrać zwierzę.");
      return;
    }

    // Construct inputData without petId, using selectedPet and form overrides
    const inputData = {
      name: selectedPet.name,
      age: Number(selectedPet.age),
      description: selectedPet.description || null,
      species: selectedPet.species,
      weight: weight ? parseFloat(weight) : selectedPet.weight || null,
      sex: sex || selectedPet.sex || null,
      isSterilized:
        isSterilized !== null ? isSterilized : selectedPet.isSterilized || null,
      activityLevel: activityLevel || selectedPet.activityLevel || null,
      dietType: dietType || selectedPet.dietType || null,
      knownAllergies: knownAllergies
        ? knownAllergies
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : selectedPet.knownAllergies || [],
      vaccinationUpToDate:
        vaccinationUpToDate !== null
          ? vaccinationUpToDate
          : selectedPet.vaccinationUpToDate || null,
      environmentType: environmentType || selectedPet.environmentType || null,
      chronicDiseases: chronicDiseases
        ? chronicDiseases
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : selectedPet.chronicDiseases || [],
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
        .filter((s): s is NonNullable<typeof s> => s !== null),
    };

    // Log the exact inputData sent to AI (without petId)
    console.log(
      "Input Data JSON (for AI):",
      JSON.stringify(inputData, null, 2)
    );

    setIsAnalyzing(true);

    try {
      const token = await user!.getIdToken();
      // Add petId back only for backend validation and DB save
      const body = { ...inputData, petId: selectedPetId };
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      console.log("Analysis Results:", JSON.stringify(data.diagnoses, null, 2));

      // NOWOŚĆ: Przekieruj do wyników zamiast alertu
      router.push(`/diagnose/results/${data.analysisId}`);
    } catch (error) {
      console.error("Error during analysis:", error);
      alert(
        `Analiza nie powiodła się: ${
          error instanceof Error ? error.message : "Nieznany błąd"
        }`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  if (loading || isLoadingSymptoms || isLoadingPets) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-600 text-lg font-medium">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Oblicz liczbę wyświetlanych symptomów: pierwsze 10, reszta pod collapse
  const visibleSymptoms = showAllSymptoms ? symptoms : symptoms.slice(0, 10);
  const hiddenSymptomsCount = symptoms.length - 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={handleBack}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6 transition-colors"
        >
          <IconArrowLeft className="mr-2" size={20} />
          Powrót do dashboardu
        </button>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white">
          <div className="flex items-center justify-center mb-8">
            <IconActivity className="text-blue-500 mr-3" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">
              Sprawdź zdrowie swojego pupila
            </h1>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-start">
              <IconAlertTriangle
                className="text-amber-600 mt-0.5 mr-3 flex-shrink-0"
                size={20}
              />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Ważna informacja:</p>
                <p>
                  Nasza platforma ma charakter wyłącznie edukacyjny i nie
                  stanowi substytutu profesjonalnej opieki weterynaryjnej.
                  Narzędzie to może pomóc w zidentyfikowaniu potencjalnych
                  obszarów zainteresowania na podstawie podanych symptomów, ale
                  wyniki są jedynie sugestiami opartymi na ogólnej wiedzy.
                  Zawsze konsultuj się z certyfikowanym weterynarzem, aby
                  uzyskać dokładną diagnozę i zalecenia medyczne dostosowane do
                  stanu zdrowia Twojego pupila.
                </p>
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-center mb-12">
            Wybierz zwierzę, uzupełnij dodatkowe informacje o jego stanie i
            zaznacz obserwowane symptomy, aby uzyskać wstępne wskazówki.
          </p>

          {/* Pet Selection */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <IconPaw className="mr-2 text-amber-600" size={24} />
              Wybierz zwierzę
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
                  Nie znaleziono zwierząt
                </h3>
                <p className="text-gray-500">
                  Dodaj zwierzę w swoim profilu, aby rozpocząć diagnozę.
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
                        {pet.species}, Wiek: {pet.age}
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
              Dodatkowe szczegóły pupila (opcjonalne)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconScale className="mr-2 text-gray-500" size={16} />
                  Waga (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="np. 15.5"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconGenderMale className="mr-2 text-gray-500" size={16} />
                  Płeć
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as typeof sex)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Wybierz płeć</option>
                  {Object.entries(SEX_MAP).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
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
                  Wysterylizowany
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconActivityHeartbeat
                    className="mr-2 text-gray-500"
                    size={16}
                  />
                  Poziom aktywności
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) =>
                    setActivityLevel(e.target.value as typeof activityLevel)
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Wybierz poziom aktywności</option>
                  {Object.entries(ACTIVITY_LEVEL_MAP).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconApple className="mr-2 text-gray-500" size={16} />
                  Typ diety
                </label>
                <select
                  value={dietType}
                  onChange={(e) =>
                    setDietType(e.target.value as typeof dietType)
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Wybierz typ diety</option>
                  {Object.entries(DIET_TYPE_MAP).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconVirus className="mr-2 text-gray-500" size={16} />
                  Znane alergie (oddzielone przecinkami)
                </label>
                <input
                  type="text"
                  value={knownAllergies}
                  onChange={(e) => setKnownAllergies(e.target.value)}
                  placeholder="np. orzechy, nabiał"
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
                  Szczepienia na bieżąco
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconHome className="mr-2 text-gray-500" size={16} />
                  Typ środowiska
                </label>
                <select
                  value={environmentType}
                  onChange={(e) =>
                    setEnvironmentType(e.target.value as typeof environmentType)
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Wybierz typ środowiska</option>
                  {Object.entries(ENVIRONMENT_TYPE_MAP).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <IconVirus className="mr-2 text-gray-500" size={16} />
                  Przewlekłe choroby (oddzielone przecinkami)
                </label>
                <input
                  type="text"
                  value={chronicDiseases}
                  onChange={(e) => setChronicDiseases(e.target.value)}
                  placeholder="np. cukrzyca, artretyzm"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <IconAlertTriangle className="mr-2 text-red-600" size={24} />
              Wybierz symptomy (opcjonalnie)
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
                  Brak dostępnych objawów
                </h3>
                <p className="text-gray-500">
                  Sprawdź później lub skontaktuj się z pomocą.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleSymptoms.map((symptom) => (
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
                        Ciężkość:{" "}
                        {SEVERITY_MAP[symptom.defaultSeverity] ||
                          symptom.defaultSeverity}
                      </span>
                    </label>
                  </div>
                ))}
                {hiddenSymptomsCount > 0 && (
                  <button
                    onClick={() => setShowAllSymptoms(!showAllSymptoms)}
                    className="w-full flex items-center justify-center p-3 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors"
                  >
                    {showAllSymptoms ? (
                      <>
                        <IconChevronUp className="mr-2" size={16} />
                        Ukryj dodatkowe symptomy ({hiddenSymptomsCount})
                      </>
                    ) : (
                      <>
                        <IconChevronDown className="mr-2" size={16} />
                        Pokaż wszystkie symptomy ({hiddenSymptomsCount} więcej)
                      </>
                    )}
                  </button>
                )}
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
                  <span>Analizowanie...</span>
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

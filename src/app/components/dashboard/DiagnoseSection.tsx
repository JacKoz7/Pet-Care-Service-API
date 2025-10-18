import { User } from "firebase/auth";
import {
  IconActivity,
  IconStethoscope,
  IconCalendar,
} from "@tabler/icons-react";

interface AnalysisSummary {
  idAnalysis: number;
  createdAt: string;
  petName: string;
}

interface DiagnoseSectionProps {
  user: User | null | undefined;
  onDiagnosePet: () => void;
  showDiagnoses: boolean;
  onToggleDiagnoses: () => void;
  analyses: AnalysisSummary[];
  isLoadingAnalyses: boolean;
  onViewDiagnosis: (id: number) => void;
}

export default function DiagnoseSection({
  user,
  onDiagnosePet,
  showDiagnoses,
  onToggleDiagnoses,
  analyses,
  isLoadingAnalyses,
  onViewDiagnosis,
}: DiagnoseSectionProps) {
  return (
    <>
      {user && (
        <div className="mb-8 text-center">
          <button
            onClick={onDiagnosePet}
            className="flex items-center justify-center mx-auto bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-red-600 hover:to-orange-600 transition-all duration-300 transform hover:-translate-y-1 shadow-xl hover:shadow-2xl"
          >
            <IconActivity size={24} className="mr-3" />
            Sprawdź zdrowie swojego pupila
          </button>
        </div>
      )}

      {user && showDiagnoses && (
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <IconStethoscope className="text-red-500 mr-2" size={24} />
              <h2 className="text-2xl font-semibold text-gray-800">
                Moje Diagnozy
              </h2>
            </div>
            <button
              onClick={onToggleDiagnoses}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Ukryj
            </button>
          </div>

          {isLoadingAnalyses ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-red-600 text-lg font-medium">
                  Ładowanie diagnoz...
                </p>
              </div>
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-12">
              <IconStethoscope
                className="mx-auto text-gray-400 mb-4"
                size={48}
              />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Brak diagnoz
              </h3>
              <p className="text-gray-500">
                Przeprowadź pierwszą analizę, aby zobaczyć wyniki.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyses.map((analysis) => (
                <div
                  key={analysis.idAnalysis}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => onViewDiagnosis(analysis.idAnalysis)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">
                      {analysis.petName}
                    </h3>
                    <IconCalendar className="text-gray-500" size={16} />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {new Date(analysis.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                  <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-xl font-medium text-sm hover:from-indigo-700 hover:to-purple-700 transition-all">
                    Zobacz szczegóły
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

import { IconSearch } from "@tabler/icons-react";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-white">
      <div className="flex items-center max-w-2xl mx-auto">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IconSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search for cities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
}
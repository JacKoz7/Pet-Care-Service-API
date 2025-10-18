import { IconPaw } from "@tabler/icons-react";

export default function FeaturesSection() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white">
      <h2 className="text-2xl font-semibold text-gray-800 text-center mb-8">
        Why Choose Our Service?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-indigo-50 rounded-2xl transition-all duration-300 hover:bg-indigo-100">
          <div className="inline-flex items-center justify-center bg-indigo-100 w-16 h-16 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Trusted Professionals
          </h3>
          <p className="text-gray-600 text-sm">
            All our service providers are verified and experienced with pets.
          </p>
        </div>
        <div className="text-center p-6 bg-amber-50 rounded-2xl transition-all duration-300 hover:bg-amber-100">
          <div className="inline-flex items-center justify-center bg-amber-100 w-16 h-16 rounded-full mb-4">
            <IconPaw className="text-amber-600" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Wide Range of Services
          </h3>
          <p className="text-gray-600 text-sm">
            From grooming to walking, we offer everything your pet needs.
          </p>
        </div>
        <div className="text-center p-6 bg-purple-50 rounded-2xl transition-all duration-300 hover:bg-purple-100">
          <div className="inline-flex items-center justify-center bg-purple-100 w-16 h-16 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Available 24/7
          </h3>
          <p className="text-gray-600 text-sm">
            Book services anytime, anywhere with our easy-to-use platform.
          </p>
        </div>
      </div>
    </div>
  );
}
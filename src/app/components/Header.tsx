"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Header() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const words = ["Where", "every", "pet", "feels", "at", "home"];

  return (
    <>
      <header className="relative w-full overflow-hidden bg-gradient-to-br from-sky-50 via-purple-50 to-pink-50">
        {/* Moving blurred background */}
        <div className="absolute inset-0 opacity-60">
          <div className="absolute inset-0 animate-gradient-shift bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 blur-3xl"></div>
        </div>

        {/* Floating pets */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 opacity-80 animate-float-slow">
            <Image
              src="/pet.png"
              alt="Cute pet"
              width={180}
              height={180}
              className="drop-shadow-xl"
              priority
            />
          </div>

          <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 opacity-80 animate-float-slow-delayed">
            <Image
              src="/sp.png"
              alt="Happy pet"
              width={180}
              height={180}
              className="drop-shadow-xl"
              priority
            />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 flex flex-col items-center justify-center text-center">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-2xl leading-tight animate-float">
            PetStayTion
          </h1>

          {/* Fast word-by-word wave subtitle */}
          <p className="mt-8 text-xl md:text-2xl lg:text-3xl font-medium tracking-wider">
            {words.map((word, i) => (
              <span
                key={i}
                className="inline-block mx-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-md"
                style={{
                  animation: "waveWord 6s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                }}
              >
                {word}
              </span>
            ))}
          </p>
        </div>

        {/* Bottom infinite wave */}
        <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden">
          <svg
            viewBox="0 0 2880 100"
            className="absolute bottom-0 w-full h-32 text-white"
            preserveAspectRatio="none"
          >
            <path
              d="M0,80 C360,60 1080,100 1440,80 C1800,60 2520,100 2880,80 
                 C3240,60 3960,100 4320,80 L4320,100 L0,100 Z"
              fill="currentColor"
              opacity="0.65"
              className="animate-infinite-wave"
            />
          </svg>
        </div>
      </header>

      <style jsx>{`
        @keyframes gradient-shift {
          0%,
          100% {
            transform: translateX(-50%) translateY(-50%);
          }
          50% {
            transform: translateX(50%) translateY(50%);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(3deg);
          }
        }

        @keyframes float-slow-delayed {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(-3deg);
          }
        }

        @keyframes infinite-wave {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-1440px);
          }
        }

        /* Fast per-word wave */
        @keyframes waveWord {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          15% {
            transform: translateY(-14px) rotate(1.5deg);
          }
          30% {
            transform: translateY(4px) rotate(-1deg);
          }
          45%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
        }

        .animate-gradient-shift {
          animation: gradient-shift 30s ease-in-out infinite;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }
        .animate-float-slow-delayed {
          animation: float-slow-delayed 12s ease-in-out 1.2s infinite;
        }
        .animate-infinite-wave {
          animation: infinite-wave 24s linear infinite;
        }
      `}</style>
    </>
  );
}
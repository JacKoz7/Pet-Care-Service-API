// src/app/sign-up/page.tsx (updated)
"use client";

import { User } from "firebase/auth";
import { auth } from "../firebase";
import { IconFidgetSpinner, IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  useCreateUserWithEmailAndPassword,
  useSendEmailVerification,
} from "react-firebase-hooks/auth";
import EmailVerificationPopup from "../components/EmailVerificationPopUp";
import { useAuth } from "../context/AuthContext";

interface City {
  idCity: number;
  name: string;
}

export default function Page() {
  const router = useRouter();
  const { user, loading } = useAuth(); // Get auth state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [createUser, createdUser, createLoading, firebaseError] =
    useCreateUserWithEmailAndPassword(auth);
  const [sendEmailVerification] = useSendEmailVerification(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [createdUserState, setCreatedUserState] = useState<User | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    cityId: "",
  });
  const [error, setError] = useState("");

  // Redirect if user is logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard"); // Redirect to main page
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch("/api/cities");
        const data = await response.json();
        setCities(data.cities || []);
      } catch (error) {
        console.error("Error fetching cities:", error);
      }
    };
    fetchCities();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (!formData.cityId) {
      setError("City is required");
      return false;
    }
    if (
      formData.phoneNumber &&
      (formData.phoneNumber.length !== 9 || !/^\d+$/.test(formData.phoneNumber))
    ) {
      setError("Phone number must be exactly 9 digits");
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError("");

      const firebaseResult = await createUser(
        formData.email,
        formData.password
      );
      if (!firebaseResult) {
        setError("Failed to create Firebase account");
        return;
      }

      await sendEmailVerification();

      // Immediately create DB user with isVerified: false
      const dbResponse = await fetch("/api/user/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: firebaseResult.user.uid,
          email: formData.email,
          firstName: formData.firstName || null,
          lastName: formData.lastName || null,
          phoneNumber: formData.phoneNumber || null,
          cityId: Number(formData.cityId),
        }),
      });

      if (!dbResponse.ok) {
        const errorData = await dbResponse.json();
        await firebaseResult.user.delete(); // Cleanup on failure
        setError(errorData.error || "Failed to create user profile");
        return;
      }

      setCreatedUserState(firebaseResult.user);
      setShowVerificationPopup(true);
    } catch (error) {
      console.error("Firebase creation error:", error);
      setError("Failed to create Firebase account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSuccess = async () => {
    if (createdUserState) {
      try {
        await createdUserState.reload();

        const verifyResponse = await fetch(
          `/api/user/verify-email/${createdUserState.uid}`,
          {
            method: "PATCH", // Zmiana na PATCH
          }
        );

        if (verifyResponse.ok) {
          setShowVerificationPopup(false);
          router.push("/");
        } else {
          const data = await verifyResponse.json();
          setError(data.error || "Verification failed");
          // Optional: cleanup if needed
        }
      } catch (error) {
        console.error("Registration completion error:", error);
        setError("Failed to complete registration. Please try again.");
      }
    }
  };

  const handleFillUser = () => {
    const cityId = cities[0]?.idCity.toString() || "";
    setFormData({
      email: "jackkoz999@gmail.com",
      password: "jacek123",
      confirmPassword: "jacek123",
      firstName: "Jacek",
      lastName: "User",
      phoneNumber: "123456789",
      cityId,
    });
  };

  const handleFillAdmin = () => {
    const cityId = cities[0]?.idCity.toString() || "";
    setFormData({
      email: "jacuskozlowski@gmail.com",
      password: "jacek123",
      confirmPassword: "jacek123",
      firstName: "Jacek",
      lastName: "Admin",
      phoneNumber: "123456789",
      cityId,
    });
  };

  // Show loading state while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }

  // Render sign-up page if not logged in
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-20">
      <div className="max-w-5xl mx-auto w-full flex flex-row gap-8">
        <div className="max-w-md w-full">
          <button
            onClick={() => router.push("/")}
            className="mb-4 flex items-center text-blue-500 hover:text-blue-700"
          >
            <IconArrowLeft size={20} className="mr-2" />
            Back to Home
          </button>
          <h1 className="text-3xl font-bold mb-6 text-center">
            Create Account
          </h1>
          {createLoading || isSubmitting ? (
            <IconFidgetSpinner className="animate-spin w-8 h-8 mx-auto" />
          ) : (
            <div>
              <input
                type="email"
                name="email"
                onChange={handleInputChange}
                value={formData.email}
                placeholder="Email *"
                className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
              />
              <input
                type="password"
                name="password"
                onChange={handleInputChange}
                value={formData.password}
                placeholder="Password *"
                className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
              />
              <input
                type="password"
                name="confirmPassword"
                onChange={handleInputChange}
                value={formData.confirmPassword}
                placeholder="Confirm Password *"
                className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
              />
              <input
                type="text"
                name="firstName"
                onChange={handleInputChange}
                value={formData.firstName}
                placeholder="First Name"
                className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
              />
              <input
                type="text"
                name="lastName"
                onChange={handleInputChange}
                value={formData.lastName}
                placeholder="Last Name"
                className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
              />
              <input
                type="tel"
                name="phoneNumber"
                onChange={handleInputChange}
                value={formData.phoneNumber}
                placeholder="Phone Number (9 digits)"
                className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
                maxLength={9}
              />
              <select
                name="cityId"
                onChange={handleInputChange}
                value={formData.cityId}
                className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
                required
              >
                <option value="">Select City *</option>
                {cities.map((city) => (
                  <option key={city.idCity} value={city.idCity}>
                    {city.name}
                  </option>
                ))}
              </select>

              {(error || firebaseError) && (
                <p className="text-red-500 mb-4 text-center">
                  {error || firebaseError?.message}
                </p>
              )}

              <button
                className="bg-yellow-500 text-black px-4 py-2 rounded-md font-bold hover:bg-yellow-600 w-full disabled:opacity-50"
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                SIGN UP
              </button>
            </div>
          )}
        </div>

        <div className="max-w-xs w-full flex flex-col justify-center">
          <h2 className="text-xl font-bold mb-4">Quick Fill Options</h2>
          <button
            onClick={handleFillUser}
            className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4 hover:bg-blue-600"
          >
            Fill User Data
          </button>
          <button
            onClick={handleFillAdmin}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            Fill Admin Data
          </button>
        </div>
      </div>

      {showVerificationPopup && createdUserState && (
        <EmailVerificationPopup
          user={createdUserState}
          onVerified={handleVerificationSuccess}
        />
      )}
    </div>
  );
}

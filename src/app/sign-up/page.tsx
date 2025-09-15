"use client";
import { auth } from "../firebase";
import { IconFidgetSpinner } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  useCreateUserWithEmailAndPassword,
  useSendEmailVerification,
} from "react-firebase-hooks/auth";

interface City {
  idCity: number;
  name: string;
}

export default function Page() {
  const router = useRouter();
  const [createUser, user, loading, firebaseError] =
    useCreateUserWithEmailAndPassword(auth);
  const [sendEmailVerification] = useSendEmailVerification(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Pobierz listę miast
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

      // 1. Najpierw utwórz użytkownika w Firebase
      const firebaseResult = await createUser(
        formData.email,
        formData.password
      );

      if (!firebaseResult) {
        setError("Failed to create Firebase account");
        return;
      }

      // 2. Następnie dodaj do bazy danych
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: firebaseResult.user.uid,
          email: formData.email,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          phoneNumber: formData.phoneNumber || undefined,
          cityId: formData.cityId || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 3. Wyślij email weryfikacyjny
        await sendEmailVerification();
        alert(
          "Registration successful! Please check your email for verification."
        );
        router.push("/sign-in");
      } else {
        // Jeśli baza danych się nie powiodła, usuń użytkownika z Firebase
        await firebaseResult.user.delete();
        setError(data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center flex-col min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-8">Create account</h1>
      {loading || isSubmitting ? (
        <IconFidgetSpinner className="animate-spin w-8 h-8" />
      ) : (
        <div className="w-full max-w-md">
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
          >
            <option value="">Select City (Optional)</option>
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
  );
}

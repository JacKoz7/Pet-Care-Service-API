import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "dotenv";
import fetch from "node-fetch";

config({ path: ".env.local" });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error("Missing Firebase Admin SDK credentials in .env.local");
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

async function generateToken(isAdmin = false) {
  try {
    const email = isAdmin ? process.env.ADMIN_EMAIL : "testuser@example.com";
    const password = isAdmin ? process.env.ADMIN_PASSWORD : "test123456";

    if (!email || !password) {
      throw new Error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local");
    }

    const auth = getAuth();

    // Check if user exists, create if not
    let user;
    try {
      user = await auth.getUserByEmail(email);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      user = await auth.createUser({
        email,
        password,
        emailVerified: true,
      });
      console.log(`Created user with email: ${email}`);
    }

    // Generate a custom token
    const customToken = await auth.createCustomToken(user.uid);

    // Exchange custom token for ID token using Firebase REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to exchange custom token");
    }

    console.log(`ID Token for ${isAdmin ? "admin" : "normal"} user (${email}):`);
    console.log(data.idToken);
    return data.idToken;
  } catch (error) {
    console.error("Error generating token:", error);
    process.exit(1);
  }
}

const isAdmin = process.argv.includes("--admin");
generateToken(isAdmin);

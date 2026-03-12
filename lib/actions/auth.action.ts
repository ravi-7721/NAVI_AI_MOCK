"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

// Firebase session token lifetime (cookie itself is session-only).
const SESSION_DURATION_MS = 60 * 60 * 12 * 1000; // 12 hours
const DEFAULT_USER_SETTINGS: UserSettings = {
  preferredRole: "Software Engineer",
  preferredLevel: "Mid",
  preferredType: "Mixed",
  preferredTechStack: ["JavaScript", "React", "Node.js"],
  interviewGoal: "Improve confidence and answer clarity.",
};

const normalizeHobbies = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 10);
};

const isUploadFileLike = (value: FormDataEntryValue | null | undefined): value is File => {
  if (!value || typeof value === "string") return false;

  const file = value as Partial<File>;
  return (
    typeof file.size === "number" &&
    typeof file.arrayBuffer === "function" &&
    typeof file.name === "string"
  );
};

const fileToDataUrl = async (file: File) => {
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
};

// Set session cookie
export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  // Create session cookie
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });

  // Set session cookie (no maxAge/expires) so it is cleared when browser closes.
  cookieStore.set("session", sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;

  try {
    // check if user exists in db
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists)
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };

    // save user to db
    await db.collection("users").doc(uid).set({
      name,
      email,
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: unknown) {
    console.error("Error creating user:", error);

    // Handle Firebase specific errors
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "auth/email-already-exists"
    ) {
      return {
        success: false,
        message: "This email is already in use",
      };
    }

    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  try {
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord)
      return {
        success: false,
        message: "User does not exist. Create an account.",
      };

    await setSessionCookie(idToken);
    return { success: true };
  } catch {
    console.log("");

    return {
      success: false,
      message: "Failed to log into account. Please try again.",
    };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete("session");
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    // get user info from db
    const userRecord = await db
      .collection("users")
      .doc(decodedClaims.uid)
      .get();
    if (!userRecord.exists) return null;

    return {
      ...userRecord.data(),
      id: userRecord.id,
    } as User;
  } catch (error) {
    console.log(error);

    // Invalid or expired session
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const userRecord = await db.collection("users").doc(userId).get();
    const rawSettings = userRecord.data()?.settings;

    if (!rawSettings) return DEFAULT_USER_SETTINGS;

    return {
      preferredRole:
        typeof rawSettings.preferredRole === "string" &&
        rawSettings.preferredRole.trim()
          ? rawSettings.preferredRole.trim()
          : DEFAULT_USER_SETTINGS.preferredRole,
      preferredLevel:
        rawSettings.preferredLevel === "Junior" ||
        rawSettings.preferredLevel === "Mid" ||
        rawSettings.preferredLevel === "Senior"
          ? rawSettings.preferredLevel
          : DEFAULT_USER_SETTINGS.preferredLevel,
      preferredType:
        rawSettings.preferredType === "Technical" ||
        rawSettings.preferredType === "Behavioral" ||
        rawSettings.preferredType === "Mixed"
          ? rawSettings.preferredType
          : DEFAULT_USER_SETTINGS.preferredType,
      preferredTechStack: Array.isArray(rawSettings.preferredTechStack)
        ? rawSettings.preferredTechStack
            .map((item: unknown) => String(item).trim())
            .filter(Boolean)
            .slice(0, 10)
        : DEFAULT_USER_SETTINGS.preferredTechStack,
      interviewGoal:
        typeof rawSettings.interviewGoal === "string" &&
        rawSettings.interviewGoal.trim()
          ? rawSettings.interviewGoal.trim()
          : DEFAULT_USER_SETTINGS.interviewGoal,
    };
  } catch (error) {
    console.error("Error getting user settings:", error);
    return DEFAULT_USER_SETTINGS;
  }
}

export async function updateUserSettings(
  userId: string,
  settings: UserSettings,
): Promise<boolean> {
  try {
    await db.collection("users").doc(userId).set(
      {
        settings: {
          preferredRole: settings.preferredRole.trim() || DEFAULT_USER_SETTINGS.preferredRole,
          preferredLevel: settings.preferredLevel,
          preferredType: settings.preferredType,
          preferredTechStack: settings.preferredTechStack
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 10),
          interviewGoal: settings.interviewGoal.trim() || DEFAULT_USER_SETTINGS.interviewGoal,
        },
      },
      { merge: true },
    );

    return true;
  } catch (error) {
    console.error("Error updating user settings:", error);
    return false;
  }
}

export async function updateUserProfile(
  userId: string,
  profile: {
    name?: string;
    profileURL?: string;
    profileImage?: FormDataEntryValue | null;
    dateOfBirth?: string;
    age?: number;
    education?: string;
    hobbies?: string[];
    personalDetails?: string;
  },
): Promise<boolean> {
  try {
    const nextProfileUrl =
      isUploadFileLike(profile.profileImage) && profile.profileImage.size > 0
        ? await fileToDataUrl(profile.profileImage)
        : String(profile.profileURL || "").trim();

    await db.collection("users").doc(userId).set(
      {
        name: (profile.name || "").trim(),
        profileURL: nextProfileUrl,
        dateOfBirth: (profile.dateOfBirth || "").trim(),
        age:
          typeof profile.age === "number" && Number.isFinite(profile.age)
            ? Math.max(0, Math.min(120, Math.round(profile.age)))
            : null,
        education: (profile.education || "").trim(),
        hobbies: normalizeHobbies(profile.hobbies),
        personalDetails: (profile.personalDetails || "").trim(),
      },
      { merge: true },
    );

    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return false;
  }
}

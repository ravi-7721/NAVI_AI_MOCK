import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import { getAuth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";

type FirebaseAdminServiceMap = {
  auth: Auth;
  db: Firestore;
};

let services: FirebaseAdminServiceMap | null = null;

const getRequiredEnv = (
  key: "FIREBASE_PROJECT_ID" | "FIREBASE_CLIENT_EMAIL" | "FIREBASE_PRIVATE_KEY",
) => {
  const value = process.env[key];

  if (!value?.trim()) {
    throw new Error(`Missing required Firebase Admin environment variable: ${key}`);
  }

  return value;
};

function initFirebaseAdmin(): FirebaseAdminServiceMap {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
        clientEmail: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
        privateKey: getRequiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
      }),
    });

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}

const getFirebaseAdmin = () => {
  if (!services) {
    services = initFirebaseAdmin();
  }

  return services;
};

const createLazyService = <T extends object>(
  serviceName: keyof FirebaseAdminServiceMap,
): T =>
  new Proxy({} as T, {
    get(_target, prop: PropertyKey) {
      const service = getFirebaseAdmin()[serviceName] as T & Record<PropertyKey, unknown>;
      const value = service[prop];

      return typeof value === "function" ? value.bind(service) : value;
    },
  });

export const auth = createLazyService<Auth>("auth");
export const db = createLazyService<Firestore>("db");

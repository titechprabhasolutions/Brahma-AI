export const firebaseConfig = {
  apiKey: "AIzaSyBmc1XJ9aoEiTttk6XOdZ7TT2jIbB_NqRM",
  authDomain: "buildonaut-neural-agent.firebaseapp.com",
  projectId: "buildonaut-neural-agent",
  storageBucket: "buildonaut-neural-agent.firebasestorage.app",
  messagingSenderId: "365000528676",
  appId: "1:365000528676:web:dd1075929d2f5d762fd9b1",
  measurementId: "G-Q752C1TYTF",
};

const FIREBASE_AUTH_BASE = "https://identitytoolkit.googleapis.com/v1/accounts:";
let firebaseSdkPromise = null;

function normalizeFirebaseMessage(data, fallback) {
  const message = data?.error?.message || fallback || "Firebase authentication failed.";
  return message.replaceAll("_", " ");
}

async function authRequest(path, payload) {
  const response = await fetch(`${FIREBASE_AUTH_BASE}${path}?key=${firebaseConfig.apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(normalizeFirebaseMessage(data));
  }
  return data;
}

// Load the hosted Firebase SDK only when the user explicitly needs popup auth or
// current-user operations, so a network/import failure cannot block app startup.
async function loadFirebaseSdk() {
  if (!firebaseSdkPromise) {
    firebaseSdkPromise = (async () => {
      const [appModule, authModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"),
      ]);

      const app = appModule.getApps().length
        ? appModule.getApp()
        : appModule.initializeApp(firebaseConfig);
      const auth = authModule.getAuth(app);
      return { auth, authModule };
    })();
  }
  return firebaseSdkPromise;
}

export async function createFirebaseUser(email, password) {
  return authRequest("signUp", {
    email,
    password,
    returnSecureToken: true,
  });
}

export async function signInFirebaseUser(email, password) {
  return authRequest("signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
}

export async function signInWithGoogleFirebase() {
  try {
    const { auth, authModule } = await loadFirebaseSdk();
    const provider = new authModule.GoogleAuthProvider();
    const result = await authModule.signInWithPopup(auth, provider);
    return {
      email: result.user?.email || "",
      localId: result.user?.uid || "",
      displayName: result.user?.displayName || "",
      photoURL: result.user?.photoURL || "",
    };
  } catch (error) {
    throw new Error(normalizeFirebaseMessage(null, error?.message || "Google sign-in failed."));
  }
}

export async function sendFirebasePasswordReset(email) {
  await authRequest("sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
  });
}

export async function deleteCurrentFirebaseUser() {
  throw new Error("Delete account is not available until a full Firebase desktop session is initialized.");
}

export async function signOutFirebaseUser() {
  try {
    const { auth, authModule } = await loadFirebaseSdk();
    await authModule.signOut(auth);
  } catch {
    // Local app state is cleared separately, so sign-out should not block logout.
  }
}

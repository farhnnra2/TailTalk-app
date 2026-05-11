import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfigJSON from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJSON.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJSON.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJSON.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJSON.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJSON.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJSON.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJSON.measurementId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (firebaseConfigJSON as any).firestoreDatabaseId;
export const db = getFirestore(app, databaseId);

const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync user to Firestore - only update lastLogin if user already exists
    // to avoid overwriting long photoURLs stored in Firestore that Auth can't hold
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDocFromServer(userRef).catch(() => null);

    if (!userDoc || !userDoc.exists()) {
      // New user: set everything
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } else {
      // Existing user: only update lastLogin to avoid overwriting long photoURLs
      await setDoc(userRef, {
        lastLogin: serverTimestamp()
      }, { merge: true });
    }

    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Connection test
async function testConnection() {
  const criticalKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingCritical = criticalKeys.filter(key => !(firebaseConfig as any)[key]);

  if (missingCritical.length > 0) {
    console.warn(`Critical Firebase configuration missing: ${missingCritical.join(', ')}`);
    console.info("Please set these values in the 'Settings' -> 'Secrets' menu in AI Studio.");
    return;
  }

  // Check for optional but recommended keys
  const optionalKeys = ['messagingSenderId', 'measurementId', 'storageBucket'];
  const missingOptional = optionalKeys.filter(key => !(firebaseConfig as any)[key]);
  if (missingOptional.length > 0) {
    console.info(`Optional Firebase features might be limited. Missing: ${missingOptional.join(', ')}`);
  }

  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log("Firebase connection established successfully.");
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network connection.");
    } else {
      console.error("Firebase connection test failed:", error);
    }
  }
}
testConnection();

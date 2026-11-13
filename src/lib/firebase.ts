import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithPopup,
  unlink,
  signOut,
  User,
  UserCredential,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

// Test connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function mapFirebaseUserToProfile(
  fbUser: User,
  existing?: Partial<UserProfile> | null
): UserProfile {
  const googleData = fbUser.providerData.find((p) => p.providerId === 'google.com');
  const githubData = fbUser.providerData.find((p) => p.providerId === 'github.com');

  const githubUsernameFromProvider =
    (fbUser as any)?.reloadUserInfo?.screenName ||
    githubData?.displayName ||
    existing?.githubUsername ||
    (githubData ? (githubData.email || '').split('@')[0] : undefined);

  return {
    id: fbUser.uid,
    name: fbUser.displayName || existing?.name || fbUser.email?.split('@')[0] || 'Pengguna',
    email: fbUser.email || existing?.email || `${fbUser.uid}@firebase.user`,
    role: existing?.role || 'Guru',
    school: existing?.school || 'Satuan Pendidikan',
    teachingSubject: existing?.teachingSubject || 'Umum',
    avatarUrl: fbUser.photoURL || existing?.avatarUrl || undefined,
    isGoogleLinked: Boolean(googleData || existing?.isGoogleLinked),
    googleEmail: googleData?.email || existing?.googleEmail || (googleData ? fbUser.email || undefined : undefined),
    isGithubLinked: Boolean(githubData || existing?.isGithubLinked),
    githubUsername: githubData ? githubUsernameFromProvider : existing?.githubUsername,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
}

export async function signInWithGoogleDevice(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider);
}

export async function linkGoogleDevice(): Promise<UserCredential> {
  if (auth.currentUser) {
    return linkWithPopup(auth.currentUser, googleProvider);
  }
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithGithubDevice(): Promise<UserCredential> {
  return signInWithPopup(auth, githubProvider);
}

export async function linkGithubDevice(): Promise<UserCredential> {
  if (auth.currentUser) {
    return linkWithPopup(auth.currentUser, githubProvider);
  }
  return signInWithPopup(auth, githubProvider);
}

export async function unlinkFirebaseProvider(providerId: 'google.com' | 'github.com'): Promise<void> {
  if (auth.currentUser) {
    const isLinked = auth.currentUser.providerData.some((p) => p.providerId === providerId);
    if (isLinked && auth.currentUser.providerData.length > 1) {
      await unlink(auth.currentUser, providerId);
    }
  }
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(auth);
}

export async function syncUserProfileToFirestore(profile: UserProfile): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== profile.id) return;
  const path = `users/${profile.id}`;
  try {
    const payload: Record<string, any> = {
      uid: profile.id.slice(0, 128),
      name: profile.name.slice(0, 120),
      email: profile.email.slice(0, 200),
      role: profile.role,
      school: (profile.school || 'Satuan Pendidikan').slice(0, 160),
      teachingSubject: (profile.teachingSubject || 'Umum').slice(0, 120),
      isGoogleLinked: Boolean(profile.isGoogleLinked),
      isGithubLinked: Boolean(profile.isGithubLinked),
      createdAt: (profile.createdAt || new Date().toISOString()).slice(0, 64),
    };
    if (profile.avatarUrl) payload.avatarUrl = profile.avatarUrl.slice(0, 500);
    if (profile.googleEmail) payload.googleEmail = profile.googleEmail.slice(0, 200);
    if (profile.githubUsername) payload.githubUsername = profile.githubUsername.slice(0, 100);

    await setDoc(doc(db, 'users', profile.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserProfileFromFirestore(uid: string): Promise<Partial<UserProfile> | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return null;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: data.uid || uid,
      name: data.name,
      email: data.email,
      role: data.role,
      school: data.school,
      teachingSubject: data.teachingSubject,
      avatarUrl: data.avatarUrl,
      isGoogleLinked: data.isGoogleLinked,
      googleEmail: data.googleEmail,
      isGithubLinked: data.isGithubLinked,
      githubUsername: data.githubUsername,
      createdAt: data.createdAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

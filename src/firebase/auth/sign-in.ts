'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
} from 'firebase/auth';

export async function signInWithGoogle(auth: Auth): Promise<UserCredential | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    console.error('Error during sign-in with popup:', error);
    return null;
  }
}

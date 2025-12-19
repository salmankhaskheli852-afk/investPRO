'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

export async function signInWithGoogle(auth: Auth): Promise<UserCredential | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'auth/cancelled-popup-request') {
      // User closed the popup, this is not a technical error.
      // We can ignore it or handle it silently.
    } else {
      // For any other errors, we should still log them.
      console.error('Error during sign-in with popup:', error);
    }
    return null;
  }
}

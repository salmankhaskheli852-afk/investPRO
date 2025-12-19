'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';

export async function signInWithGoogle(auth: Auth) {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error('Error during sign-in with redirect:', error);
  }
}

export async function handleRedirectResult(auth: Auth) {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // This is the signed-in user
      const user = result.user;
      // You can also get the Google Access Token if you need it.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      return { user, token };
    }
    return { user: null, token: null };
  } catch (error) {
    console.error('Error handling redirect result:', error);
    return { user: null, token: null };
  }
}

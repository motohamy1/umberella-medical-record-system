'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await auth.signIn.email({ email, password });

  if (error) {
    return { error: error.message || 'Failed to sign in. Try again.' };
  }

  // Role routing: patients -> /patient, staff -> /clinic (heuristic; replace with DB role lookup later)
  if (email.toLowerCase().includes('patient')) {
    redirect('/patient');
  } else {
    redirect('/clinic');
  }
}

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = (formData.get('name') as string) || email.split('@')[0];

  const { error } = await auth.signUp.email({ email, name, password });

  if (error) {
    return { error: error.message || 'Failed to create account.' };
  }

  if (email.toLowerCase().includes('patient')) {
    redirect('/patient');
  } else {
    redirect('/clinic');
  }
}

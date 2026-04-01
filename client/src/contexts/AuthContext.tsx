import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  createdAt: Date;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (email: string, password: string, firstName: string, lastName?: string, phoneNumber?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign up new user
  async function signup(
    email: string,
    password: string,
    firstName: string,
    lastName?: string,
    phoneNumber?: string
  ) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: `${firstName} ${lastName || ''}`.trim()
      });

      // Create user profile in Firestore with Timestamp
      const profileData = {
        firstName,
        lastName: lastName || '',
        email,
        phoneNumber: phoneNumber || '',
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), profileData);
      setUserProfile(profileData as UserProfile);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  // Login existing user
  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  // Logout
  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  // Reset password
  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  // Update user profile
  async function updateUserProfile(data: Partial<UserProfile>) {
    if (!currentUser) throw new Error('No user logged in');

    await setDoc(doc(db, 'users', currentUser.uid), data, { merge: true });
    
    if (userProfile) {
      setUserProfile({ ...userProfile, ...data });
    }
  }

  // Load user profile from Firestore
  async function loadUserProfile(user: User) {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        // Profile doesn't exist yet - this is normal for new users
        // The profile will be created when they sign up
        setUserProfile(null);
      }
    } catch (error: any) {
      // Silently handle permission errors for non-existent profiles
      // This is expected when a user hasn't completed signup yet
      if (error?.code !== 'permission-denied') {
        console.error('Error loading user profile:', error);
      }
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

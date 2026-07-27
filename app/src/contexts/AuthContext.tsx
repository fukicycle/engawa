import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from '../firebase';
import type { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  updateProfileName: (name: string) => Promise<void>;
  joinFamily: (inviteCode: string) => Promise<void>;
  createFamily: (familyName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val() as UserProfile;
        return data;
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
    }
    return null;
  };

  const refreshProfile = async () => {
    if (!currentUser) return null;
    const profile = await fetchProfile(currentUser.uid);
    setUserProfile(profile);
    return profile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await fetchProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const updateProfileName = async (name: string) => {
    if (!currentUser) throw new Error("No user is logged in");
    const profileRef = ref(database, `users/${currentUser.uid}`);
    
    const updated: UserProfile = {
      uid: currentUser.uid,
      name,
      familyId: userProfile?.familyId || '',
      icon: userProfile?.icon || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`
    };

    await set(profileRef, updated);
    setUserProfile(updated);
  };

  const joinFamily = async (inviteCode: string) => {
    if (!currentUser || !userProfile) throw new Error("Authentication required");
    
        // Find family by invite code
    const familiesRef = ref(database, 'families');
    const snapshot = await get(familiesRef);
    let targetFamilyId = '';

    if (snapshot.exists()) {
      const familiesData = snapshot.val();
      for (const fid in familiesData) {
        if (familiesData[fid].inviteCode === inviteCode.trim()) {
          targetFamilyId = fid;
          break;
        }
      }
    }

    if (!targetFamilyId) {
      throw new Error("正しい招待コードを入力してください");
    }

    // Update family members
    const memberRef = ref(database, `families/${targetFamilyId}/members/${currentUser.uid}`);
    await set(memberRef, true);

    // Update user profile
    const updatedProfile: UserProfile = {
      ...userProfile,
      familyId: targetFamilyId
    };
    await set(ref(database, `users/${currentUser.uid}`), updatedProfile);
    setUserProfile(updatedProfile);
  };

  const createFamily = async (familyName: string) => {
    if (!currentUser || !userProfile) throw new Error("Authentication required");
    
    const newFamilyId = `fam_${Math.random().toString(36).substr(2, 9)}`;
    const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // e.g., 4G7T2Y

    const familyData = {
      id: newFamilyId,
      name: familyName,
      inviteCode,
      members: {
        [currentUser.uid]: true
      },
      createdAt: Date.now()
    };

    // Save family
    await set(ref(database, `families/${newFamilyId}`), familyData);

    // Update user profile
    const updatedProfile: UserProfile = {
      ...userProfile,
      familyId: newFamilyId
    };
    await set(ref(database, `users/${currentUser.uid}`), updatedProfile);
    setUserProfile(updatedProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    refreshProfile,
    updateProfileName,
    joinFamily,
    createFamily,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import React, { createContext, useContext, useState } from 'react';

/**
 * Ultra-simple "auth" for a 3-member family.
 * The member just picks their name on first use — stored in localStorage.
 * No passwords, no Firebase, no backend.
 */

export const FAMILY_MEMBERS = ['Tony', 'Member 2', 'Member 3'] as const;
export type MemberName = (typeof FAMILY_MEMBERS)[number];

interface User {
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, login: () => {}, logout: () => {} });

const STORAGE_KEY = 'fsc_member';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { name: saved } : null;
  });

  const login = (name: string) => {
    localStorage.setItem(STORAGE_KEY, name);
    setUser({ name });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

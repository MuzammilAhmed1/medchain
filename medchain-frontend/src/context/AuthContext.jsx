import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../services/authApi";
import { getToken, setToken } from "../services/apiClient";

export const ROLES = {
  ADMIN: "ADMIN",
  MANUFACTURER: "MANUFACTURER",
  DISTRIBUTOR: "DISTRIBUTOR",
  PHARMACY: "PHARMACY",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True until we've checked whether a stored token is still valid, so
  // route guards don't flash a redirect-to-login before that check lands.
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    authApi
      .me()
      .then((me) => setUser(me))
      .catch(() => setToken(null)) // stored token expired/invalid
      .finally(() => setInitializing(false));
  }, []);

  const login = async (email, password) => {
    const { token, user: loggedInUser } = await authApi.login(email, password);
    setToken(token);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (payload) => {
    const { token, user: newUser } = await authApi.register(payload);
    setToken(token);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

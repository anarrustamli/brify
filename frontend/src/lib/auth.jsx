import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.token) sessionStorage.setItem("bm_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    if (data.token) sessionStorage.setItem("bm_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const demoLogin = async (role) => {
    const { data } = await api.post("/auth/demo-login", { role });
    if (data.token) sessionStorage.setItem("bm_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      // Non-fatal: token may already be invalid server-side
      console.error("Logout request failed:", err);
    }
    sessionStorage.removeItem("bm_token");
    localStorage.removeItem("bm_token"); // clean up legacy
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, demoLogin, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

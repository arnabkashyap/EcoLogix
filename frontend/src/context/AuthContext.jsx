import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setStoredToken, getStoredToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [activeCompanyKey, setActiveCompanyKey] = useState('A'); // 'A' or 'B'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loginAsCompany = async (companyKey) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.devLogin(companyKey);
      setStoredToken(data.access_token);
      setTenant({
        tenant_id: data.tenant_id,
        company_name: data.company_name,
        companyKey: companyKey,
      });
      setActiveCompanyKey(companyKey);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Default initial dev login as Company A (Northwind Logistics)
    loginAsCompany('A');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        tenant,
        activeCompanyKey,
        loginAsCompany,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

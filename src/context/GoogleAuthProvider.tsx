import React, { createContext, useCallback, useEffect, useState } from 'react';
import { API_KEY, CLIENT_ID, DISCOVERY_DOC, SCOPES } from '../shared/consts';

interface GoogleAuthContextProps {
  isSignedIn: boolean;
  tokenReady: boolean;
  handleAuthClick: () => void;
  handleSignoutClick: () => void;
}

export const GoogleAuthContext = createContext<GoogleAuthContextProps | undefined>(undefined);

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [tokenClient, setTokenClient] = useState<unknown>(null);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    const loadScripts = () => {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        window.gapi.load('client', initializeGapiClient);
      };
      document.body.appendChild(gapiScript);

      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = initializeGisClient;
      document.body.appendChild(gisScript);
    };

    const initializeGapiClient = async () => {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });

      const savedToken = localStorage.getItem('gapi_access_token');
      const expiresAt = Number(localStorage.getItem('gapi_expires_at') || 0);

      const isTokenStillValid = savedToken && expiresAt > Date.now();

      if (isTokenStillValid) {
        window.gapi.client.setToken({ access_token: savedToken });
        setIsSignedIn(true);
        setTokenReady(true);
      } else if (tokenClient) {
        const previousConsent = localStorage.getItem('user_consented') === 'true';
        if (previousConsent) {
          tokenClient.callback = async (resp: any) => {
            if (resp.error !== undefined) return;
            handleTokenSuccess(resp.access_token);
            setIsSignedIn(true);
            setTokenReady(true);
          };
          try {
            tokenClient.requestAccessToken({ prompt: '' });
          } catch (err) {
            console.warn('Silent token refresh failed', err);
            setTokenReady(true);
          }
        } else {
          setTokenReady(true);
        }
      } else {
        setTokenReady(true);
      }
    };

    const initializeGisClient = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {},
      });
      setTokenClient(client);
    };

    loadScripts();
    // We depend on tokenClient but want to load scripts only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTokenSuccess = useCallback((accessToken: string) => {
    const expiresIn = 3600 * 1000; // 1 hour
    const expiresAt = Date.now() + expiresIn;
    window.gapi.client.setToken({ access_token: accessToken });
    localStorage.setItem('gapi_access_token', accessToken);
    localStorage.setItem('gapi_expires_at', expiresAt.toString());
    localStorage.setItem('user_consented', 'true');
  }, []);

  const handleAuthClick = useCallback(() => {
    if (!tokenClient) return;

    tokenClient.callback = (resp: any) => {
      if (resp.error !== undefined) {
        console.error(resp);
        return;
      }
      handleTokenSuccess(resp.access_token);
      setIsSignedIn(true);
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  }, [tokenClient, handleTokenSuccess]);

  const handleSignoutClick = useCallback(() => {
    const token = window.gapi.client.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken('');
        localStorage.removeItem('gapi_access_token');
        localStorage.removeItem('gapi_expires_at');
        localStorage.removeItem('user_consented');
        setIsSignedIn(false);
      });
    }
  }, []);

  return (
    <GoogleAuthContext.Provider
      value={{
        isSignedIn,
        tokenReady,
        handleAuthClick,
        handleSignoutClick,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

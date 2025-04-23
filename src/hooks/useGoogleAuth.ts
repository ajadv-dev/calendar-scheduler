import { useContext } from 'react';
import { GoogleAuthContext } from '../context/GoogleAuthProvider';

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
};

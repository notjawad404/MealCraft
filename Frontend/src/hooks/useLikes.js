import { useContext } from 'react';
import { LikesContext } from '../context/likesContext';

export default function useLikes() {
  const context = useContext(LikesContext);
  if (!context) {
    throw new Error('useLikes must be used within a LikesProvider');
  }
  return context;
}

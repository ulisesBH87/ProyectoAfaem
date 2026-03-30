import { useContext } from 'react';
import { RBACContext } from '../contexts/RBACContextObject';

export const useRBAC = () => useContext(RBACContext);

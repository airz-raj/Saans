import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readStored, writeStored } from '../services/storage';

/** useState that is initialised from, and mirrored to, localStorage through a validator. */
export function usePersistentState<T>(
  key: string,
  load: (stored: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => load(readStored(key)));
  useEffect(() => writeStored(key, value), [key, value]);
  return [value, setValue];
}

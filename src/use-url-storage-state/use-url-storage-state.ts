import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { kebabize } from '@/utils/url-helper';
import { useStorage } from '@/use-storage/use-storage';

const SEPARATOR = ','

type useUrlStorageStateParams<T> = {
  storage?: Storage;
  key: string;
  prefix?: string;
  defaultValue: T;
  previousKeys?: string[];
};

export function useUrlStorageState<T>({
  key,
  defaultValue,
  prefix,
  storage,
  previousKeys,
}: useUrlStorageStateParams<T>) {
  const location = useLocation();
  const navigate = useNavigate();
  const identity = useCallback((state: string) => state, []);

  const storageKey = prefix
    ? `${prefix}_${key}`
    : `urlStorage_${location.pathname}_${key}`;

  const previousKeysJoined = previousKeys?.join(SEPARATOR);
  const resolvedPreviousKeys = useMemo(
    () =>
      previousKeysJoined
        ?.split(SEPARATOR)
        .filter(Boolean)
        .map((oldKey) =>
          prefix
            ? `${prefix}_${oldKey}`
            : `urlStorage_${location.pathname}_${oldKey}`,
        ),
    [prefix, location.pathname, previousKeysJoined],
  );

  const [storageState, setStorageState] = useStorage({
    key: storageKey,
    defaultValue: serializeState(defaultValue),
    serialize: serializeState,
    deserialize: identity,
    storage,
    previousKeys: resolvedPreviousKeys,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const keyParam = searchParams.get(kebabize(key));

    if (!keyParam) {
      searchParams.set(kebabize(key), storageState);
      navigate({ search: `?${searchParams.toString()}` }, { replace: true });
    }
  }, [storageState, key, navigate, location.search]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const keyParam = searchParams.get(kebabize(key));

    if (!keyParam) {
      return;
    }

    setStorageState(keyParam);
  }, [key, setStorageState, location.search]);

  const updateState = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const searchParams = new URLSearchParams(location.search);
      const newValueToSet =
        typeof newValue === 'function'
          ? (newValue as (t: T) => T)(JSON.parse(storageState) as T)
          : newValue;

      searchParams.set(kebabize(key), serializeState(newValueToSet));

      navigate({
        search: `?${searchParams.toString()}`,
      });
    },
    [key, navigate, location.search, storageState],
  );

  const state: T | string = useMemo(() => {
    const urlParam = new URLSearchParams(location.search).get(kebabize(key));
    if (!urlParam) {
      return defaultValue;
    }
    try {
      return JSON.parse(urlParam) as T;
    } catch {
      return urlParam;
    }
  }, [key, location.search, defaultValue]);

  return [state, updateState] as const;
}

function serializeState<T>(state: T) {
  if (typeof state === 'string') {
    return state;
  }
  return JSON.stringify(state);
}

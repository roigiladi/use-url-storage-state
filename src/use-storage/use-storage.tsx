import { useCallback, useEffect, useRef, useState } from 'react';

export type StorageProps<ValueType> = {
  key: string;
  defaultValue: (() => ValueType) | ValueType;
  storage?: Storage;
  live?: boolean;
  serialize?: (value: ValueType) => string;
  deserialize?: (str: string) => ValueType;
  forceInit?: (value?: string) => boolean;
  previousKeys?: string[];
};

function never() {
  return false;
}

const SEPARATOR = ',';

/**
 * Helps in interacting with localstorage (or any other given storage) for storing/retrieving info.
 * @param key - the storage key by which the data needs to be stored
 * @param defaultValue - initialized the storage with this value. Note: its used as a dependency, hence needs to keep referential identity.
 * @param storage - preferred storage location. Default: window.localstorage
 * @param live - should live update between all tabs. Default: false
 * @param serialize - method to serialize the given data before storing. Default: JSON.stringify
 * @param deserialize - method to deserialize the data after retrieving it. Default: JSON.parse
 * @param forceInit - default: never
 * @param previousKeys - keys to remove on mount
 */
export function useStorage<ValueType>({
  key,
  defaultValue,
  storage = window.localStorage,
  live = false,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  forceInit = never,
  previousKeys,
}: StorageProps<ValueType>) {
  const initFromStorage = useCallback(
    (storedValue = storage.getItem(key)) => {
      const valueInLocalStorage = storedValue;
      if (valueInLocalStorage && !forceInit(valueInLocalStorage)) {
        try {
          return deserialize(valueInLocalStorage);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          storage.removeItem(key);
        }
      }
      return getDefaultValue(defaultValue);
    },
    [defaultValue, deserialize, forceInit, key, storage],
  );

  const [value, setValue] = useState(initFromStorage);

  const previousKeysJoined = previousKeys?.join(SEPARATOR);
  useEffect(() => {
    previousKeysJoined
      ?.split(SEPARATOR)
      .filter(Boolean)
      .forEach((oldKey) => {
        storage.removeItem(oldKey);
      });
  }, [previousKeysJoined, storage]);

  const prevKeyRef = useRef(key);

  useEffect(() => {
    const prevKey = prevKeyRef.current;
    if (prevKey !== key) {
      storage.removeItem(prevKey);
    }
    prevKeyRef.current = key;
    storage.setItem(key, serialize(value));
  }, [key, value, serialize, storage]);

  const fromStorage = useCallback(
    (storedValue?: string | null) => {
      return initFromStorage(storedValue);
    },
    [initFromStorage],
  );

  useEffect(() => {
    if (live) {
      window.addEventListener('storage', storageChanged);
    }

    return () => {
      window.removeEventListener('storage', storageChanged);
    };

    function storageChanged(event: StorageEvent) {
      if (
        event.storageArea !== window.localStorage ||
        event.key !== key ||
        event.newValue === serialize(value)
      ) {
        return;
      }

      setValue(fromStorage(event.newValue));
    }
  }, [defaultValue, fromStorage, key, live, serialize, value]);

  return [value, setValue, fromStorage] as const;
}

function getDefaultValue<ValueType>(
  value: StorageProps<ValueType>['defaultValue'],
) {
  return typeof value === 'function' ? (value as () => ValueType)() : value;
}

import { expect, type MockedFunction, test, vi } from 'vitest';

import React, { useState } from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStorage } from './use-storage';

test(`works like useState`, () => {
  const storageKey = 'some-key';
  const defaultValue = { key: 'value' };
  const { result } = renderHook(() =>
    useStorage({ key: storageKey, defaultValue }),
  );

  const [state, setState] = result.current;

  expect(state).toEqual(defaultValue);
  expect(localStorage.getItem(storageKey)).toEqual(
    JSON.stringify(defaultValue),
  );

  const updated = { ...defaultValue, updated: true };

  act(() => setState(updated));
  expect(localStorage.getItem(storageKey)).toEqual(JSON.stringify(updated));
});

test(`initial state is the stored one`, () => {
  const preSavedValue = { saved: true };
  const key = 'some-key';
  localStorage.setItem(key, JSON.stringify(preSavedValue));
  const { result } = renderHook(() =>
    useStorage({
      key,
      defaultValue: {
        overrides: false,
        why: 'this is just an initial value when nothing is saved',
      },
    }),
  );

  const [state] = result.current;

  expect(state).toEqual(preSavedValue);
});

test(`deletes old storage when key is dynamic`, async () => {
  const preSavedValue = 'pre saved';
  const key = 'initial-key';
  const nextKey = 'changed-key';
  localStorage.setItem(key, preSavedValue);
  const defaultValue = 'default value';

  function Usage() {
    const [keyState, setKeyState] = useState(key);
    const [state] = useStorage({
      key: keyState,
      defaultValue,
      serialize: identity,
      deserialize: identity,
    });

    return (
      <button type='button' onClick={() => setKeyState(nextKey)}>
        {state}
      </button>
    );
  }

  render(<Usage />);

  await userEvent.click(screen.getByRole('button', { name: preSavedValue }));

  expect(
    screen.getByRole('button', { name: preSavedValue }),
  ).toBeInTheDocument();
  expect(localStorage.getItem(key)).toBeNull();
  expect(localStorage.getItem(nextKey)).toEqual(preSavedValue);
});

test(`new version deleted old stored value`, () => {
  const preSavedValue = { saved: true, version: 1 };
  const key = 'some-key';
  localStorage.setItem(key, JSON.stringify(preSavedValue));
  const deserialize = JSON.parse;
  const defaultValue = {
    version: 2,
    overrides: true,
    why: 'this is a new version of the data, so old one is irrelevant',
  };
  const { result } = renderHook(() =>
    useStorage<typeof defaultValue>({
      key,
      defaultValue,
      deserialize,
      forceInit: (stored) => {
        const { version } = deserialize(stored || '') as typeof defaultValue;
        return version < 2;
      },
    }),
  );

  const [state] = result.current;

  expect(state).toEqual(defaultValue);
});

test(`changing parts of the state`, () => {
  const initialValue = { some: 'value', other: 'other value' };
  const key = 'whatever';
  window.localStorage.setItem(key, JSON.stringify(initialValue));
  const { result } = renderHook(() =>
    useStorage({ key, defaultValue: initialValue }),
  );

  const [_, setState] = result.current;

  const updated = { ...initialValue, other: 'updated' };

  act(() => setState((prev) => ({ ...prev, other: updated.other })));
  expect(localStorage.getItem(key)).toEqual(JSON.stringify(updated));
});

test(`when storage is cleared, value should reset`, () => {
  const currentValue = 'old value';
  const key = 'some-key';
  window.localStorage.setItem(key, currentValue);
  const defaultValue = 'initial value';
  const { result } = renderHook(() =>
    useStorage({
      key,
      defaultValue,
      deserialize: identity,
      serialize: identity,
      live: true,
    }),
  );

  // Dispatching manually since this doesn't work in JSDOM
  fireStorageEvent({
    key,
    newValue: '',
    oldValue: currentValue,
  });

  const [state] = result.current;
  expect(state).toEqual(defaultValue);
});

test(`cleans up previous keys from storage on mount`, () => {
  const oldKey1 = 'old-key-1';
  const oldKey2 = 'old-key-2';
  localStorage.setItem(oldKey1, 'stale data');
  localStorage.setItem(oldKey2, 'more stale data');

  renderHook(() =>
    useStorage({
      key: 'new-key',
      defaultValue: 'default',
      serialize: identity,
      deserialize: identity,
      previousKeys: [oldKey1, oldKey2],
    }),
  );

  expect(localStorage.getItem(oldKey1)).toBeNull();
  expect(localStorage.getItem(oldKey2)).toBeNull();
});

test(`skip updating state when storage event has data that's already updated`, () => {
  const currentValue = { val: 'current value' };
  const key = 'some-key';
  window.localStorage.setItem(key, JSON.stringify(currentValue));
  vi.spyOn(window.localStorage.constructor.prototype, 'setItem');

  const defaultValue = { val: 'initial value' };
  renderHook(() =>
    useStorage({
      key,
      defaultValue,
      live: true,
    }),
  );

  (
    window.localStorage.setItem as MockedFunction<
      typeof window.localStorage.setItem
    >
  ).mockClear();

  fireStorageEvent({
    key,
    newValue: JSON.stringify(currentValue),
    oldValue: JSON.stringify(currentValue),
  });

  // eslint-disable-next-line @typescript-eslint/unbound-method
  expect(window.localStorage.setItem).not.toHaveBeenCalled();
});

function identity<T>(value: T) {
  return value;
}

function fireStorageEvent({
  key,
  oldValue,
  newValue,
  storageArea = window.localStorage,
}: {
  key: string;
  oldValue: string;
  newValue: string;
  storageArea?: Storage;
}) {
  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        newValue,
        oldValue,
        storageArea,
      }),
    );
  });
}

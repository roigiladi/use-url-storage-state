import { test, expect, beforeEach } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { useUrlStorageState } from './use-url-storage-state';
import React from 'react';
import userEvent from '@testing-library/user-event';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

const defaultParams = {
  key: 'key',
  defaultValue: 'default',
} as const;

test('initializes state from given defaultState if URL is empty and storage has no relevant data for path', () => {
  const existingUrl = `?existing=untouched`;
  window.history.replaceState({}, '', existingUrl);

  const { result } = renderHook(() => useUrlStorageState(defaultParams), {
    wrapper: BrowserRouter,
  });

  const [state] = result.current;
  expect(state).toEqual(defaultParams.defaultValue);

  expect(window.location.search).toBe(
    `${existingUrl}&${defaultParams.key}=${defaultParams.defaultValue}`,
  );

  expect(window.localStorage.getItem(formatPathKey())).toBe(
    defaultParams.defaultValue,
  );
});

test('initializes state from storage if URL is empty, and loads to url params', () => {
  window.localStorage.setItem(formatPathKey(), 'fromStorage');

  const { result } = renderHook(() => useUrlStorageState(defaultParams), {
    wrapper: BrowserRouter,
  });

  const [state] = result.current;
  expect(state).toEqual('fromStorage');

  const searchParams = new URLSearchParams(window.location.search);
  expect(searchParams.get('key')).toBe('fromStorage');

  expect(window.localStorage.getItem(formatPathKey())).toEqual('fromStorage');
});

test('overrides state from URL to storage', () => {
  window.history.replaceState({}, '', '/?key=fromUrl');

  const { result } = renderHook(() => useUrlStorageState(defaultParams), {
    wrapper: BrowserRouter,
  });

  const [state] = result.current;
  expect(state).toEqual('fromUrl');

  expect(window.localStorage.getItem(formatPathKey())).toEqual('fromUrl');
});

test('updates state and URL correctly', () => {
  const { result } = renderHook(
    () =>
      useUrlStorageState<{
        test: string;
        optional?: string;
      }>({
        defaultValue: {
          test: 'initialValue',
          optional: undefined,
        },
        key: 'key',
      }),
    {
      wrapper: BrowserRouter,
    },
  );
  const newData = { test: 'updatedValue', optional: 'newField' };
  const [, setState] = result.current;

  act(() => {
    setState(newData);
  });

  const [state] = result.current;
  expect(state).toEqual(newData);

  const searchParams = new URLSearchParams(window.location.search);
  expect(searchParams.get('key')).toBe(JSON.stringify(newData));

  expect(window.localStorage.getItem(formatPathKey())).toEqual(
    JSON.stringify(newData),
  );
});

test('updating part of the state using updater function', () => {
  const initialState: { one: string; two: string | number } = {
    one: 'one',
    two: 'two',
  };
  const { result } = renderHook(
    () =>
      useUrlStorageState({
        defaultValue: initialState,
        key: 'key',
      }),
    {
      wrapper: BrowserRouter,
    },
  );
  const [, setState] = result.current;

  act(() => {
    setState((prev) => ({ ...prev, two: '2' }));
  });

  const [state] = result.current;
  expect(state).toEqual({ one: 'one', two: '2' });
});

test('updates the state for the current path only', async () => {
  render(<TestComponent />, {
    wrapper: BrowserRouter,
  });

  async function navigateAndAssertState(path: string) {
    await userEvent.click(await screen.findByRole('link', { name: path }));

    expect(await screen.findByText(`state - ${path}`)).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Update State' }),
    );
    expect(
      await screen.findByText(`state - updated ${path}`),
    ).toBeInTheDocument();
  }

  await navigateAndAssertState('/path1');
  await navigateAndAssertState('/path2');

  await userEvent.click(await screen.findByRole('link', { name: '/path1' }));
  expect(await screen.findByText('state - updated /path1')).toBeInTheDocument();
});

test('applies prefix to storage key correctly', () => {
  const prefixedParams = {
    ...defaultParams,
    prefix: 'customPrefix',
  };

  const { result } = renderHook(() => useUrlStorageState(prefixedParams), {
    wrapper: BrowserRouter,
  });

  const [state] = result.current;
  expect(state).toEqual(defaultParams.defaultValue);

  const expectedKey = `${prefixedParams.prefix}_${defaultParams.key}`;
  expect(window.localStorage.getItem(expectedKey)).toBe(
    defaultParams.defaultValue,
  );

  const searchParams = new URLSearchParams(window.location.search);
  expect(searchParams.get('key')).toBe(defaultParams.defaultValue);
});

function TestComponent() {
  return (
    <>
      <Link to='/path1'>/path1</Link>
      <Link to='/path2'>/path2</Link>
      <Routes>
        <Route
          path='/path1'
          element={<PathComponent pathKey='/path1' key='path1' />}
        />
        <Route
          path='/path2'
          element={<PathComponent pathKey='/path2' key='path2' />}
        />
      </Routes>
    </>
  );
}

function PathComponent({ pathKey }: { pathKey: string }) {
  const [state, setState] = useUrlStorageState({
    key: 'data',
    defaultValue: pathKey,
  });
  return (
    <div>
      <p>state - {state}</p>
      <button type='submit' onClick={() => setState(`updated ${pathKey}`)}>
        Update State
      </button>
    </div>
  );
}

test('cleans up previous keys using default path-based prefix', () => {
  const oldKey1 = formatPathKey('old-key-1');
  const oldKey2 = formatPathKey('old-key-2');
  window.localStorage.setItem(oldKey1, 'stale');
  window.localStorage.setItem(oldKey2, 'also stale');

  renderHook(
    () =>
      useUrlStorageState({
        ...defaultParams,
        previousKeys: ['old-key-1', 'old-key-2'],
      }),
    { wrapper: BrowserRouter },
  );

  expect(window.localStorage.getItem(oldKey1)).toBeNull();
  expect(window.localStorage.getItem(oldKey2)).toBeNull();
});

test('cleans up previous keys using custom prefix', () => {
  const prefix = 'myApp';
  const oldKey1 = `${prefix}_old-key-1`;
  const oldKey2 = `${prefix}_old-key-2`;
  window.localStorage.setItem(oldKey1, 'stale');
  window.localStorage.setItem(oldKey2, 'also stale');

  renderHook(
    () =>
      useUrlStorageState({
        ...defaultParams,
        prefix,
        previousKeys: ['old-key-1', 'old-key-2'],
      }),
    { wrapper: BrowserRouter },
  );

  expect(window.localStorage.getItem(oldKey1)).toBeNull();
  expect(window.localStorage.getItem(oldKey2)).toBeNull();
});

function formatPathKey(key: string = defaultParams.key) {
  return `urlStorage_${window.location.pathname}_${key}`;
}

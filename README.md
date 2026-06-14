# useUrlStorageState Hook

## Table of Contents

- [🌟 Overview](#-overview)
- [🚀 Features](#-features)
- [📚 Installation](#-installation)
- [✨ Demo](#-demo)
- [🛠️ API](#️-api)
  - [Parameters](#parameters)
  - [Returns](#returns)
- [🔧 Usage Examples](#-usage-examples)
  - [Basic Usage](#basic-usage)
  - [With Custom Prefix](#with-custom-prefix)
  - [Default Prefix as Pathname](#default-prefix-as-pathname)
  - [Using Session Storage](#using-session-storage)
  - [Managing Multiple States](#managing-multiple-states)
- [📝 Notes](#-notes)
- [📦 useStorage Hook](#-usestorage-hook)
  - [🌟 Overview](#-overview-1)
  - [🚀 Features](#-features-1)
  - [🛠️ API](#️-api-1)
    - [Parameters](#parameters-1)
    - [Returns](#returns-1)
  - [🔧 Usage Examples](#-usage-examples-1)
    - [Basic Usage](#basic-usage-1)
    - [Custom Serialization](#custom-serialization)
    - [Live Synchronization](#live-synchronization)
    - [Using `forceInit` for Conditional Initialization](#using-forceinit-for-conditional-initialization)
    - [Specifying `sessionStorage` Instead of `localStorage`](#specifying-sessionstorage-instead-of-localstorage)
  - [📝 Notes](#-notes-1)
- [📜 License](#-license)
- [🎉 Acknowledgments](#-acknowledgments)

## 🌟 Overview

`useUrlStorageState` is a hook designed to synchronize state between URL parameters and browser storage (e.g., `localStorage` or `sessionStorage`). This hook helps you maintain consistent state across page refreshes, multiple tabs, and deep links while allowing for custom configurations.

## 🚀 Features

- **Bidirectional Sync**: Synchronizes state between URL parameters and browser storage seamlessly.
- **Persistence**: Retains state across page refreshes.
- **Type Safety**: Fully generic for strongly-typed state.
- **Customizable**: Supports custom storage, key prefixing, and serialization methods.
- **Multi-State Management**: Easily handles multiple independent states.

## 📚 Installation

Install the package via npm or yarn:

```bash
npm install use-url-storage-state
```

Ensure that `react` and `react-router-dom` are installed in your project

## ✨ Demo

```jsx
import React from 'react';
import { useUrlStorageState } from 'use-url-storage-state';

const Demo = () => {
  const [filters, setFilters] = useUrlStorageState({
    key: 'filters',
    defaultValue: { search: '', category: 'all' },
  });

  return (
    <div>
      <input
        type='text'
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />
      <select
        value={filters.category}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
      >
        <option value='all'>All</option>
        <option value='electronics'>Electronics</option>
        <option value='fashion'>Fashion</option>
      </select>
    </div>
  );
};

export default Demo;
```

## 🛠️ API

### Parameters

```typescript
type useUrlStorageStateParams<T> = {
  key: string; // URL parameter and storage key
  defaultValue: T; // Default value if none exists
  prefix?: string; // Optional storage key prefix (default: current pathname)
  storage?: Storage; // Optional storage type (default: localStorage)
  previousKeys?: string[]; // Old keys to remove from storage on mount
};
```

### Returns

```typescript
[T, (newValue: T | ((prev: T) => T)) => void]
```

- `T`: The current state value.
- `(newValue: T | ((prev: T) => T)) => void`: A function to update the state.

## 🔧 Usage Examples

### Basic Usage

```tsx
import { useUrlStorageState } from 'use-url-storage-state';

const [filters, setFilters] = useUrlStorageState({
  key: 'filters',
  defaultValue: { search: '', category: 'all' },
});

// URL: http://localhost:3000/?filters={"search":"","category":"all"}
// Storage: urlStorage_/current_pathname_filters
```

### With Custom Prefix

Using a shared prefix is useful when you want states across different paths or to share the same logical grouping in storage. For example, you might want all multiple pages to affect and persist the same url params:

```tsx
import { useUrlStorageState } from 'use-url-storage-state';

const [filters, setFilters] = useUrlStorageState({
  key: 'filters',
  defaultValue: { search: '', category: 'all' },
  prefix: 'somePrefix',
});

// URL: http://localhost:3000/?filters={"search":"","category":"all"}
// Storage: somePrefix_filters
```

### Default Prefix as Pathname

By default, the prefix is set to the current `location.pathname`. This ensures that states are unique to each page in your application. For instance, if you navigate from `/home` to `/profile`, the storage keys will differ:

- `/home`: `urlStorage_/home_filters`
- `/profile`: `urlStorage_/profile_filters`

This behavior prevents cross-page conflicts and keeps the state isolated to its corresponding route.

### Using Session Storage

```tsx
import { useUrlStorageState } from 'use-url-storage-state';

const [sessionState, setSessionState] = useUrlStorageState({
  key: 'userSession',
  defaultValue: { loggedIn: false },
  storage: sessionStorage,
});
```

### Managing Multiple States

```tsx
import { useUrlStorageState } from 'use-url-storage-state';

const [filters, setFilters] = useUrlStorageState({
  key: 'filters',
  defaultValue: { search: '', category: 'all' },
});

const [theme, setTheme] = useUrlStorageState({
  key: 'theme',
  defaultValue: { darkMode: false },
});
```

### Cleaning Up Old Storage Keys

When you rename a key, pass the old names via `previousKeys` to remove stale storage entries on mount:

```tsx
import { useUrlStorageState } from 'use-url-storage-state';

const [filters, setFilters] = useUrlStorageState({
  key: 'search_filters',
  defaultValue: { search: '', category: 'all' },
  previousKeys: ['filters', 'old_filters'], // removed from storage on mount
});
```

## 📝 Notes

1. URL parameters are always strings, so complex objects are automatically serialized/deserialized
2. The hook maintains sync between URL and storage.
   - If a URL parameter exists, it will update the storage
   - If a storage value exists, and no URL parameter exists, it will update the URL
   - If none exists, it will populate the URL and storage with the default value
3. The default state will populate the URL and storage if none exists automatically
4. The hook will only refer to queryParams that exists in state, and will ignore any other query params

## 📦 useStorage Hook

### 🌟 Overview

The `useStorage` hook is a low-level utility for interacting with browser storage (e.g., `localStorage`, `sessionStorage`). It provides reactive state management tied to storage keys, making it easy to persist and retrieve data.

### 🚀 Features

- **Custom Serialization**: Allows for custom serialization and deserialization of storage values.
- **Live Synchronization**: Keeps state synchronized across tabs.
- **Default Value Initialization**: Initializes storage keys with default values.

### 🛠️ API

#### Parameters

```typescript
type StorageProps<ValueType> = {
  key: string; // The storage key.
  defaultValue: ValueType; // Default value if no value exists.
  storage?: Storage; // Storage type (localStorage/sessionStorage). Default: localStorage.
  live?: boolean; // Synchronize across tabs. Default: false.
  serialize?: (value: ValueType) => string; // Custom serialization function. Default: JSON.stringify.
  deserialize?: (str: string) => ValueType; // Custom deserialization function. Default: JSON.parse.
  forceInit?: (value?: string) => boolean; // Force initialization logic. Default: never.
  previousKeys?: string[]; // Old keys to remove from storage on mount.
};
```

#### Returns

```typescript
[ValueType, (newValue: ValueType | ((prev: ValueType) => ValueType)) => void]
```

### 🔧 Usage Examples

#### Basic Usage

```tsx
import { useStorage } from 'use-url-storage-state';

const [value, setValue] = useStorage({
  key: 'myKey',
  defaultValue: 'defaultValue',
});

setValue('newValue');
```

#### Custom Serialization

```tsx
import { useStorage } from 'use-url-storage-state';

const [user, setUser] = useStorage({
  key: 'user',
  defaultValue: { name: 'Guest' },
  serialize: (value) => btoa(JSON.stringify(value)),
  deserialize: (str) => JSON.parse(atob(str)),
});
```

#### Live Synchronization

```tsx
import { useStorage } from 'use-url-storage-state';

const [theme, setTheme] = useStorage({
  key: 'theme',
  defaultValue: 'light',
  live: true,
});
```

#### Using `forceInit` for Conditional Initialization

```tsx
import { useStorage } from 'use-url-storage-state';

const [count, setCount] = useStorage({
  key: 'counter',
  defaultValue: 0,
  forceInit: (existingValue) =>
    existingValue === undefined || existingValue === null,
});

// The key will be initialized to 0 only if it doesn't exist or is null.
setCount((prev) => prev + 1);
```

#### Specifying `sessionStorage` Instead of `localStorage`

```tsx
import { useStorage } from 'use-url-storage-state';

const [sessionData, setSessionData] = useStorage({
  key: 'sessionKey',
  defaultValue: 'sessionValue',
  storage: sessionStorage,
});

setSessionData('newSessionValue');
```

### 📝 Notes

1. **Storage Type**: The default storage is `localStorage`. If you need ephemeral data that clears on browser close, use `sessionStorage` by setting the `storage` option.
2. **Custom Serialization**: Use `serialize` and `deserialize` when working with complex objects, or when you need encrypted or encoded storage.
3. **Live Synchronization**: Enable the `live` option for use cases that require real-time updates across browser tabs or windows, like theme synchronization or shared state.
4. **Force Initialization**: The `forceInit` function is useful for cases where existing values might be invalid or require resetting.

## 📜 License

This project is licensed under the MIT License

## 🎉 Acknowledgments

- Inspired by Kent C. Dodds, https://www.youtube.com/watch?v=yu3dnHrnps4
- Special thanks to [Idan Entin](https://github.com/idanen)

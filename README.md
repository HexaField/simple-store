# Simple Store

A lightweight reactive state management library for React and vanilla JavaScript applications.

## Features

- 🪶 **Lightweight**: Minimal footprint with no dependencies
- ⚡ **Reactive**: Automatically updates components when state changes
- 🔄 **Promise Support**: Built-in async state handling
- 🎯 **TypeScript**: Full type safety out of the box
- 📦 **Framework Agnostic**: Use with or without React
- 🎣 **React Hook**: Seamless React integration

## Installation

```bash
npm install simple-store
```

For React usage, make sure you have React installed:

```bash
npm install react
```

## Usage

### Approach to reactivity

The approach this library takes to reactivity follows a loose declarative style, in which re-renders are triggered by any reasonable mutation of data. For single value stores (like a bool, string or number) this happens if the value changes. For object references, this is whenever `.set` is called (including with the setter returned from `useSimpleStore`). This gives you explicit control over not just when you want to re-render but also what, by either passing back the previous value or a new object. Being a simple state management library, there is a lack of extensive tooling and limitations to this approach, hence the name.

### Framework Agnostic

```javascript
import { createSimpleStore, None } from 'simple-store'

// Create a store
const counterStore = createSimpleStore(0)

// Get the current value
console.log(counterStore.get()) // 0

// Set a new value
counterStore.set(1)
console.log(counterStore.get()) // 1

// Subscribe to changes
const unsubscribe = counterStore.subscribe(() => {
  console.log('Counter changed:', counterStore.get())
})

// Update with a function
counterStore.set((prev) => prev + 1)

// Set to None to create a pending state
counterStore.set(None)
```

> **⚠️ Important**: For symbol consistency, import all symbols from the same entry point. Don't mix imports from `simple-store` and `simple-store/react` in the same application when using the `None` symbol.

### React Hook

```jsx
import React from 'react'
import { useSimpleStore, createSimpleStore, None } from 'simple-store/react'

function Counter() {
  const [count, setCount] = useSimpleStore(0)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount((prev) => prev - 1)}>Decrement</button>
      <button onClick={() => setCount(None)}>Reset to Pending</button>
    </div>
  )
}
```

### Global State with React

```jsx
import React from 'react'
import { useSimpleStore, createSimpleStore, None } from 'simple-store/react'

// Create and use a global store anywhere
const UserState = createSimpleStore({ username: '', authToken: '' })

function Counter() {
  const [user, setUser] = useSimpleStore(UserState)

  const tryAuth = () => {
    login().then((response) => {
      setUser((prev) => {
        prev.username = response.name
        prev.authToken = response.authToken
        return prev
      })
    })
  }

  return (
    <div>
      <p>Username: {user.username}</p>
      {user.authToken ? <p>Authenticated</p> : <button onClick={tryAuth}>Authenticate</button>}
    </div>
  )
}
```

### Async State

```jsx
import { useSimpleStore } from 'simple-store/react'

function UserProfile({ userId }) {
  const [user, setUser] = useSimpleStore(() => fetch(`/api/users/${userId}`).then((res) => res.json()))

  // Component will suspend until the promise resolves
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button onClick={() => setUser({ ...user, name: 'Updated Name' })}>Update Name</button>
    </div>
  )
}
```

## API Reference

### `createSimpleStore<T>(initialValue: T | Promise<T>)`

Creates a new store with the given initial value.

#### Methods

- `get()`: Returns the current value or throws a promise if pending
- `set(value)`: Sets a new value (can be a value, promise, or function)
- `subscribe(listener)`: Subscribes to changes (returns unsubscribe function)

#### Properties

- `value`: Read-only access to the current value
- `promise`: Current pending promise (if any)

### `useSimpleStore<T>(store | initialValue)`

React hook for using a SimpleStore in components.

- **store**: An existing SimpleStore instance
- **initialValue**: A value or function to create a new store

Returns `[value, setValue]` tuple similar to `useState`.

## License

MIT

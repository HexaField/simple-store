import { useEffect, useMemo, useState } from 'react'

import { SimpleStore, Store, createSimpleStore } from './SimpleStore'
import { use } from './use'

// Re-export main bundle symbols to ensure consistency
export { None, Store, createSimpleStore } from './SimpleStore'
export type { SimpleStore } from './SimpleStore'

/**
 * Hook to use a SimpleStore in a React component.
 * Suspends the context until the store has a value.
 * @param store
 * @returns
 */
export function useSimpleStore<T>(
  _store: SimpleStore<T> | (() => T) | T
): [T, (value: T | Promise<T> | ((prev: T) => T | Promise<T>)) => void] {
  let store: SimpleStore<T>
  if (typeof _store === 'object' && _store !== null && Store.toString() in _store) {
    store = _store as SimpleStore<T>
  } else if (typeof _store === 'function') {
    const initFn = _store as () => T
    ;[store] = useState(() => createSimpleStore(initFn()) as SimpleStore<T>)
  } else {
    ;[store] = useState(() => createSimpleStore(_store as T) as SimpleStore<T>)
  }
  const [, forceRerender] = useState({})

  useEffect(() => {
    const s = store
    s.subscribe(() => forceRerender({}))
  }, [store])

  if (store.promise) {
    use(store.promise)
  }

  return useMemo(() => [store.get(), store.set], [store.get(), store.set])
}

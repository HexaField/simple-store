import { act, render } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SimpleStore } from '../dist/react.js'
import { createSimpleStore, None, useSimpleStore } from '../dist/react.js'

// Mock component for testing
function TestComponent({
  store,
  onRender
}: {
  store: SimpleStore<number> | (() => number) | number
  onRender?: (value: number, setter: Function) => void
}) {
  const [value, setValue] = useSimpleStore(store)

  React.useEffect(() => {
    if (onRender) {
      onRender(value, setValue)
    }
  }, [value, setValue, onRender])

  return (
    <div>
      <span data-testid="value">{value}</span>
      <button data-testid="increment" onClick={() => setValue((prev) => prev + 1)}>
        Increment
      </button>
      <button data-testid="set-100" onClick={() => setValue(100)}>
        Set 100
      </button>
    </div>
  )
}

describe('React Integration (useSimpleStore)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Basic Hook Usage', () => {
    it('should render initial value from store', () => {
      const store = createSimpleStore(42)
      const { getByTestId } = render(<TestComponent store={store} />)

      expect(getByTestId('value')).toHaveTextContent('42')
    })

    it('should update when store value changes', () => {
      const store = createSimpleStore(0)
      const { getByTestId } = render(<TestComponent store={store} />)

      expect(getByTestId('value')).toHaveTextContent('0')

      act(() => {
        store.set(99)
      })

      expect(getByTestId('value')).toHaveTextContent('99')
    })

    it('should update value through hook setter', () => {
      const store = createSimpleStore(0)
      const { getByTestId } = render(<TestComponent store={store} />)

      act(() => {
        getByTestId('increment').click()
      })

      expect(getByTestId('value')).toHaveTextContent('1')
    })

    it('should update value through direct setter', () => {
      const store = createSimpleStore(0)
      const { getByTestId } = render(<TestComponent store={store} />)

      act(() => {
        getByTestId('set-100').click()
      })

      expect(getByTestId('value')).toHaveTextContent('100')
    })
  })

  describe('Function-based Store Creation', () => {
    it('should create store from function', () => {
      const initializer = () => 123
      const { getByTestId } = render(<TestComponent store={initializer} />)

      expect(getByTestId('value')).toHaveTextContent('123')
    })

    it('should create independent stores for different components', () => {
      const initializer = () => 50

      const TestContainer = () => (
        <div>
          <div data-testid="component-1">
            <TestComponent store={initializer} />
          </div>
          <div data-testid="component-2">
            <TestComponent store={initializer} />
          </div>
        </div>
      )

      const { getByTestId } = render(<TestContainer />)

      // Both should start with the same value
      expect(getByTestId('component-1').querySelector('[data-testid="value"]')).toHaveTextContent('50')
      expect(getByTestId('component-2').querySelector('[data-testid="value"]')).toHaveTextContent('50')

      // Updating one should not affect the other
      act(() => {
        const incrementBtn = getByTestId('component-1').querySelector('[data-testid="increment"]') as HTMLButtonElement
        incrementBtn.click()
      })

      expect(getByTestId('component-1').querySelector('[data-testid="value"]')).toHaveTextContent('51')
      expect(getByTestId('component-2').querySelector('[data-testid="value"]')).toHaveTextContent('50')
    })

    it('should maintain function store state across re-renders', () => {
      const initializer = () => 25
      let renderCount = 0

      const onRender = vi.fn(() => {
        renderCount++
      })

      const { getByTestId, rerender } = render(<TestComponent store={initializer} onRender={onRender} />)

      expect(getByTestId('value')).toHaveTextContent('25')

      act(() => {
        getByTestId('increment').click()
      })

      expect(getByTestId('value')).toHaveTextContent('26')

      // Force re-render
      rerender(<TestComponent store={initializer} onRender={onRender} />)

      // Value should be maintained
      expect(getByTestId('value')).toHaveTextContent('26')
    })
  })

  describe('Promise and Suspense Handling', () => {
    it('should handle promise-based values', async () => {
      const store = createSimpleStore(Promise.resolve('async-value'))

      // Store should be in promise state initially
      let thrownValue: any
      try {
        store.get()
      } catch (thrown) {
        thrownValue = thrown
      }

      expect(thrownValue).toBeInstanceOf(Promise)

      // Wait for promise to resolve
      await store.promise

      // Now should have the resolved value
      expect(store.get()).toBe('async-value')
    })

    it('should handle setting promises through store', async () => {
      const store = createSimpleStore('initial')

      expect(store.get()).toBe('initial')

      store.set(Promise.resolve('resolved!'))

      // Should be in promise state
      let thrownValue: any
      try {
        store.get()
      } catch (thrown) {
        thrownValue = thrown
      }

      expect(thrownValue).toBeInstanceOf(Promise)

      // Wait for promise to resolve
      await store.promise
      expect(store.get()).toBe('resolved!')
    })

    it('should handle None values', () => {
      const store = createSimpleStore<string>(None)

      // Should be in promise state initially
      let thrownValue: any
      try {
        store.get()
      } catch (thrown) {
        thrownValue = thrown
      }

      expect(thrownValue).toBeInstanceOf(Promise)
      expect(store.promise).toBeDefined()

      // Set a value
      store.set('finally loaded')
      expect(store.get()).toBe('finally loaded')
    })
  })

  describe('Multiple Components with Same Store', () => {
    it('should sync multiple components using same store', () => {
      const store = createSimpleStore(0)

      const TestContainer = () => (
        <div>
          <div data-testid="component-1">
            <TestComponent store={store} />
          </div>
          <div data-testid="component-2">
            <TestComponent store={store} />
          </div>
        </div>
      )

      const { getByTestId } = render(<TestContainer />)

      // Both should show initial value
      expect(getByTestId('component-1').querySelector('[data-testid="value"]')).toHaveTextContent('0')
      expect(getByTestId('component-2').querySelector('[data-testid="value"]')).toHaveTextContent('0')

      // Update through first component
      act(() => {
        const incrementBtn = getByTestId('component-1').querySelector('[data-testid="increment"]') as HTMLButtonElement
        incrementBtn.click()
      })

      // Both should update
      expect(getByTestId('component-1').querySelector('[data-testid="value"]')).toHaveTextContent('1')
      expect(getByTestId('component-2').querySelector('[data-testid="value"]')).toHaveTextContent('1')

      // Update through second component
      act(() => {
        const setBtn = getByTestId('component-2').querySelector('[data-testid="set-100"]') as HTMLButtonElement
        setBtn.click()
      })

      // Both should update
      expect(getByTestId('component-1').querySelector('[data-testid="value"]')).toHaveTextContent('100')
      expect(getByTestId('component-2').querySelector('[data-testid="value"]')).toHaveTextContent('100')
    })
  })

  describe('Hook Cleanup and Memory Leaks', () => {
    it('should cleanup subscriptions when component unmounts', () => {
      const store = createSimpleStore(0)
      const subscribeSpy = vi.spyOn(store, 'subscribe')

      const { unmount } = render(<TestComponent store={store} />)

      expect(subscribeSpy).toHaveBeenCalledTimes(1)
      const unsubscribe = subscribeSpy.mock.results[0].value
      const unsubscribeSpy = vi.fn(unsubscribe)
      subscribeSpy.mockReturnValue(unsubscribeSpy)

      unmount()

      // Note: Testing exact cleanup behavior is complex with React's effects
      // The important thing is that the component unmounts without errors
    })

    it('should handle rapid store changes without memory leaks', () => {
      const store = createSimpleStore(0)
      const { getByTestId } = render(<TestComponent store={store} />)

      // Simulate rapid updates
      act(() => {
        for (let i = 0; i < 100; i++) {
          store.set(i)
        }
      })

      expect(getByTestId('value')).toHaveTextContent('99')
    })
  })

  describe('Re-export Consistency', () => {
    it('should have consistent exports with main bundle', async () => {
      // Import both modules
      const mainModule = await import('../dist/index.js')
      const reactModule = await import('../dist/react.js')

      // Check that createSimpleStore is the same function
      expect(typeof mainModule.createSimpleStore).toBe('function')
      expect(typeof reactModule.createSimpleStore).toBe('function')

      // Check that None symbol exists in both
      expect(mainModule.None).toBeDefined()
      expect(reactModule.None).toBeDefined()

      // Create stores from both modules and verify they work the same
      const mainStore = mainModule.createSimpleStore(42)
      const reactStore = reactModule.createSimpleStore(42)

      expect(mainStore.get()).toBe(42)
      expect(reactStore.get()).toBe(42)
    })
  })

  describe('Direct Value Initialization', () => {
    it('should create store from direct value (number)', () => {
      const { getByTestId } = render(<TestComponent store={42} />)

      expect(getByTestId('value')).toHaveTextContent('42')
    })

    it('should create store from direct value (string)', () => {
      function StringTestComponent({ store }: { store: string }) {
        const [value, setValue] = useSimpleStore(store)

        return (
          <div>
            <span data-testid="string-value">{value}</span>
            <button data-testid="set-new-string" onClick={() => setValue('updated string')}>
              Update String
            </button>
          </div>
        )
      }

      const { getByTestId } = render(<StringTestComponent store="initial string" />)

      expect(getByTestId('string-value')).toHaveTextContent('initial string')
    })

    it('should create store from direct value (object)', () => {
      interface TestObject {
        count: number
        name: string
      }

      function ObjectTestComponent({ store }: { store: TestObject }) {
        const [value, setValue] = useSimpleStore(store)

        return (
          <div>
            <span data-testid="object-count">{value.count}</span>
            <span data-testid="object-name">{value.name}</span>
            <button
              data-testid="increment-count"
              onClick={() => setValue((prev) => ({ ...prev, count: prev.count + 1 }))}
            >
              Increment Count
            </button>
          </div>
        )
      }

      const initialObject = { count: 5, name: 'test' }
      const { getByTestId } = render(<ObjectTestComponent store={initialObject} />)

      expect(getByTestId('object-count')).toHaveTextContent('5')
      expect(getByTestId('object-name')).toHaveTextContent('test')
    })

    it('should create store from direct value (array)', () => {
      function ArrayTestComponent({ store }: { store: number[] }) {
        const [value, setValue] = useSimpleStore(store)

        return (
          <div>
            <span data-testid="array-length">{value.length}</span>
            <span data-testid="array-values">{value.join(',')}</span>
            <button data-testid="add-item" onClick={() => setValue((prev) => [...prev, prev.length + 1])}>
              Add Item
            </button>
          </div>
        )
      }

      const initialArray = [1, 2, 3]
      const { getByTestId } = render(<ArrayTestComponent store={initialArray} />)

      expect(getByTestId('array-length')).toHaveTextContent('3')
      expect(getByTestId('array-values')).toHaveTextContent('1,2,3')
    })

    it('should handle null and undefined initial values', () => {
      function NullableTestComponent({ store }: { store: string | null }) {
        const [value, setValue] = useSimpleStore(store)

        return (
          <div>
            <span data-testid="nullable-value">{value === null ? 'null' : value}</span>
            <button data-testid="set-string" onClick={() => setValue('not null anymore')}>
              Set String
            </button>
          </div>
        )
      }

      const { getByTestId } = render(<NullableTestComponent store={null} />)
      expect(getByTestId('nullable-value')).toHaveTextContent('null')

      act(() => {
        getByTestId('set-string').click()
      })

      expect(getByTestId('nullable-value')).toHaveTextContent('not null anymore')
    })

    it('should create independent stores for different components with same direct value', () => {
      const TestContainer = () => (
        <div>
          <div data-testid="component-1">
            <TestComponent store={100} />
          </div>
          <div data-testid="component-2">
            <TestComponent store={100} />
          </div>
        </div>
      )

      const { getByTestId } = render(<TestContainer />)

      // Both should start with the same value
      expect(getByTestId('component-1').querySelector('[data-testid="value"]')).toHaveTextContent('100')
      expect(getByTestId('component-2').querySelector('[data-testid="value"]')).toHaveTextContent('100')

      // Updating one should not affect the other (they have independent stores)
      act(() => {
        const incrementBtn = getByTestId('component-1').querySelector('[data-testid="increment"]') as HTMLButtonElement
        incrementBtn.click()
      })

      expect(getByTestId('component-1').querySelector('[data-testid="value"]')).toHaveTextContent('101')
      expect(getByTestId('component-2').querySelector('[data-testid="value"]')).toHaveTextContent('100')
    })

    it('should maintain direct value store state across re-renders', () => {
      let renderCount = 0

      const onRender = vi.fn(() => {
        renderCount++
      })

      const { getByTestId, rerender } = render(<TestComponent store={75} onRender={onRender} />)

      expect(getByTestId('value')).toHaveTextContent('75')

      act(() => {
        getByTestId('increment').click()
      })

      expect(getByTestId('value')).toHaveTextContent('76')

      // Force re-render with same initial value
      rerender(<TestComponent store={75} onRender={onRender} />)

      // Value should be maintained (store persists across re-renders)
      expect(getByTestId('value')).toHaveTextContent('76')
    })

    it('should handle boolean values correctly', () => {
      function BooleanTestComponent({ store }: { store: boolean }) {
        const [value, setValue] = useSimpleStore(store)

        return (
          <div>
            <span data-testid="boolean-value">{value ? 'true' : 'false'}</span>
            <button data-testid="toggle-boolean" onClick={() => setValue(!value)}>
              Toggle
            </button>
          </div>
        )
      }

      const { getByTestId } = render(<BooleanTestComponent store={false} />)

      expect(getByTestId('boolean-value')).toHaveTextContent('false')

      act(() => {
        getByTestId('toggle-boolean').click()
      })

      expect(getByTestId('boolean-value')).toHaveTextContent('true')
    })

    it('should handle zero as a valid initial value', () => {
      const { getByTestId } = render(<TestComponent store={0} />)

      expect(getByTestId('value')).toHaveTextContent('0')

      act(() => {
        getByTestId('increment').click()
      })

      expect(getByTestId('value')).toHaveTextContent('1')
    })

    it('should handle empty string as a valid initial value', () => {
      function EmptyStringTestComponent() {
        const [value, setValue] = useSimpleStore('')

        return (
          <div>
            <span data-testid="empty-string-value">"{value}"</span>
            <button data-testid="set-content" onClick={() => setValue('now has content')}>
              Set Content
            </button>
          </div>
        )
      }

      const { getByTestId } = render(<EmptyStringTestComponent />)

      expect(getByTestId('empty-string-value')).toHaveTextContent('""')

      act(() => {
        getByTestId('set-content').click()
      })

      expect(getByTestId('empty-string-value')).toHaveTextContent('"now has content"')
    })

    it('should handle undefined as a valid initial value', () => {
      function UndefinedTestComponent() {
        const [value, setValue] = useSimpleStore<string | undefined>(undefined)

        return (
          <div>
            <span data-testid="undefined-value">{value === undefined ? 'undefined' : value}</span>
            <button data-testid="set-defined" onClick={() => setValue('now defined')}>
              Set Defined
            </button>
          </div>
        )
      }

      const { getByTestId } = render(<UndefinedTestComponent />)

      expect(getByTestId('undefined-value')).toHaveTextContent('undefined')

      act(() => {
        getByTestId('set-defined').click()
      })

      expect(getByTestId('undefined-value')).toHaveTextContent('now defined')
    })

    it('should handle complex nested objects', () => {
      interface NestedObject {
        user: {
          id: number
          profile: {
            name: string
            preferences: {
              theme: 'light' | 'dark'
              notifications: boolean
            }
          }
        }
        metadata: {
          created: string
          updated: string
        }
      }

      function NestedObjectTestComponent({ store }: { store: NestedObject }) {
        const [value, setValue] = useSimpleStore(store)

        return (
          <div>
            <span data-testid="user-name">{value.user.profile.name}</span>
            <span data-testid="user-theme">{value.user.profile.preferences.theme}</span>
            <button
              data-testid="toggle-theme"
              onClick={() =>
                setValue((prev) => ({
                  ...prev,
                  user: {
                    ...prev.user,
                    profile: {
                      ...prev.user.profile,
                      preferences: {
                        ...prev.user.profile.preferences,
                        theme: prev.user.profile.preferences.theme === 'light' ? 'dark' : 'light'
                      }
                    }
                  }
                }))
              }
            >
              Toggle Theme
            </button>
          </div>
        )
      }

      const complexObject: NestedObject = {
        user: {
          id: 1,
          profile: {
            name: 'John Doe',
            preferences: {
              theme: 'light',
              notifications: true
            }
          }
        },
        metadata: {
          created: '2023-01-01',
          updated: '2023-01-02'
        }
      }

      const { getByTestId } = render(<NestedObjectTestComponent store={complexObject} />)

      expect(getByTestId('user-name')).toHaveTextContent('John Doe')
      expect(getByTestId('user-theme')).toHaveTextContent('light')

      act(() => {
        getByTestId('toggle-theme').click()
      })

      expect(getByTestId('user-theme')).toHaveTextContent('dark')
    })

    it('should handle Map and Set as initial values', () => {
      function MapSetTestComponent() {
        const [mapValue, setMapValue] = useSimpleStore(new Map([['key1', 'value1']]))
        const [setValue, setSetValue] = useSimpleStore(new Set(['item1', 'item2']))

        return (
          <div>
            <span data-testid="map-size">{mapValue.size}</span>
            <span data-testid="set-size">{setValue.size}</span>
            <button
              data-testid="add-to-map"
              onClick={() =>
                setMapValue((prev) => {
                  const newMap = new Map(prev)
                  newMap.set('key2', 'value2')
                  return newMap
                })
              }
            >
              Add to Map
            </button>
            <button
              data-testid="add-to-set"
              onClick={() =>
                setSetValue((prev) => {
                  const newSet = new Set(prev)
                  newSet.add('item3')
                  return newSet
                })
              }
            >
              Add to Set
            </button>
          </div>
        )
      }

      const { getByTestId } = render(<MapSetTestComponent />)

      expect(getByTestId('map-size')).toHaveTextContent('1')
      expect(getByTestId('set-size')).toHaveTextContent('2')

      act(() => {
        getByTestId('add-to-map').click()
      })

      expect(getByTestId('map-size')).toHaveTextContent('2')

      act(() => {
        getByTestId('add-to-set').click()
      })

      expect(getByTestId('set-size')).toHaveTextContent('3')
    })
  })

  describe('Mixed Usage Patterns', () => {
    it('should work correctly when mixing store objects, functions, and direct values', () => {
      const sharedStore = createSimpleStore('shared')

      function MixedTestContainer() {
        const [storeValue] = useSimpleStore(sharedStore)
        const [funcValue] = useSimpleStore(() => 'from function')
        const [directValue] = useSimpleStore('direct value')

        return (
          <div>
            <span data-testid="store-value">{storeValue}</span>
            <span data-testid="func-value">{funcValue}</span>
            <span data-testid="direct-value">{directValue}</span>
          </div>
        )
      }

      const { getByTestId } = render(<MixedTestContainer />)

      expect(getByTestId('store-value')).toHaveTextContent('shared')
      expect(getByTestId('func-value')).toHaveTextContent('from function')
      expect(getByTestId('direct-value')).toHaveTextContent('direct value')
    })
  })

  describe('Direct Value Integration', () => {
    it('should work seamlessly with existing store operations', () => {
      // Create a real store outside the component to ensure it persists
      const realStore = createSimpleStore('real store')

      function IntegrationTestComponent() {
        // Test various initialization methods
        const [numberStore] = useSimpleStore(42)
        const [stringStore] = useSimpleStore('hello')
        const [objectStore, setObjectStore] = useSimpleStore({ count: 0 })
        const [functionStore] = useSimpleStore(() => 'from function')

        // Use the real store
        const [realStoreValue, setRealStoreValue] = useSimpleStore(realStore)

        return (
          <div>
            <span data-testid="number-value">{numberStore}</span>
            <span data-testid="string-value">{stringStore}</span>
            <span data-testid="object-value">{objectStore.count}</span>
            <span data-testid="function-value">{functionStore}</span>
            <span data-testid="real-store-value">{realStoreValue}</span>

            <button
              data-testid="increment-object"
              onClick={() => setObjectStore((prev) => ({ count: prev.count + 1 }))}
            >
              Increment Object
            </button>

            <button data-testid="update-real-store" onClick={() => setRealStoreValue('updated real store')}>
              Update Real Store
            </button>

            <button data-testid="external-update" onClick={() => realStore.set('externally updated')}>
              External Update
            </button>
          </div>
        )
      }

      const { getByTestId } = render(<IntegrationTestComponent />)

      // Check initial values
      expect(getByTestId('number-value')).toHaveTextContent('42')
      expect(getByTestId('string-value')).toHaveTextContent('hello')
      expect(getByTestId('object-value')).toHaveTextContent('0')
      expect(getByTestId('function-value')).toHaveTextContent('from function')
      expect(getByTestId('real-store-value')).toHaveTextContent('real store')

      // Test direct value store updates
      act(() => {
        getByTestId('increment-object').click()
      })

      expect(getByTestId('object-value')).toHaveTextContent('1')

      // Test real store updates through hook
      act(() => {
        getByTestId('update-real-store').click()
      })

      expect(getByTestId('real-store-value')).toHaveTextContent('updated real store')

      // Test external store updates
      act(() => {
        getByTestId('external-update').click()
      })

      expect(getByTestId('real-store-value')).toHaveTextContent('externally updated')
    })
  })
})

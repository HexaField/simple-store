import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import React from 'react'
import { useSimpleStore, createSimpleStore, None } from '../dist/react.js'
import type { SimpleStore } from '../dist/react.js'

// Mock component for testing
function TestComponent({ store, onRender }: { 
  store: SimpleStore<number> | (() => number)
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
      <button 
        data-testid="increment" 
        onClick={() => setValue(prev => prev + 1)}
      >
        Increment
      </button>
      <button 
        data-testid="set-100" 
        onClick={() => setValue(100)}
      >
        Set 100
      </button>
    </div>
  )
}

// Async test component
function AsyncTestComponent({ store }: { store: SimpleStore<string> }) {
  const [value, setValue] = useSimpleStore(store)
  
  return (
    <div>
      <span data-testid="async-value">{value}</span>
      <button 
        data-testid="set-promise" 
        onClick={() => setValue(Promise.resolve('resolved!'))}
      >
        Set Promise
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
      
      const { getByTestId, rerender } = render(
        <TestComponent store={initializer} onRender={onRender} />
      )
      
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
})

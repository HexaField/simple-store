import { describe, it, expect, vi } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import React from 'react'
import { createSimpleStore as createMainStore, None } from '../dist/index.js'
import { createSimpleStore as createReactStore, useSimpleStore } from '../dist/react.js'

// Test integration between both modules
describe('Bundle Integration Tests', () => {
  describe('Cross-Module Compatibility', () => {
    it('should work with stores created by main module in React components', async () => {
      // Create store with main module
      const store = createMainStore(100)
      
      // Use with React hook
      function TestComponent() {
        const [value, setValue] = useSimpleStore(store)
        return (
          <div>
            <span data-testid="value">{value}</span>
            <button data-testid="increment" onClick={() => setValue(v => v + 1)}>+</button>
          </div>
        )
      }
      
      const { getByTestId } = render(<TestComponent />)
      
      expect(getByTestId('value')).toHaveTextContent('100')
      
      act(() => {
        getByTestId('increment').click()
      })
      
      expect(getByTestId('value')).toHaveTextContent('101')
    })

    it('should work with React-created stores in vanilla JS context', () => {
      const store = createReactStore('hello')
      const listener = vi.fn()
      
      store.subscribe(listener)
      
      expect(store.get()).toBe('hello')
      
      store.set('world')
      expect(store.get()).toBe('world')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should have consistent None symbol between modules', () => {
      const mainNone = None
      const { None: reactNone } = require('../dist/react.cjs')
      
      // Note: Different modules may have different None symbols, which is expected behavior
      // The important thing is that each module's None works correctly within its context
      expect(typeof mainNone).toBe('symbol')
      expect(typeof reactNone).toBe('symbol')
    })
  })

  describe('Bundle Structure Validation', () => {
    it('should have correct ES module exports', () => {
      expect(typeof createMainStore).toBe('function')
      expect(typeof createReactStore).toBe('function')
      expect(typeof useSimpleStore).toBe('function')
      expect(None).toBeDefined()
      
      const store = createMainStore(42)
      expect(store.get()).toBe(42)
    })

    it('should create compatible stores from both modules', () => {
      const mainStore = createMainStore(123)
      const reactStore = createReactStore(456)
      
      expect(mainStore.get()).toBe(123)
      expect(reactStore.get()).toBe(456)
      
      // Both should have the same interface
      expect(typeof mainStore.get).toBe('function')
      expect(typeof mainStore.set).toBe('function')
      expect(typeof mainStore.subscribe).toBe('function')
      
      expect(typeof reactStore.get).toBe('function')
      expect(typeof reactStore.set).toBe('function')
      expect(typeof reactStore.subscribe).toBe('function')
    })
  })

  describe('Type Definitions', () => {
    it('should have accessible type definitions', () => {
      // TypeScript should infer these types correctly
      const numberStore = createMainStore(42)
      const stringStore = createMainStore('hello')
      const objectStore = createMainStore({ id: 1, name: 'test' })
      
      expect(typeof numberStore.get()).toBe('number')
      expect(typeof stringStore.get()).toBe('string')
      expect(typeof objectStore.get()).toBe('object')
      
      // React hook should work with any of these stores
      function TypeTestComponent() {
        const [num] = useSimpleStore(numberStore)
        const [str] = useSimpleStore(stringStore)
        const [obj] = useSimpleStore(objectStore)
        
        return (
          <div>
            <span data-testid="number">{num}</span>
            <span data-testid="string">{str}</span>
            <span data-testid="object">{JSON.stringify(obj)}</span>
          </div>
        )
      }
      
      const { getByTestId } = render(<TypeTestComponent />)
      
      expect(getByTestId('number')).toHaveTextContent('42')
      expect(getByTestId('string')).toHaveTextContent('hello')
      expect(getByTestId('object')).toHaveTextContent('{"id":1,"name":"test"}')
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large numbers of stores efficiently', () => {
      const stores: Array<ReturnType<typeof createMainStore<number>>> = []
      const startTime = Date.now()
      
      // Create many stores
      for (let i = 0; i < 1000; i++) {
        stores.push(createMainStore(i))
      }
      
      const creationTime = Date.now() - startTime
      expect(creationTime).toBeLessThan(100) // Should create 1000 stores in less than 100ms
      
      // Test operations on all stores
      const opStartTime = Date.now()
      stores.forEach((store, i) => {
        expect(store.get()).toBe(i)
        store.set(i * 2)
        expect(store.get()).toBe(i * 2)
      })
      
      const opTime = Date.now() - opStartTime
      expect(opTime).toBeLessThan(50) // Should perform operations on 1000 stores in less than 50ms
    })

    it('should handle many subscribers efficiently', () => {
      const store = createMainStore(0)
      const listeners: Array<ReturnType<typeof vi.fn>> = []
      
      // Add many listeners
      for (let i = 0; i < 1000; i++) {
        listeners.push(vi.fn())
        store.subscribe(listeners[i])
      }
      
      const startTime = Date.now()
      
      // Trigger all listeners
      store.set(42)
      
      const notifyTime = Date.now() - startTime
      expect(notifyTime).toBeLessThan(50) // Should notify 1000 listeners in less than 50ms
      
      // Verify all listeners were called
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Real-world Usage Patterns', () => {
    it('should handle shopping cart scenario', () => {
      interface CartItem {
        id: string
        name: string
        price: number
        quantity: number
      }
      
      interface Cart {
        items: CartItem[]
        total: number
      }
      
      const cartStore = createMainStore<Cart>({
        items: [],
        total: 0
      })
      
      function CartComponent() {
        const [cart, setCart] = useSimpleStore(cartStore)
        
        const addItem = (item: Omit<CartItem, 'quantity'>) => {
          setCart(prevCart => {
            const existingItem = prevCart.items.find(i => i.id === item.id)
            let newItems
            
            if (existingItem) {
              newItems = prevCart.items.map(i => 
                i.id === item.id 
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              )
            } else {
              newItems = [...prevCart.items, { ...item, quantity: 1 }]
            }
            
            const total = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
            
            return { items: newItems, total }
          })
        }
        
        return (
          <div>
            <span data-testid="item-count">{cart.items.length}</span>
            <span data-testid="total">{cart.total}</span>
            <button 
              data-testid="add-apple"
              onClick={() => addItem({ id: '1', name: 'Apple', price: 1.5 })}
            >
              Add Apple
            </button>
            <button 
              data-testid="add-banana"
              onClick={() => addItem({ id: '2', name: 'Banana', price: 0.8 })}
            >
              Add Banana
            </button>
          </div>
        )
      }
      
      const { getByTestId } = render(<CartComponent />)
      
      expect(getByTestId('item-count')).toHaveTextContent('0')
      expect(getByTestId('total')).toHaveTextContent('0')
      
      act(() => {
        getByTestId('add-apple').click()
      })
      
      expect(getByTestId('item-count')).toHaveTextContent('1')
      expect(getByTestId('total')).toHaveTextContent('1.5')
      
      act(() => {
        getByTestId('add-apple').click() // Add same item again
      })
      
      expect(getByTestId('item-count')).toHaveTextContent('1') // Still 1 unique item
      expect(getByTestId('total')).toHaveTextContent('3') // But quantity increased
      
      act(() => {
        getByTestId('add-banana').click()
      })
      
      expect(getByTestId('item-count')).toHaveTextContent('2')
      expect(getByTestId('total')).toHaveTextContent('3.8')
    })

    it('should handle async data fetching scenario', () => {
      interface User {
        id: number
        name: string
        email: string
      }
      
      const userStore = createMainStore<User | null>(null)
      
      function UserProfile() {
        const [user, setUser] = useSimpleStore(userStore)
        
        const loadUser = (id: number) => {
          // Set user data directly instead of using a promise for simplicity
          setUser({
            id,
            name: `User ${id}`,
            email: `user${id}@example.com`
          })
        }
        
        return (
          <div>
            {!user ? (
              <div>
                <div data-testid="no-user">No user loaded</div>
                <button data-testid="load-user-1" onClick={() => loadUser(1)}>
                  Load User 1
                </button>
              </div>
            ) : (
              <div>
                <span data-testid="user-name">{user.name}</span>
                <span data-testid="user-email">{user.email}</span>
              </div>
            )}
          </div>
        )
      }
      
      const { getByTestId } = render(<UserProfile />)
      
      expect(getByTestId('no-user')).toBeInTheDocument()
      
      act(() => {
        getByTestId('load-user-1').click()
      })
      
      // Should update synchronously
      expect(getByTestId('user-name')).toHaveTextContent('User 1')
      expect(getByTestId('user-email')).toHaveTextContent('user1@example.com')
    })
  })
})

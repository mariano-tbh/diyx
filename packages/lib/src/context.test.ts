import { describe, expect, test, vi } from 'vitest'
import { defineToken, type InferToken } from './di'
import { defineContext } from './context'

describe('defineContext', () => {
  describe('value descriptor', () => {
    test('resolves the provided value as a dep', async () => {
      // setup tokens
      type Logger = { log: () => void }
      const Logger = defineToken<Logger>('@app/logger')
      type Service = { run: () => void }
      const Service = defineToken<Service>('@app/service')

      // create impls
      const loggerImpl = { log: () => { } } as Logger
      const serviceFactory = vi.fn((logger: Logger) => {
        return { run: () => logger.log() } as Service
      })

      // configure context
      const ctx = defineContext(b =>
        b.for(Logger).use({ value: loggerImpl })
          .for(Service).use({
            inject: [Logger],
            factory: serviceFactory,
          })
      )

      // build
      await ctx.build()

      // assert
      expect(serviceFactory).toHaveBeenCalledWith(loggerImpl, undefined) // no signal passed
    })
  })

  describe('factory descriptor', () => {
    test('passes resolved deps as positional args', async () => {
      const A = defineToken<number>('@app/a')
      const B = defineToken<string>('@app/b')
      const C = defineToken<string>('@app/c')

      const factory = vi.fn((_a: number, _b: string, _signal: AbortSignal | undefined) => 'done')

      const ctx = defineContext(b =>
        b.for(A).use({ value: 42 })
          .for(B).use({ value: 'hello' })
          .for(C).use({ inject: [A, B], factory })
      )

      await ctx.build()

      expect(factory).toHaveBeenCalledWith(42, 'hello', undefined)
    })

    test('passes signal as the last arg after deps', async () => {
      const Token = defineToken<number>('@app/token')
      const controller = new AbortController()
      const factory = vi.fn((_signal: AbortSignal | undefined) => 1)

      const ctx = defineContext(b => b.for(Token).use({ factory }))

      await ctx.build({ signal: controller.signal })

      expect(factory).toHaveBeenCalledWith(controller.signal)
    })

    test('passes undefined as signal when build() called without one', async () => {
      const Token = defineToken<number>('@app/token')
      const factory = vi.fn((_signal: AbortSignal | undefined) => 1)

      const ctx = defineContext(b => b.for(Token).use({ factory }))

      await ctx.build()

      expect(factory).toHaveBeenCalledWith(undefined)
    })

    test('awaits async factories', async () => {
      const Token = defineToken<string>('@app/token')
      let resolved = false

      const ctx = defineContext(b =>
        b.for(Token).use({
          factory: async () => {
            await Promise.resolve()
            resolved = true
            return 'async-value'
          },
        })
      )

      await ctx.build()

      expect(resolved).toBe(true)
    })

    test('async factory result is passed as dep to dependents', async () => {
      const A = defineToken<string>('@app/a')
      const B = defineToken<string>('@app/b')
      const factoryB = vi.fn((_a: string, _signal: AbortSignal | undefined) => 'b')

      const ctx = defineContext(b =>
        b.for(A).use({ factory: async () => { await Promise.resolve(); return 'async-a' } })
          .for(B).use({ inject: [A], factory: factoryB })
      )

      await ctx.build()

      expect(factoryB).toHaveBeenCalledWith('async-a', undefined)
    })
  })

  describe('topological sort', () => {
    test('resolves deps correctly regardless of registration order', async () => {
      const A = defineToken<number>('@app/a')
      const B = defineToken<number>('@app/b')
      const factoryB = vi.fn((a: number, _signal: AbortSignal | undefined) => a + 1)

      // B registered before A, but B depends on A
      const ctx = defineContext(b =>
        b.for(B).use({ inject: [A], factory: factoryB })
          .for(A).use({ value: 10 })
      )

      await ctx.build()

      expect(factoryB).toHaveBeenCalledWith(10, undefined)
    })

    test('resolves a three-level chain in the correct order', async () => {
      const A = defineToken<number>('@app/a')
      const B = defineToken<number>('@app/b')
      const C = defineToken<number>('@app/c')
      const order: string[] = []

      const ctx = defineContext(b =>
        b.for(C).use({ inject: [B], factory: (b) => { order.push('C'); return b + 1 } })
          .for(B).use({ inject: [A], factory: (a) => { order.push('B'); return a + 1 } })
          .for(A).use({ value: 0 })
      )

      await ctx.build()

      expect(order).toEqual(['B', 'C'])
    })
  })

  describe('validation at build time', () => {
    test('throws when an injected token is not registered', async () => {
      const Logger = defineToken<{ log: () => void }>('@app/logger')
      const Service = defineToken<{ run: () => void }>('@app/service')

      const ctx = defineContext(b =>
        b.for(Service).use({
          inject: [Logger],
          factory: (logger) => ({ run: () => logger.log() }),
        })
        // Logger intentionally not registered
      )

      await expect(ctx.build()).rejects.toThrow('"@app/service" depends on "@app/logger"')
    })

    test('throws with a circular dependency error', async () => {
      const A = defineToken<unknown>('@app/a')
      const B = defineToken<unknown>('@app/b')

      const ctx = defineContext(b =>
        b.for(A).use({ inject: [B], factory: () => ({}) })
          .for(B).use({ inject: [A], factory: () => ({}) })
      )

      await expect(ctx.build()).rejects.toThrow('circular dependency')
    })
  })

  describe('provide', () => {
    test('returns a DocumentFragment', async () => {
      const ctx = defineContext(b => b.for(defineToken<number>('@app/n')).use({ value: 1 }))
      const { provide } = await ctx.build()
      expect(provide({})).toBeInstanceOf(DocumentFragment)
    })

    test('build() can be called multiple times to get independent providers', async () => {
      const Token = defineToken<number>('@app/token')
      const factory = vi.fn((_signal: AbortSignal | undefined) => 1)

      const ctx = defineContext(b => b.for(Token).use({ factory }))

      await ctx.build()
      await ctx.build()

      expect(factory).toHaveBeenCalledTimes(2)
    })
  })
})

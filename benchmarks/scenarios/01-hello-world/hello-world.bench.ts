import { bench, describe } from 'vitest'
import { mount, h } from '@diyx/lib'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'

describe('hello-world', () => {
  bench('diyx', () => {
    const container = document.createElement('div')
    const unmount = mount(container, h('h1', null, 'Hello, World!'))
    unmount()
  })

  bench('react', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    flushSync(() => root.render(createElement('h1', null, 'Hello, World!')))
    root.unmount()
  })
})

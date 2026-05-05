import '@testing-library/jest-dom/vitest'

class ResizeObserverMock {
  disconnect() {}
  observe() {}
  unobserve() {}
}

const getComputedStyle = window.getComputedStyle.bind(window)

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  }),
})

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
})

Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: (element: Element) => getComputedStyle(element),
})

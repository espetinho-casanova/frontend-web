// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock do Next.js Router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock do next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock do react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

// Mock do nookies
jest.mock('nookies', () => ({
  setCookie: jest.fn(),
  parseCookies: jest.fn(() => ({})),
  destroyCookie: jest.fn(),
}))

// Mock do react-icons
jest.mock('react-icons/fi', () => ({
  FiX: () => <span>X</span>,
  FiMinus: () => <span>-</span>,
  FiPlus: () => <span>+</span>,
  FiShoppingCart: () => <span>Cart</span>,
  FiTrash2: () => <span>Trash</span>,
  FiEdit2: () => <span>Edit</span>,
  FiLogOut: () => <span>Logout</span>,
  FiCheckCircle: () => <span>Check</span>,
}))


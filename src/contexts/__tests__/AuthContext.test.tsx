import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../AuthContext';
import { useContext } from 'react';
import { api } from '../../services/apiClient';
import * as nookies from 'nookies';
import Router from 'next/router';

// Mock do apiClient
jest.mock('../../services/apiClient', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: {
      headers: {},
    },
  },
}));

// Mock do nookies
jest.mock('nookies', () => ({
  setCookie: jest.fn(),
  parseCookies: jest.fn(),
  destroyCookie: jest.fn(),
}));

// Mock do next/router
jest.mock('next/router', () => ({
  push: jest.fn(),
}));

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Componente de teste que usa o contexto
function TestComponent() {
  const { user, isAuthenticated, signIn, signOut, signUp } = useContext(AuthContext);

  return (
    <div>
      <div data-testid="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="user">{user ? user.name : 'no-user'}</div>
      <button data-testid="signIn" onClick={() => signIn({ login: 'test', password: '123' })}>
        Sign In
      </button>
      <button data-testid="signOut" onClick={signOut}>
        Sign Out
      </button>
      <button
        data-testid="signUp"
        onClick={() => signUp({ name: 'Test', login: 'test', password: '123' })}
      >
        Sign Up
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (nookies.parseCookies as jest.Mock).mockReturnValue({});
  });

  it('deve renderizar o provider sem erros', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('isAuthenticated')).toBeInTheDocument();
  });

  it('deve iniciar sem usuário autenticado quando não há token', () => {
    (nookies.parseCookies as jest.Mock).mockReturnValue({});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('deve autenticar usuário quando há token válido', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'Test User',
      login: 'test',
    };

    (nookies.parseCookies as jest.Mock).mockReturnValue({
      '@es-casanova.token': 'valid-token',
    });

    (api.get as jest.Mock).mockResolvedValue({
      data: mockUser,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/userinfo');
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });
  });

  it('deve fazer login com credenciais válidas', async () => {
    const mockResponse = {
      id: 'user-123',
      name: 'Test User',
      login: 'test',
      token: 'new-token',
    };

    (api.post as jest.Mock).mockResolvedValue({
      data: mockResponse,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const signInButton = screen.getByTestId('signIn');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/session', {
        login: 'test',
        password: '123',
      });
    });

    await waitFor(() => {
      expect(nookies.setCookie).toHaveBeenCalled();
      expect(Router.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('deve fazer logout corretamente', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const signOutButton = screen.getByTestId('signOut');
    fireEvent.click(signOutButton);

    expect(nookies.destroyCookie).toHaveBeenCalledWith(
      undefined,
      '@es-casanova.token'
    );
    expect(Router.push).toHaveBeenCalledWith('/');
  });

  it('deve fazer cadastro com sucesso', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { id: 'user-123', name: 'Test', login: 'test' },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const signUpButton = screen.getByTestId('signUp');
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users', {
        name: 'Test',
        login: 'test',
        password: '123',
      });
    });

    await waitFor(() => {
      expect(Router.push).toHaveBeenCalledWith('/');
    });
  });

  it('deve deslogar usuário quando token é inválido', async () => {
    (nookies.parseCookies as jest.Mock).mockReturnValue({
      '@es-casanova.token': 'invalid-token',
    });

    (api.get as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(nookies.destroyCookie).toHaveBeenCalled();
      expect(Router.push).toHaveBeenCalledWith('/');
    });
  });
});


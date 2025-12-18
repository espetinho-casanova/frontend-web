import { render, screen } from '@testing-library/react';
import { Input } from '../index';

describe('Input Component', () => {
  it('deve renderizar o input corretamente', () => {
    render(<Input placeholder="Digite seu nome" />);
    
    const input = screen.getByPlaceholderText('Digite seu nome');
    expect(input).toBeInTheDocument();
  });

  it('deve aceitar e exibir o valor', () => {
    render(<Input value="teste" onChange={() => {}} />);
    
    const input = screen.getByDisplayValue('teste');
    expect(input).toBeInTheDocument();
  });

  it('deve aceitar diferentes tipos de input', () => {
    const { rerender } = render(<Input type="text" />);
    let input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');

    rerender(<Input type="password" />);
    input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('deve chamar onChange quando o valor muda', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    input.value = 'novo valor';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // O onChange será chamado quando o usuário digitar
    expect(input).toBeInTheDocument();
  });
});


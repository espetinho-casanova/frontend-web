import { createTheme, PaletteOptions } from '@mui/material/styles';

interface CustomPaletteOptions extends PaletteOptions {
  ativo: { main: string };
  inativo: { main: string };
  dark: { main: string };
}

declare module '@mui/material/styles/createPalette' {
  interface Palette extends CustomPaletteOptions { }
}

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: '#2196F3',
    },
    secondary: {
      main: '#9C27B0',
    },
    error: {
      main: '#D32F2F',
    },
    info: {
      main: '#0288D1',
    },
    warning: {
      main: '#EF6C00',
    },
    danger: {
      main: '#EE368C',
    },
    background: {
      default: "#F5F5F5",
    },
    ativo: {
      main: 'rgba(15, 183, 107, 0.12)',
    },
    inativo: {
      main: 'rgba(255, 218, 218, 0.49)',
    },
    dark: {
      main: '#260944',
    },
    action: {
      selected: '#2196F314'
    },
  } as CustomPaletteOptions
});

export default theme;
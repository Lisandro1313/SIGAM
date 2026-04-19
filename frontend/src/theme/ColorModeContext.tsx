import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export type ThemeMode = 'amanecer' | 'sol' | 'anochecer' | 'luna';

interface ColorModeContextType {
  mode: ThemeMode;
  /** Ciclo entre los 4 modos (compat con toggle viejo de light/dark). */
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
  /** 'light' | 'dark' — útil para componentes que aún miran palette.mode. */
  paletteMode: 'light' | 'dark';
}

const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'sol',
  toggle: () => {},
  setMode: () => {},
  paletteMode: 'light',
});

export const useColorMode = () => useContext(ColorModeContext);

const STORAGE_KEY = 'sigam.colorMode';
const MODE_ORDER: ThemeMode[] = ['amanecer', 'sol', 'anochecer', 'luna'];

function migrate(saved: string | null): ThemeMode {
  if (saved === 'amanecer' || saved === 'sol' || saved === 'anochecer' || saved === 'luna') return saved;
  // Compat con valores viejos light/dark
  if (saved === 'light') return 'sol';
  if (saved === 'dark') return 'luna';
  return 'sol';
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try { return migrate(localStorage.getItem(STORAGE_KEY)); } catch { return 'sol'; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  const value = useMemo<ColorModeContextType>(
    () => ({
      mode,
      paletteMode: mode === 'anochecer' || mode === 'luna' ? 'dark' : 'light',
      setMode: (m) => setModeState(m),
      toggle: () => setModeState((prev) => {
        const i = MODE_ORDER.indexOf(prev);
        return MODE_ORDER[(i + 1) % MODE_ORDER.length];
      }),
    }),
    [mode]
  );

  const theme = useMemo(() => {
    // Paletas por modo
    if (mode === 'amanecer') {
      return createTheme({
        palette: {
          mode: 'light',
          primary: { main: '#ef6c00', light: '#ff9e40', dark: '#b53d00' }, // naranja amanecer
          secondary: { main: '#ec407a' }, // rosa
          background: { default: '#fff5ec', paper: '#fffaf3' },
          info: { main: '#ffb74d' },
        },
      });
    }
    if (mode === 'sol') {
      return createTheme({
        palette: {
          mode: 'light',
          primary: { main: '#1976d2' },
          secondary: { main: '#dc004e' },
        },
      });
    }
    if (mode === 'anochecer') {
      return createTheme({
        palette: {
          mode: 'dark',
          primary: { main: '#b39ddb', light: '#e6ceff', dark: '#836fa9' }, // violeta suave
          secondary: { main: '#f48fb1' }, // rosa tenue
          background: { default: '#1a1033', paper: '#241542' },
          info: { main: '#9575cd' },
        },
      });
    }
    // luna (dark clásico)
    return createTheme({
      palette: {
        mode: 'dark',
        primary: { main: '#90caf9' },
        secondary: { main: '#f06292' },
        background: { default: '#0e1116', paper: '#161b22' },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

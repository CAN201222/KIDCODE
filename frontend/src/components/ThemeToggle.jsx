import { Moon, Sun } from 'lucide-react';
import useTheme from '../useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;

  return <button
    type="button"
    className={`theme-toggle ${className}`.trim()}
    onClick={toggleTheme}
    aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    aria-pressed={isDark}
    title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
  >
    <Icon aria-hidden="true" />
    <span className="theme-toggle-label">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
  </button>;
}

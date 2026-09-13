'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
    setMounted(true);

    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('webmail_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('webmail_theme', 'light');
    }
    window.dispatchEvent(new Event('theme-change'));
  };

  if (!mounted) {
    return (
      <button
        aria-label="Cambiar tema"
        className={`h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground transition-colors hover:bg-muted/80 ${className}`}
        disabled
      >
        <Sun className="h-4.5 w-4.5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`group flex items-center gap-2.5 rounded-full p-2 text-foreground transition-all duration-200 hover:bg-muted/80 active:scale-95 cursor-pointer ${className}`}
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        {isDark ? (
          <Sun className="h-4.5 w-4.5 text-amber-300 transition-transform duration-200 group-hover:rotate-45" />
        ) : (
          <Moon className="h-4.5 w-4.5 text-slate-700 transition-transform duration-200 group-hover:-rotate-12" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-foreground">
          {isDark ? 'Modo claro' : 'Modo oscuro'}
        </span>
      )}
    </button>
  );
}

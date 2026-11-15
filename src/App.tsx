import { NavLink, Route, Routes } from 'react-router-dom';
import { setThemePref, useTheme } from './lib/theme';
import Settings from './pages/Settings';
import { useTranslation } from 'react-i18next';
import Today from './pages/Today';
import Discover from './pages/Discover';
import Stats from './pages/Stats';
import History from './pages/History';

const NAV = [
  { to: '/', key: 'today' },
  { to: '/stats', key: 'stats' },
  { to: '/history', key: 'history' },
  { to: '/discover', key: 'discover' },
  { to: '/settings', key: 'settings' },
] as const;

export default function App() {
  const { t, i18n } = useTranslation();
  const { dark } = useTheme();
  const toggle = () => setThemePref(dark ? 'light' : 'dark');

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <h1 className="text-xl font-bold tracking-tight">🧩 {t('app.title')}</h1>
        <nav className="flex flex-wrap gap-1 text-sm">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 ${
                  isActive
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'hover:bg-stone-200 dark:hover:bg-stone-800'
                }`
              }
            >
              {t(`nav.${n.key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
            className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-200 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            {t('lang.switch')}
          </button>
          <button
            onClick={toggle}
            aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
            title={dark ? t('theme.toLight') : t('theme.toDark')}
            className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-200 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/history" element={<History />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

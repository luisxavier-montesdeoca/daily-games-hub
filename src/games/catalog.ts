import type { Game } from '../types';

/**
 * The built-in game catalog. To add a game, add one entry here.
 * Order here is the default display order.
 */
export const CATALOG: Game[] = [
  {
    id: 'wordle',
    name: 'Wordle',
    url: 'https://www.nytimes.com/games/wordle/index.html',
    lang: 'en',
    resultKind: 'guesses',
    hasWinLoss: true,
    maxValue: 6,
    tags: ['word', 'deduction'],
    icon: '🟩',
  },
  {
    id: 'connections',
    name: 'Connections',
    url: 'https://www.nytimes.com/games/connections',
    lang: 'en',
    resultKind: 'mistakes',
    hasWinLoss: true,
    maxValue: 4,
    tags: ['word', 'grouping'],
    icon: '🟪',
  },
  {
    id: 'strands',
    name: 'Strands',
    url: 'https://www.nytimes.com/games/strands',
    lang: 'en',
    resultKind: 'hints',
    hasWinLoss: false,
    tags: ['word', 'search'],
    icon: '🔵',
  },
  {
    id: 'palabra-del-dia',
    name: 'La Palabra del Día',
    url: 'https://lapalabradeldia.com',
    lang: 'es',
    resultKind: 'guesses',
    hasWinLoss: true,
    maxValue: 6,
    tags: ['word', 'deduction', 'spanish'],
    icon: '🔤', // flag emoji don't render on Windows
  },
  {
    id: 'minute-cryptic',
    name: 'Minute Cryptic',
    url: 'https://www.minutecryptic.com',
    lang: 'en',
    resultKind: 'solved',
    hasWinLoss: true,
    tags: ['word', 'cryptic'],
    icon: '🧩',
  },
  {
    id: 'krillion',
    name: 'Krillion',
    url: 'https://krillion.io',
    lang: 'en',
    resultKind: 'score',
    hasWinLoss: false,
    maxValue: 700,
    tags: ['trivia', 'rare-answer'],
    icon: '🦐',
  },
  {
    id: 'noillirk',
    name: 'Noillirk',
    url: 'https://noillirk.com',
    lang: 'en',
    resultKind: 'score',
    hasWinLoss: false,
    // Share text gives meters climbed ("8,840m").
    unit: 'meters',
    tags: ['trivia', 'common-answer'],
    icon: '🎈',
  },
  {
    id: 'farflung',
    name: 'Farflung',
    url: 'https://farflung.game',
    lang: 'en',
    resultKind: 'score',
    hasWinLoss: false,
    // Share text: "140/500 km".
    maxValue: 500,
    unit: 'km',
    tags: ['geography'],
    icon: '🌍',
  },
  {
    id: '301',
    name: '301',
    url: 'https://301juegodiario.com/301',
    lang: 'es',
    resultKind: 'score',
    hasWinLoss: false,
    // Points left after 5 darts: 0 is a perfect game.
    maxValue: 301,
    lowerIsBetter: true,
    tags: ['numbers', 'trivia', 'spanish'],
    icon: '🎯',
  },
  {
    id: 'pop-301',
    name: 'Pop',
    url: 'https://301juegodiario.com/pop.html',
    lang: 'es',
    resultKind: 'score',
    hasWinLoss: false,
    // Numbers found (of 5) before the balloon pops.
    maxValue: 5,
    unit: 'questions',
    tags: ['numbers', 'trivia', 'spanish'],
    icon: '⏱️',
  },
  {
    id: 'atrapa',
    name: 'Atrapa la respuesta',
    url: 'https://301juegodiario.com/atrapa.html',
    lang: 'es',
    resultKind: 'score',
    hasWinLoss: false,
    // 7 questions, up to 100 points each.
    maxValue: 700,
    tags: ['numbers', 'estimation', 'trivia', 'spanish'],
    icon: '🎣',
  },
  {
    id: 'size-it-up',
    name: 'Magnitudle: Size It Up',
    url: 'https://magnitudle.com/size-it-up',
    lang: 'en',
    resultKind: 'score',
    hasWinLoss: false,
    // Share text: "Score: 215/500".
    maxValue: 500,
    tags: ['numbers', 'estimation', 'trivia'],
    icon: '📏',
  },
];

export const GAMES_BY_ID: Record<string, Game> = Object.fromEntries(CATALOG.map((g) => [g.id, g]));

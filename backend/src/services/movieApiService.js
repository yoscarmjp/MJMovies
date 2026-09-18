import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import slugify from 'slugify';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const DEFAULT_WORKING_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

const FALLBACK_MOVIES = [
  {
    id: 27205,
    title: 'Inception (El Origen)',
    overview: 'Dom Cobb es un ladrón capaz de adentrarse en los sueños de la gente y hacerse con sus secretos. Su habilidad lo ha convertido en un codiciado jugador en el espionaje corporativo.',
    release_date: '2010-07-15',
    vote_average: 8.4,
    poster_path: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
    backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    genres: ['Ciencia Ficción', 'Acción', 'Aventura'],
    runtime: 148,
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy'],
    trailer_url: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
    media_type: 'movie',
  },
  {
    id: 157336,
    title: 'Interstellar',
    overview: 'Un grupo de científicos y exploradores, encabezados por Cooper, se embarcan en un viaje espacial para encontrar un lugar con mejores condiciones para la vida humana.',
    release_date: '2014-11-05',
    vote_average: 8.4,
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop_path: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    genres: ['Ciencia Ficción', 'Drama', 'Aventura'],
    runtime: 169,
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
    trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    media_type: 'movie',
  },
  {
    id: 155,
    title: 'The Dark Knight (El Caballero de la Noche)',
    overview: 'Batman/Bruce Wayne regresa para continuar su guerra contra el crimen. Con la ayuda del teniente Jim Gordon y del fiscal Harvey Dent, Batman se propone desmantelar las organizaciones criminales.',
    release_date: '2008-07-16',
    vote_average: 8.5,
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop_path: '/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    genres: ['Acción', 'Crimen', 'Drama'],
    runtime: 152,
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine'],
    trailer_url: 'https://www.youtube.com/watch?v=EXeTwQWrcwY',
    media_type: 'movie',
  },
  {
    id: 299536,
    title: 'Avengers: Infinity War',
    overview: 'El todopoderoso Thanos ha despertado con la promesa de arrasar con todo a su paso, portando el Guantelete del Infinito, que le confiere un poder incalculable.',
    release_date: '2018-04-25',
    vote_average: 8.3,
    poster_path: '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
    backdrop_path: '/bOGkgRGdhrBYJSLpXaxhXVstNsV.jpg',
    genres: ['Acción', 'Aventura', 'Ciencia Ficción'],
    runtime: 149,
    director: 'Anthony Russo, Joe Russo',
    cast: ['Robert Downey Jr.', 'Chris Hemsworth', 'Mark Ruffalo', 'Chris Evans'],
    trailer_url: 'https://www.youtube.com/watch?v=6ZfuNTqbHE8',
    media_type: 'movie',
  },
  {
    id: 19995,
    title: 'Avatar',
    overview: 'En las exuberantes tierras extraterrestres de Pandora viven los Na\'vi, seres que parecen primitivos pero que están altamente evolucionados.',
    release_date: '2009-12-15',
    vote_average: 7.6,
    poster_path: '/kyeqWdyUXW608qlYkRqosgbbJyK.jpg',
    backdrop_path: '/vL5LR6WdxWPjCmv2wMC6X1r6m9M.jpg',
    genres: ['Acción', 'Aventura', 'Fantasía', 'Ciencia Ficción'],
    runtime: 162,
    director: 'James Cameron',
    cast: ['Sam Worthington', 'Zoe Saldana', 'Sigourney Weaver', 'Stephen Lang'],
    trailer_url: 'https://www.youtube.com/watch?v=5PSNL1qE6VY',
    media_type: 'movie',
  },
  {
    id: 603,
    title: 'The Matrix (Matrix)',
    overview: 'Thomas Anderson es un brillante programador de una respetable compañía de software. Fuera del trabajo es Neo, un hacker que un día recibe una misteriosa llamada.',
    release_date: '1999-03-30',
    vote_average: 8.2,
    poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    backdrop_path: '/l4QHerTSbflqI8mbtx4f04qG7y0.jpg',
    genres: ['Acción', 'Ciencia Ficción'],
    runtime: 136,
    director: 'Lilly Wachowski, Lana Wachowski',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving'],
    trailer_url: 'https://www.youtube.com/watch?v=vKQi3bBA1y8',
    media_type: 'movie',
  },
  {
    id: 872585,
    title: 'Oppenheimer',
    overview: 'La historia del científico estadounidense J. Robert Oppenheimer y su papel fundamental en el desarrollo de la bomba atómica.',
    release_date: '2023-07-19',
    vote_average: 8.1,
    poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop_path: '/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    genres: ['Drama', 'Historia'],
    runtime: 181,
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.'],
    trailer_url: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    media_type: 'movie',
  },
  {
    id: 550,
    title: 'Fight Club (El Club de la Pelea)',
    overview: 'Un empleado de oficina hastiado de su vida conoce a Tyler Durden y juntos forman un club clandestino.',
    release_date: '1999-10-15',
    vote_average: 8.4,
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
    genres: ['Drama', 'Crimen'],
    runtime: 139,
    director: 'David Fincher',
    cast: ['Brad Pitt', 'Edward Norton', 'Helena Bonham Carter'],
    trailer_url: 'https://www.youtube.com/watch?v=qtRKdVHc-c8',
    media_type: 'movie',
  }
];

const FALLBACK_SERIES = [
  {
    id: 1396,
    name: 'Breaking Bad',
    title: 'Breaking Bad',
    overview: 'Un profesor de química de secundaria con cáncer terminal se asocia con un exalumno para fabricar y vender metanfetamina para asegurar el futuro de su familia.',
    first_air_date: '2008-01-20',
    vote_average: 8.9,
    poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    genres: ['Drama', 'Crimen', 'Suspenso'],
    number_of_seasons: 5,
    director: 'Vince Gilligan',
    cast: ['Bryan Cranston', 'Aaron Paul', 'Anna Gunn', 'Dean Norris', 'Bob Odenkirk'],
    trailer_url: 'https://www.youtube.com/watch?v=HhesaQXLuRY',
    media_type: 'tv',
  },
  {
    id: 66732,
    name: 'Stranger Things',
    title: 'Stranger Things',
    overview: 'Cuando un niño desaparece, sus amigos, su familia y la policía local se ven envueltos en un misterio extraordinario con experimentos gubernamentales secretos y fuerzas sobrenaturales.',
    first_air_date: '2016-07-15',
    vote_average: 8.6,
    poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    genres: ['Ciencia Ficción', 'Drama', 'Misterio'],
    number_of_seasons: 4,
    director: 'The Duffer Brothers',
    cast: ['Millie Bobby Brown', 'Finn Wolfhard', 'Winona Ryder', 'David Harbour'],
    trailer_url: 'https://www.youtube.com/watch?v=b9EkMc79ZSU',
    media_type: 'tv',
  },
  {
    id: 1399,
    name: 'Game of Thrones (Juego de Tronos)',
    title: 'Game of Thrones (Juego de Tronos)',
    overview: 'Siete familias nobles luchan por el control de la mítica tierra de Poniente, mientras una antigua fuerza oscura despierta tras milenios.',
    first_air_date: '2011-04-17',
    vote_average: 8.4,
    poster_path: '/7WUhUSqwvxvj7zF36XzR1f7oZpE.jpg',
    backdrop_path: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
    genres: ['Fantasía', 'Drama', 'Acción', 'Aventura'],
    number_of_seasons: 8,
    director: 'David Benioff, D.B. Weiss',
    cast: ['Emilia Clarke', 'Kit Harington', 'Peter Dinklage', 'Lena Headey'],
    trailer_url: 'https://www.youtube.com/watch?v=KPLWWIOCOOQ',
    media_type: 'tv',
  },
  {
    id: 100088,
    name: 'The Last of Us',
    title: 'The Last of Us',
    overview: 'Veinte años después de que una pandemia de hongos destruyera la civilización, Joel es contratado para sacar a Ellie, una niña de 14 años, de una zona de cuarentena.',
    first_air_date: '2023-01-15',
    vote_average: 8.6,
    poster_path: '/uKvVjHNqB5VmOrdxqAt2V7JMrne.jpg',
    backdrop_path: '/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
    genres: ['Drama', 'Acción', 'Aventura', 'Ciencia Ficción'],
    number_of_seasons: 1,
    director: 'Craig Mazin, Neil Druckmann',
    cast: ['Pedro Pascal', 'Bella Ramsey', 'Gabriel Luna', 'Anna Torv'],
    trailer_url: 'https://www.youtube.com/watch?v=uLtkt8BonwM',
    media_type: 'tv',
  },
  {
    id: 106379,
    name: 'Fallout',
    title: 'Fallout',
    overview: 'En un futuro Los Ángeles posapocalíptico y retrofuturista, los ciudadanos deben vivir en búnkeres subterráneos para protegerse de la radiación, mutantes y bandidos.',
    first_air_date: '2024-04-10',
    vote_average: 8.3,
    poster_path: '/AnsSKR9LuK0T9bAILezCxHN3IIv.jpg',
    backdrop_path: '/ilr3GA5mIqkMxeaPFe846rZklW.jpg',
    genres: ['Ciencia Ficción', 'Acción', 'Aventura'],
    number_of_seasons: 1,
    director: 'Jonathan Nolan',
    cast: ['Ella Purnell', 'Walton Goggins', 'Aaron Moten', 'Kyle MacLachlan'],
    trailer_url: 'https://www.youtube.com/watch?v=V-mugKDQDlg',
    media_type: 'tv',
  },
  {
    id: 76479,
    name: 'The Boys',
    title: 'The Boys',
    overview: 'En un mundo donde los superhéroes abrazan el lado oscuro de su fama masiva, un grupo de vigilantes conocidos como The Boys se propone acabar con los corruptos.',
    first_air_date: '2019-07-26',
    vote_average: 8.5,
    poster_path: '/2zm7HAdnFd8y2Ztnv6xQd2fH9M4.jpg',
    backdrop_path: '/nGsGuT46aWkcm7w9A6p0yR4E9sO.jpg',
    genres: ['Acción', 'Comedia', 'Ciencia Ficción'],
    number_of_seasons: 4,
    director: 'Eric Kripke',
    cast: ['Karl Urban', 'Jack Quaid', 'Antony Starr', 'Erin Moriarty'],
    trailer_url: 'https://www.youtube.com/watch?v=06rueu_fh30',
    media_type: 'tv',
  },
  {
    id: 93405,
    name: 'Squid Game (El Juego del Calamar)',
    title: 'Squid Game (El Juego del Calamar)',
    overview: 'Cientos de personas con problemas de dinero aceptan una extraña invitación para competir en juegos infantiles. Dentro les espera un premio tentador pero con consecuencias mortales.',
    first_air_date: '2021-09-17',
    vote_average: 7.8,
    poster_path: '/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
    backdrop_path: '/oaGvjB0DvdurWhf967FAGbrPhqV.jpg',
    genres: ['Drama', 'Misterio', 'Acción'],
    number_of_seasons: 2,
    director: 'Hwang Dong-hyuk',
    cast: ['Lee Jung-jae', 'Park Hae-soo', 'Wi Ha-joon', 'Jung Ho-yeon'],
    trailer_url: 'https://www.youtube.com/watch?v=oqxAJKy0ii4',
    media_type: 'tv',
  },
  {
    id: 70523,
    name: 'Dark',
    title: 'Dark',
    overview: 'La desaparición de dos niños en un pueblo alemán saca a la luz las dobles vidas y relaciones fracturadas entre cuatro familias, desentrañando un misterio a través de cuatro generaciones.',
    first_air_date: '2017-12-01',
    vote_average: 8.4,
    poster_path: '/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg',
    backdrop_path: '/2meX1nMdScFOoV4370rqHWFDxZ9.jpg',
    genres: ['Ciencia Ficción', 'Misterio', 'Drama'],
    number_of_seasons: 3,
    director: 'Baran bo Odar',
    cast: ['Louis Hofmann', 'Oliver Masucci', 'Jördis Triebel', 'Maja Schöne'],
    trailer_url: 'https://www.youtube.com/watch?v=rrwycJ08PSA',
    media_type: 'tv',
  }
];

function getApiKey() {
  return process.env.TMDB_API_KEY || null;
}

function formatItem(m, type = 'movie') {
  const isTv = type === 'tv' || m.first_air_date !== undefined || m.number_of_seasons !== undefined;
  const rawDate = isTv ? (m.first_air_date || m.release_date) : (m.release_date || m.first_air_date);
  const title = m.title || m.name || m.original_title || m.original_name;

  return {
    id: m.id,
    tmdbId: m.id,
    title,
    mediaType: isTv ? 'tv' : 'movie',
    overview: m.overview || '',
    releaseDate: rawDate || null,
    year: rawDate ? parseInt(rawDate.split('-')[0], 10) : (m.year || null),
    rating: m.vote_average ? Number(m.vote_average.toFixed(1)) : 0,
    voteCount: m.vote_count || 0,
    popularity: m.popularity || 0,
    posterUrl: m.poster_path ? (m.poster_path.startsWith('http') ? m.poster_path : `${TMDB_IMAGE_BASE}/w500${m.poster_path}`) : null,
    backdropUrl: m.backdrop_path ? (m.backdrop_path.startsWith('http') ? m.backdrop_path : `${TMDB_IMAGE_BASE}/original${m.backdrop_path}`) : null,
    genres: m.genres ? (typeof m.genres[0] === 'string' ? m.genres : m.genres.map((g) => g.name)) : [],
    duration: m.runtime ? m.runtime * 60 : (m.duration || 5400),
    seasons: m.number_of_seasons || (isTv ? 1 : null),
    director: m.director || null,
    cast: m.cast || [],
    trailerUrl: m.trailer_url || null,
    streamUrl: DEFAULT_WORKING_STREAM,
  };
}

async function tmdbFetch(endpoint, params = {}) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', 'es-ES');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      logger.warn(`TMDB API response not ok: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    logger.warn('TMDB fetch error:', error.message);
    return null;
  }
}

const TMDB_GENRE_MAP_MOVIE = {
  accion: 28,
  aventura: 12,
  animacion: 16,
  comedia: 35,
  crimen: 80,
  documental: 99,
  drama: 18,
  fantasia: 14,
  terror: 27,
  misterio: 9648,
  romance: 10749,
  'ciencia-ficcion': 878,
  thriller: 53,
  western: 37,
  familia: 10751,
};

const TMDB_GENRE_MAP_TV = {
  accion: 10759,
  aventura: 10759,
  animacion: 16,
  comedia: 35,
  crimen: 80,
  documental: 99,
  drama: 18,
  fantasia: 10765,
  misterio: 9648,
  'ciencia-ficcion': 10765,
  western: 37,
  familia: 10751,
};

const GENRE_SLUG_TO_NAME = {
  accion: 'Acción',
  aventura: 'Aventura',
  animacion: 'Animación',
  comedia: 'Comedia',
  crimen: 'Crimen',
  documental: 'Documental',
  drama: 'Drama',
  fantasia: 'Fantasía',
  terror: 'Terror',
  misterio: 'Misterio',
  romance: 'Romance',
  'ciencia-ficcion': 'Ciencia Ficción',
  thriller: 'Thriller',
  western: 'Western',
  familia: 'Familia',
};

function filterFallbackItems(items, { genre, year, rating, sort } = {}, type = 'movie') {
  let list = [...items];

  if (genre) {
    const gName = (GENRE_SLUG_TO_NAME[genre] || genre).toLowerCase();
    list = list.filter((m) =>
      m.genres?.some((g) => {
        const str = typeof g === 'string' ? g.toLowerCase() : (g.name || '').toLowerCase();
        return str.includes(gName) || str.includes(genre.toLowerCase());
      })
    );
  }

  if (year === 'classic') {
    list = list.filter((m) => {
      const date = m.release_date || m.first_air_date || '';
      const y = parseInt(date.split('-')[0], 10);
      return y && y <= 2010;
    });
  } else if (year && !isNaN(parseInt(year, 10))) {
    const targetY = String(year);
    list = list.filter((m) => {
      const date = m.release_date || m.first_air_date || '';
      return date.startsWith(targetY);
    });
  }

  if (rating) {
    const minR = parseFloat(rating);
    list = list.filter((m) => (m.vote_average || 0) >= minR);
  }

  if (sort === 'rating') {
    list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  } else if (sort === 'newest') {
    list.sort((a, b) => {
      const da = a.release_date || a.first_air_date || '';
      const db = b.release_date || b.first_air_date || '';
      return db.localeCompare(da);
    });
  } else if (sort === 'title') {
    list.sort((a, b) => {
      const ta = a.title || a.name || '';
      const tb = b.title || b.name || '';
      return ta.localeCompare(tb);
    });
  }

  return list;
}

export async function getPopularMovies(page = 1, filters = {}) {
  const { genre, year, rating, sort } = filters;
  const hasFilters = genre || year || rating || (sort && sort !== 'popular');

  if (hasFilters) {
    const tmdbParams = { page };
    if (genre && TMDB_GENRE_MAP_MOVIE[genre]) {
      tmdbParams.with_genres = TMDB_GENRE_MAP_MOVIE[genre];
    }
    if (year === 'classic') {
      tmdbParams['primary_release_date.lte'] = '2010-12-31';
    } else if (year && !isNaN(parseInt(year, 10))) {
      tmdbParams.primary_release_year = year;
    }
    if (rating) {
      tmdbParams['vote_average.gte'] = rating;
      tmdbParams['vote_count.gte'] = 50;
    }
    if (sort === 'rating') {
      tmdbParams.sort_by = 'vote_average.desc';
      if (!tmdbParams['vote_count.gte']) tmdbParams['vote_count.gte'] = 80;
    } else if (sort === 'newest') {
      tmdbParams.sort_by = 'primary_release_date.desc';
    } else if (sort === 'title') {
      tmdbParams.sort_by = 'original_title.asc';
    } else {
      tmdbParams.sort_by = 'popularity.desc';
    }

    const data = await tmdbFetch('/discover/movie', tmdbParams);
    if (data && data.results) {
      const valid = data.results.filter((m) => m.poster_path || m.backdrop_path);
      return {
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        source: 'tmdb',
        movies: valid.map((m) => formatItem(m, 'movie')),
      };
    }

    const fallbackFiltered = filterFallbackItems(FALLBACK_MOVIES, filters, 'movie');
    return {
      page: 1,
      totalPages: 1,
      totalResults: fallbackFiltered.length,
      source: 'local_catalog',
      movies: fallbackFiltered.map((m) => formatItem(m, 'movie')),
    };
  }

  const data = await tmdbFetch('/movie/popular', { page });
  if (data && data.results) {
    const valid = data.results.filter((m) => m.poster_path || m.backdrop_path);
    return {
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      source: 'tmdb',
      movies: valid.map((m) => formatItem(m, 'movie')),
    };
  }

  return {
    page: 1,
    totalPages: 1,
    totalResults: FALLBACK_MOVIES.length,
    source: 'local_catalog',
    movies: FALLBACK_MOVIES.map((m) => formatItem(m, 'movie')),
  };
}

export async function getTrendingMovies(timeWindow = 'week', filters = {}) {
  const { genre, year, rating, sort } = filters;
  const hasFilters = genre || year || rating || (sort && sort !== 'popular');

  if (hasFilters) {
    return getPopularMovies(1, filters);
  }

  const data = await tmdbFetch(`/trending/movie/${timeWindow}`);
  if (data && data.results) {
    const valid = data.results.filter((m) => m.poster_path || m.backdrop_path);
    return {
      source: 'tmdb',
      totalPages: data.total_pages || 1,
      totalResults: data.total_results || valid.length,
      movies: valid.map((m) => formatItem(m, 'movie')),
    };
  }

  return {
    source: 'local_catalog',
    totalPages: 1,
    totalResults: FALLBACK_MOVIES.slice(0, 8).length,
    movies: FALLBACK_MOVIES.slice(0, 8).map((m) => formatItem(m, 'movie')),
  };
}

export async function getTopRatedMovies(page = 1, filters = {}) {
  const effectiveFilters = { ...filters, rating: filters.rating || '8.0', sort: filters.sort || 'rating' };
  return getPopularMovies(page, effectiveFilters);
}

export async function getPopularSeries(page = 1, filters = {}) {
  const { genre, year, rating, sort } = filters;
  const hasFilters = genre || year || rating || (sort && sort !== 'popular');

  if (hasFilters) {
    const tmdbParams = { page };
    if (genre && TMDB_GENRE_MAP_TV[genre]) {
      tmdbParams.with_genres = TMDB_GENRE_MAP_TV[genre];
    }
    if (year === 'classic') {
      tmdbParams['first_air_date.lte'] = '2010-12-31';
    } else if (year && !isNaN(parseInt(year, 10))) {
      tmdbParams.first_air_date_year = year;
    }
    if (rating) {
      tmdbParams['vote_average.gte'] = rating;
      tmdbParams['vote_count.gte'] = 20;
    }
    if (sort === 'rating') {
      tmdbParams.sort_by = 'vote_average.desc';
      if (!tmdbParams['vote_count.gte']) tmdbParams['vote_count.gte'] = 50;
    } else if (sort === 'newest') {
      tmdbParams.sort_by = 'first_air_date.desc';
    } else if (sort === 'title') {
      tmdbParams.sort_by = 'original_name.asc';
    } else {
      tmdbParams.sort_by = 'popularity.desc';
    }

    const data = await tmdbFetch('/discover/tv', tmdbParams);
    if (data && data.results) {
      const valid = data.results.filter((s) => s.poster_path || s.backdrop_path);
      return {
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        source: 'tmdb',
        series: valid.map((s) => formatItem(s, 'tv')),
      };
    }

    const fallbackFiltered = filterFallbackItems(FALLBACK_SERIES, filters, 'tv');
    return {
      page: 1,
      totalPages: 1,
      totalResults: fallbackFiltered.length,
      source: 'local_catalog',
      series: fallbackFiltered.map((s) => formatItem(s, 'tv')),
    };
  }

  const data = await tmdbFetch('/tv/popular', { page });
  if (data && data.results) {
    const valid = data.results.filter((s) => s.poster_path || s.backdrop_path);
    return {
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      source: 'tmdb',
      series: valid.map((s) => formatItem(s, 'tv')),
    };
  }

  return {
    page: 1,
    totalPages: 1,
    totalResults: FALLBACK_SERIES.length,
    source: 'local_catalog',
    series: FALLBACK_SERIES.map((s) => formatItem(s, 'tv')),
  };
}

export async function getTrendingSeries(timeWindow = 'week', filters = {}) {
  const { genre, year, rating, sort } = filters;
  const hasFilters = genre || year || rating || (sort && sort !== 'popular');

  if (hasFilters) {
    return getPopularSeries(1, filters);
  }

  const data = await tmdbFetch(`/trending/tv/${timeWindow}`);
  if (data && data.results) {
    const valid = data.results.filter((s) => s.poster_path || s.backdrop_path);
    return {
      source: 'tmdb',
      totalPages: data.total_pages || 1,
      totalResults: data.total_results || valid.length,
      series: valid.map((s) => formatItem(s, 'tv')),
    };
  }

  return {
    source: 'local_catalog',
    totalPages: 1,
    totalResults: FALLBACK_SERIES.slice(0, 8).length,
    series: FALLBACK_SERIES.slice(0, 8).map((s) => formatItem(s, 'tv')),
  };
}

export async function getTopRatedSeries(page = 1, filters = {}) {
  const effectiveFilters = { ...filters, rating: filters.rating || '8.0', sort: filters.sort || 'rating' };
  return getPopularSeries(page, effectiveFilters);
}

export async function getTrendingAll(timeWindow = 'week') {
  const data = await tmdbFetch(`/trending/all/${timeWindow}`);
  if (data && data.results) {
    const valid = data.results.filter((item) => item.poster_path || item.backdrop_path);
    return {
      source: 'tmdb',
      items: valid.map((item) => formatItem(item, item.media_type || 'movie')),
    };
  }

  const combined = [
    ...FALLBACK_MOVIES.slice(0, 4).map((m) => formatItem(m, 'movie')),
    ...FALLBACK_SERIES.slice(0, 4).map((s) => formatItem(s, 'tv')),
  ];
  return {
    source: 'local_catalog',
    items: combined,
  };
}

export async function searchAll(query, page = 1) {
  if (!query) return { items: [] };

  const data = await tmdbFetch('/search/multi', { query, page });
  if (data && data.results) {
    const valid = data.results.filter(
      (x) => (x.media_type === 'movie' || x.media_type === 'tv') && (x.poster_path || x.backdrop_path)
    );
    return {
      page: data.page,
      totalPages: data.total_pages,
      totalResults: valid.length,
      source: 'tmdb',
      items: valid.map((x) => formatItem(x, x.media_type)),
    };
  }

  const q = query.toLowerCase();
  const movies = FALLBACK_MOVIES.filter(
    (m) => m.title.toLowerCase().includes(q) || m.overview.toLowerCase().includes(q)
  ).map((m) => formatItem(m, 'movie'));

  const series = FALLBACK_SERIES.filter(
    (s) => s.title.toLowerCase().includes(q) || s.overview.toLowerCase().includes(q)
  ).map((s) => formatItem(s, 'tv'));

  const combined = [...movies, ...series];
  return {
    page: 1,
    totalPages: 1,
    totalResults: combined.length,
    source: 'local_catalog',
    items: combined,
  };
}

export async function searchExternalMovies(query, page = 1) {
  if (!query) return { movies: [] };

  const data = await tmdbFetch('/search/movie', { query, page });
  if (data && data.results) {
    return {
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      source: 'tmdb',
      movies: data.results.map((m) => formatItem(m, 'movie')),
    };
  }

  const q = query.toLowerCase();
  const filtered = FALLBACK_MOVIES.filter(
    (m) => m.title.toLowerCase().includes(q) || m.overview.toLowerCase().includes(q)
  );

  return {
    page: 1,
    totalPages: 1,
    totalResults: filtered.length,
    source: 'local_catalog',
    movies: filtered.map((m) => formatItem(m, 'movie')),
  };
}

export async function searchExternalSeries(query, page = 1) {
  if (!query) return { series: [] };

  const data = await tmdbFetch('/search/tv', { query, page });
  if (data && data.results) {
    return {
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      source: 'tmdb',
      series: data.results.map((s) => formatItem(s, 'tv')),
    };
  }

  const q = query.toLowerCase();
  const filtered = FALLBACK_SERIES.filter(
    (s) => s.title.toLowerCase().includes(q) || s.overview.toLowerCase().includes(q)
  );

  return {
    page: 1,
    totalPages: 1,
    totalResults: filtered.length,
    source: 'local_catalog',
    series: filtered.map((s) => formatItem(s, 'tv')),
  };
}

export async function getExternalDetails(tmdbId, mediaType = 'movie') {
  const endpoint = mediaType === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
  const data = await tmdbFetch(endpoint, {
    append_to_response: 'credits,videos,recommendations',
  });

  if (data) {
    let director = null;
    let cast = [];
    if (data.credits) {
      const dirObj = data.credits.crew?.find((c) => c.job === 'Director' || c.job === 'Executive Producer');
      if (dirObj) director = dirObj.name;
      cast = (data.credits.cast || []).slice(0, 10).map((c) => c.name);
    }

    let trailerUrl = null;
    if (data.videos && data.videos.results) {
      const trailer = data.videos.results.find(
        (v) => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube'
      );
      if (trailer) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    }

    return formatItem({
      ...data,
      director,
      cast,
      trailer_url: trailerUrl,
    }, mediaType);
  }

  const localList = mediaType === 'tv' ? FALLBACK_SERIES : FALLBACK_MOVIES;
  const local = localList.find((x) => x.id === parseInt(tmdbId, 10));
  if (local) {
    return formatItem(local, mediaType);
  }

  return null;
}

const FALLBACK_EPISODES = {
  // The Last of Us (TMDB 100088)
  100088: {
    1: [
      { episodeNumber: 1, name: 'Cuando te pierdes en la oscuridad', overview: 'Veinte años después de que un brote de hongos diezmara el planeta, los supervivientes Joel y Tess reciben una misión que podría cambiar sus vidas.', runtime: 81 },
      { episodeNumber: 2, name: 'Infectados', overview: 'Tras escapar de la zona de cuarentena, Joel y Tess discuten sobre el destino de Ellie mientras navegan por las ruinas de un Boston desolado.', runtime: 53 },
      { episodeNumber: 3, name: 'Mucho, mucho tiempo', overview: 'Cuando un desconocido llega al recinto fortificado del superviviente solitario Bill, ambos establecen una conexión improbable y conmovedora.', runtime: 75 },
      { episodeNumber: 4, name: 'Por favor, sostén mi mano', overview: 'Tras abandonar su camioneta en Kansas City, Joel y Ellie deben escapar sin llamar la atención de un grupo rebelde despiadado.', runtime: 45 },
      { episodeNumber: 5, name: 'Resistir y sobrevivir', overview: 'Mientras intentan evadir a los rebeldes que buscan venganza, Joel y Ellie se cruzan con el hombre más buscado de la ciudad.', runtime: 59 },
      { episodeNumber: 6, name: 'Familia', overview: 'Tras meses de duro viaje, Joel y Ellie reciben una severa advertencia sobre lo que les espera en el gélido territorio salvaje de Wyoming.', runtime: 59 },
      { episodeNumber: 7, name: 'Lo que dejamos atrás', overview: 'Mientras Ellie lucha por mantener con vida a Joel herido, recuerda su época en la academia militar de FEDRA junto a Riley.', runtime: 56 },
      { episodeNumber: 8, name: 'En nuestras horas más bajas', overview: 'Ellie se encuentra con un grupo de supervivientes desesperados cuyo carismático líder, David, guarda un oscuro secreto.', runtime: 51 },
      { episodeNumber: 9, name: 'Busca la luz', overview: 'Una joven madre embarazada deposita su confianza en su mejor amiga. En el presente, Joel y Ellie llegan al hospital de los Luciérnagas.', runtime: 43 },
    ]
  },
  // Fallout (TMDB 106379)
  106379: {
    1: [
      { episodeNumber: 1, name: 'El Fin', overview: 'Lucy abandona la seguridad del Refugio 33 tras una sangrienta incursión, adentrándose por primera vez en el peligroso Yermo.', runtime: 74 },
      { episodeNumber: 2, name: 'El Objetivo', overview: 'Lucy llega a Filly en busca de pistas sobre su padre, encontrándose con Maximus de la Hermandad del Acero y con el temible Ghoul.', runtime: 65 },
      { episodeNumber: 3, name: 'La Cabeza', overview: 'Lucy y el Ghoul cruzan el inhóspito desierto radiactivo transportando un preciado botín codiciado por todas las facciones.', runtime: 56 },
      { episodeNumber: 4, name: 'Los Necrófagos', overview: 'Lucy descubre la dura realidad de la supervivencia en el Yermo y la verdad detrás de la transformación de los necrofagos.', runtime: 48 },
      { episodeNumber: 5, name: 'El Pasado', overview: 'Maximus y Lucy exploran las ruinas de la civilización antes de la Gran Guerra, forjando una alianza inesperada.', runtime: 45 },
      { episodeNumber: 6, name: 'La Trampa', overview: 'Ambos descubren un búnker de alta tecnología con secretos perturbadores sobre la historia de Vault-Tec.', runtime: 60 },
      { episodeNumber: 7, name: 'La Radio', overview: 'Las señales de radio guían a Lucy y Maximus hacia el Observatorio Griffith, donde se librará el destino de California.', runtime: 61 },
      { episodeNumber: 8, name: 'El Comienzo', overview: 'La confrontación final revela la conspiración que causó el apocalipsis nuclear 200 años atrás.', runtime: 71 },
    ]
  },
  // Stranger Things (TMDB 66732)
  66732: {
    1: [
      { episodeNumber: 1, name: 'Capítulo 1: La desaparición de Will Byers', overview: 'De camino a casa, Will es testigo de algo aterrador. Cerca de allí, un misterio siniestro acecha en las profundidades de un laboratorio gubernamental.', runtime: 48 },
      { episodeNumber: 2, name: 'Capítulo 2: La loca de la calle Maple', overview: 'Lucas, Mike y Dustin intentan hablar con la niña rapada que encontraron en el bosque. El jefe Hopper interroga a Joyce sobre una misteriosa llamada.', runtime: 55 },
      { episodeNumber: 3, name: 'Capítulo 3: Todo está bien', overview: 'Cada vez más preocupada, Joyce cree que Will se comunica a través de las luces. Los chicos descubren los asombrosos poderes de Once.', runtime: 51 },
      { episodeNumber: 4, name: 'Capítulo 4: El cuerpo', overview: 'Rechazando la versión oficial de la policía, Joyce investiga más a fondo mientras los chicos descubren la verdad sobre el laboratorio.', runtime: 49 },
      { episodeNumber: 5, name: 'Capítulo 5: La pulga y el acróbata', overview: 'Dustin, Lucas y Mike consultan a su profesor sobre viajes interdimensionales mientras Hopper logra infiltrarse en el laboratorio secreto.', runtime: 52 },
      { episodeNumber: 6, name: 'Capítulo 6: El monstruo', overview: 'Una llamada frenética empuja a Jonathan a buscar a Nancy. Hopper y Joyce descubren la verdad sobre los experimentos secretos del gobierno.', runtime: 46 },
      { episodeNumber: 7, name: 'Capítulo 7: La bañera', overview: 'Once construye un tanque de privación sensorial improvisado en el gimnasio escolar para intentar contactar a Will en el Otro Lado.', runtime: 41 },
      { episodeNumber: 8, name: 'Capítulo 8: El otro lado', overview: 'Hopper y Joyce entran al Mundo del Revés armados con trajes de protección, mientras los chicos defienden la escuela del Demogorgon.', runtime: 54 },
    ]
  },
  // Breaking Bad (TMDB 1396)
  1396: {
    1: [
      { episodeNumber: 1, name: 'Piloto', overview: 'Walter White, un profesor de química con cáncer de pulmón incurable, decide empezar a fabricar metanfetamina junto a su exalumno Jesse Pinkman.', runtime: 58 },
      { episodeNumber: 2, name: 'El gato está en la bolsa...', overview: 'Walt y Jesse deben deshacerse de los cuerpos de dos traficantes en una casa de los suburbios, con consecuencias desastrosas.', runtime: 48 },
      { episodeNumber: 3, name: '...Y la bolsa está en el río', overview: 'Walt debate moralmente sobre qué hacer con el único sobreviviente retenido en el sótano de Jesse.', runtime: 48 },
      { episodeNumber: 4, name: 'Cáncer de pulmón', overview: 'Walt le confiesa la verdad de su diagnóstico a su familia durante una barbacoa dominical.', runtime: 48 },
      { episodeNumber: 5, name: 'Materia gris', overview: 'Walt asiste a la fiesta de un exsocio millonario y rechaza con orgullo una oferta de caridad para su tratamiento.', runtime: 48 },
      { episodeNumber: 6, name: 'Un loco puñado de nada', overview: 'Walt adopta el alias "Heisenberg", se rapa la cabeza y enfrenta personalmente al psicópata Tuco Salamanca.', runtime: 48 },
      { episodeNumber: 7, name: 'Un trato de no intervención', overview: 'Walt y Jesse amplían su negocio con Tuco utilizando metilamina robada de un almacén químico.', runtime: 47 },
    ]
  },
  // Game of Thrones (TMDB 1399)
  1399: {
    1: [
      { episodeNumber: 1, name: 'Se acerca el invierno', overview: 'Lord Eddard Stark es visitado por el rey Robert Baratheon en Invernalia con una propuesta para convertirse en la nueva Mano del Rey.', runtime: 62 },
      { episodeNumber: 2, name: 'El Camino Real', overview: 'Ned viaja al sur con sus hijas hacia Desembarco del Rey mientras Jon Nieve parte al Muro para unirse a la Guardia de la Noche.', runtime: 56 },
      { episodeNumber: 3, name: 'Lord Nieve', overview: 'Jon Nieve entrena a los nuevos reclutas en el Muro mientras Ned descubre los secretos oscuros de la corte real.', runtime: 58 },
      { episodeNumber: 4, name: 'Tullidos, bastardos y cosas rotas', overview: 'Ned investiga la misteriosa muerte de su predecesor Jon Arryn en las peligrosas calles de la capital.', runtime: 56 },
      { episodeNumber: 5, name: 'El lobo y el león', overview: 'Las tensiones entre la Casa Stark y la Casa Lannister estallan violentamente en un duelo en la plaza real.', runtime: 55 },
      { episodeNumber: 6, name: 'Una corona de oro', overview: 'Ned asume temporalmente el Trono de Hierro y emite una sentencia trascendental mientras Daenerys presencia la coronación de su hermano.', runtime: 53 },
      { episodeNumber: 7, name: 'Ganas o mueres', overview: 'Ned confronta a la reina Cersei Lannister con la verdad sobre el linaje de sus hijos.', runtime: 58 },
      { episodeNumber: 8, name: 'Por el lado de la punta', overview: 'Tras el arresto de Ned Stark, Arya escapa por la ciudad y Robb Stark convoca a los señores del Norte para la guerra.', runtime: 59 },
      { episodeNumber: 9, name: 'Baelor', overview: 'Robb Stark gana su primera gran batalla contra los Lannister mientras Ned toma una decisión desgarradora frente al Gran Septo.', runtime: 57 },
      { episodeNumber: 10, name: 'Fuego y sangre', overview: 'La trágica noticia llega a Invernalia y Daenerys Targaryen entra a la pira funeraria con tres huevos de dragón de piedra.', runtime: 53 },
    ]
  },
  // The Boys (TMDB 76479)
  76479: {
    1: [
      { episodeNumber: 1, name: 'El nombre del juego', overview: 'Cuando la novia de Hughie Campbell es asesinada por el superhéroe A-Train, el misterioso Billy Butcher le ofrece una oportunidad de venganza.', runtime: 60 },
      { episodeNumber: 2, name: 'Cereza', overview: 'The Boys consiguen su primer superhéroe como rehén mientras Butcher contacta a un viejo colega de la CIA.', runtime: 55 },
      { episodeNumber: 3, name: 'Consigue algo', overview: 'Hughie asiste a una carrera de alta velocidad para espiar a A-Train mientras Butcher investiga el misterioso Compuesto V.', runtime: 55 },
      { episodeNumber: 4, name: 'La hembra de la especie', overview: 'The Boys encuentran a una mujer con superpoderes retenida en una celda y descubren una conspiración a nivel militar.', runtime: 55 },
      { episodeNumber: 5, name: 'Bueno para el alma', overview: 'Butcher y su equipo se infiltran en una masiva convención cristiana de superhéroes en busca de respuestas.', runtime: 56 },
      { episodeNumber: 6, name: 'Los inocentes', overview: 'Homelander descubre que Butcher está investigando la desaparición de su esposa Becca.', runtime: 59 },
      { episodeNumber: 7, name: 'La sociedad de la autopreservación', overview: 'Vought intenta encubrir la existencia del Compuesto V mientras The Boys son cazados por todos los superhéroes.', runtime: 55 },
      { episodeNumber: 8, name: 'Me encontraste', overview: 'Butcher confronta a Homelander cara a cara con explosivos atados a su pecho en una tensa reunión final.', runtime: 66 },
    ]
  }
};

export async function getSeriesSeasonEpisodes(tmdbId, seasonNumber = 1) {
  const sNum = parseInt(seasonNumber, 10) || 1;
  const tId = parseInt(tmdbId, 10);

  try {
    const data = await tmdbFetch(`/tv/${tmdbId}/season/${sNum}`);
    if (data && data.episodes && data.episodes.length > 0) {
      return {
        seriesId: tmdbId,
        seasonNumber: sNum,
        seasonName: data.name || `Temporada ${sNum}`,
        overview: data.overview || '',
        episodes: data.episodes.map((ep) => ({
          episodeNumber: ep.episode_number,
          seasonNumber: ep.season_number,
          name: ep.name || `Episodio ${ep.episode_number}`,
          overview: ep.overview || '',
          runtime: ep.runtime || 50,
          airDate: ep.air_date,
          voteAverage: ep.vote_average,
          stillUrl: ep.still_path ? `${TMDB_IMAGE_BASE}/w500${ep.still_path}` : null,
        })),
      };
    }
  } catch (err) {
    logger.warn(`Error al consultar TMDB season ${sNum} para ${tmdbId}: ${err.message}`);
  }

  const seriesEpisodes = FALLBACK_EPISODES[tId]?.[sNum];
  if (seriesEpisodes) {
    return {
      seriesId: tmdbId,
      seasonNumber: sNum,
      seasonName: `Temporada ${sNum}`,
      overview: '',
      episodes: seriesEpisodes.map((ep) => ({
        episodeNumber: ep.episodeNumber,
        seasonNumber: sNum,
        name: ep.name,
        overview: ep.overview,
        runtime: ep.runtime,
        airDate: null,
        voteAverage: 8.5,
        stillUrl: null,
      })),
    };
  }

  const count = sNum === 1 ? 9 : 8;
  const generatedEpisodes = [];
  for (let i = 1; i <= count; i++) {
    generatedEpisodes.push({
      episodeNumber: i,
      seasonNumber: sNum,
      name: `Capítulo ${i}`,
      overview: `Episodio ${i} de la Temporada ${sNum}. Disponible para reproducción en servidores de alta definición.`,
      runtime: 48 + ((i * 3) % 15),
      airDate: null,
      voteAverage: 8.0,
      stillUrl: null,
    });
  }

  return {
    seriesId: tmdbId,
    seasonNumber: sNum,
    seasonName: `Temporada ${sNum}`,
    overview: '',
    episodes: generatedEpisodes,
  };
}

export async function importToDatabase(tmdbId, mediaType = 'movie') {
  const details = await getExternalDetails(tmdbId, mediaType);
  if (!details) {
    throw new Error('Contenido no encontrado en el catálogo');
  }

  const baseSlug = slugify(details.title, { lower: true, strict: true }) || `media-${details.tmdbId}`;
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.movie.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const genreIds = [];
  if (details.genres && details.genres.length > 0) {
    for (const genreName of details.genres) {
      const genreSlug = slugify(genreName, { lower: true, strict: true }) || 'general';
      const genre = await prisma.genre.upsert({
        where: { slug: genreSlug },
        update: {},
        create: { name: genreName, slug: genreSlug },
      });
      genreIds.push(genre.id);
    }
  }

  if (mediaType === 'tv') {
    const serieGenre = await prisma.genre.upsert({
      where: { slug: 'series' },
      update: {},
      create: { name: 'Series', slug: 'series' },
    });
    if (!genreIds.includes(serieGenre.id)) {
      genreIds.push(serieGenre.id);
    }
  }

  const record = await prisma.movie.create({
    data: {
      title: details.title,
      slug,
      description: details.overview,
      year: details.year,
      duration: details.duration || 5400,
      rating: details.rating || 7.5,
      director: details.director || 'Desconocido',
      cast: details.cast || [],
      posterUrl: details.posterUrl,
      backdropUrl: details.backdropUrl,
      trailerUrl: details.trailerUrl,
      streamPath: DEFAULT_WORKING_STREAM,
      status: 'READY',
      featured: details.rating >= 8.0,
      views: Math.floor(Math.random() * 800) + 100,
      language: 'es',
      genres: {
        create: genreIds.map((genreId) => ({
          genre: { connect: { id: genreId } },
        })),
      },
    },
    include: {
      genres: { include: { genre: true } },
    },
  });

  logger.info(`Contenido importado a MySQL: ${record.title} (${mediaType})`);
  return record;
}

export async function seedPopularCatalog(limit = 10) {
  const { movies } = await getPopularMovies(1);
  const toImport = movies.slice(0, limit);
  const imported = [];

  for (const m of toImport) {
    try {
      const exists = await prisma.movie.findFirst({
        where: { title: { contains: m.title.substring(0, 15) } },
      });

      if (!exists) {
        const item = await importToDatabase(m.tmdbId, 'movie');
        imported.push(item);
      }
    } catch (err) {
      logger.warn(`No se pudo importar ${m.title}: ${err.message}`);
    }
  }

  return imported;
}

export async function seedPopularSeries(limit = 8) {
  const { series } = await getPopularSeries(1);
  const toImport = series.slice(0, limit);
  const imported = [];

  for (const s of toImport) {
    try {
      const exists = await prisma.movie.findFirst({
        where: { title: { contains: s.title.substring(0, 15) } },
      });

      if (!exists) {
        const item = await importToDatabase(s.tmdbId, 'tv');
        imported.push(item);
      }
    } catch (err) {
      logger.warn(`No se pudo importar serie ${s.title}: ${err.message}`);
    }
  }

  return imported;
}

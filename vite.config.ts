import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { albumAdmin } from './scripts/album-admin';
import { spotifyDev } from './scripts/spotify-dev';

export default defineConfig(({ command, isPreview, mode }) => {
  const local = command === 'serve' && !isPreview;
  const spotify = local ? loadEnv(mode, process.cwd(), 'SPOTIFY_') : {};

  return {
    plugins: [
      react(),
      tailwindcss(),
      local && albumAdmin(loadEnv(mode, process.cwd(), 'ALBUM_ADMIN_').ALBUM_ADMIN_PIN ?? ''),
      local && spotifyDev(spotify.SPOTIFY_CLIENT_ID, spotify.SPOTIFY_REFRESH_TOKEN),
    ],
    base: '/my-fav-albums/',
  };
});

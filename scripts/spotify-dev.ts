import type { Plugin } from 'vite';
import { createSpotifyStatusResponse } from '../spotify-status/playback';

export function spotifyDev(clientId?: string, refreshToken?: string): Plugin {
  const getStatus = createSpotifyStatusResponse(clientId, refreshToken);
  return {
    name: 'spotify-listening-status',
    apply: 'serve',
    configureServer({ config, middlewares }) {
      middlewares.use(`${config.base}api/now-playing`, async (req, res) => {
        if (req.method !== 'GET') {
          res.writeHead(405, { Allow: 'GET' }).end();
          return;
        }
        const response = await getStatus();
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(await response.text());
      });
    },
  };
}

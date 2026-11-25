import { createSpotifyStatusResponse } from '../playback.js';

const getStatus = createSpotifyStatusResponse(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_REFRESH_TOKEN);

export async function GET() {
  return getStatus();
}

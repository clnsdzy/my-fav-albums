import { adminConfig, isAuthenticated, readJson, reply, replyError, requireSameOrigin } from '../../server/album-admin/http.js';
import { getAlbumDeployment, getAlbumHistory, getCatalog, publishAlbumChange } from '../../server/album-admin/github.js';
import { AdminError } from '../../server/album-admin/upload.js';

function authorized(request: Request) {
  const config = adminConfig();
  if (!config) throw new AdminError(503, 'The online editor is waiting for setup.');
  if (!isAuthenticated(request, config)) throw new AdminError(401, 'Unlock the editor to manage albums.');
  return config;
}

export async function GET(request: Request) {
  try {
    const { githubToken } = authorized(request);
    const query = new URL(request.url).searchParams;
    if (query.has('history')) return reply(200, await getAlbumHistory(githubToken, query.get('history'), Number(query.get('page') ?? 1)));
    if (query.has('deployment')) return reply(200, await getAlbumDeployment(query.get('deployment')));
    return reply(200, await getCatalog(githubToken));
  } catch (error) {
    return replyError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { githubToken } = authorized(request);
    const body = await readJson(request, 4 * 1024 * 1024);
    return reply(201, await publishAlbumChange(githubToken, body, { cover: 2 * 1024 * 1024, thumbnail: 512 * 1024 }));
  } catch (error) {
    return replyError(error);
  }
}

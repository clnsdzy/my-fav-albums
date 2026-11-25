import { adminConfig, isAuthenticated, readJson, reply, replyError, requireSameOrigin } from '../../server/album-admin/http.js';
import { publishAlbum } from '../../server/album-admin/github.js';
import { AdminError, prepareAlbumUpload } from '../../server/album-admin/upload.js';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const config = adminConfig();
    if (!config) throw new AdminError(503, 'The online editor is waiting for setup.');
    if (!isAuthenticated(request, config)) throw new AdminError(401, 'Unlock the editor to save an album.');
    const body = await readJson(request, 4 * 1024 * 1024);
    const upload = prepareAlbumUpload(body, { cover: 2 * 1024 * 1024, thumbnail: 512 * 1024 });
    return reply(201, await publishAlbum(upload, config.githubToken));
  } catch (error) {
    return replyError(error);
  }
}

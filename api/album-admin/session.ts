import { adminConfig, authCookie, checkPin, isAuthenticated, readJson, reply, replyError, requireSameOrigin } from '../../server/album-admin/http.js';
import { AdminError } from '../../server/album-admin/upload.js';

export function GET(request: Request) {
  const config = adminConfig();
  return reply(200, { pinConfigured: Boolean(config), authenticated: Boolean(config && isAuthenticated(request, config)) });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const config = adminConfig();
    if (!config) throw new AdminError(503, 'The online editor is waiting for setup.');
    const body = await readJson(request, 1024);
    if (!checkPin(body.pin, config)) throw new AdminError(401, 'That PIN did not match.');
    return reply(200, { authenticated: true }, authCookie(config));
  } catch (error) {
    return replyError(error);
  }
}

export function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    return reply(200, { authenticated: false }, authCookie());
  } catch (error) {
    return replyError(error);
  }
}

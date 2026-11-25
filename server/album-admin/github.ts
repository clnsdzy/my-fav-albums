import type { Album } from '../../src/types.js';
import type { AlbumVersion, DeploymentStatus } from '../../src/lib/album-management.js';
import { getAlbumCoverPath, getAlbumThumbnailPath } from '../../src/lib/album-assets.js';
import { albumRevision, catalogView, findAlbum, prepareCatalogChange, receipt, replacementName, restoreVersion } from './catalog.js';
import { AdminError, type ArtworkLimits } from './upload.js';

const repository = 'https://api.github.com/repos/clnsdzy/my-fav-albums';
const catalogPath = 'src/album-catalog.json';
const branch = 'heads/main';

class GithubError extends Error {
  constructor(readonly status: number) {
    super(`GitHub API returned HTTP ${status}`);
  }
}

function githubClient(token?: string) {
  return async function github<T>(path: string, method = 'GET', body?: object): Promise<T> {
    const response = await fetch(repository + path, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.warn('GitHub rejected an album publish request.', {
        method,
        resource: path.split('?')[0],
        status: response.status,
      });
      if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
        throw new AdminError(503, 'GitHub is rate-limiting album uploads. Try again later.');
      }
      if (response.status === 401) {
        throw new AdminError(502, 'GitHub rejected the editor token. Update ALBUM_ADMIN_GITHUB_TOKEN in Vercel.');
      }
      if (response.status === 403) {
        throw new AdminError(502, 'GitHub denied the editor access. Check that its token has Contents read and write access to this repository.');
      }
      throw new GithubError(response.status);
    }
    return response.json();
  };
}

type Github = ReturnType<typeof githubClient>;
type TreeBlob = { path: string; mode: '100644'; type: 'blob'; sha: string };

async function head(github: Github) {
  const ref = await github<{ object: { sha: string } }>(`/git/ref/${branch}`);
  return ref.object.sha;
}

async function readCatalog(github: Github, ref: string) {
  const file = await github<{ encoding: string; content: string }>(`/contents/${catalogPath}?ref=${ref}`);
  if (file.encoding !== 'base64') throw new Error('Invalid album catalog encoding');
  const catalog: Album[] = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  if (!Array.isArray(catalog)) throw new Error('Invalid album catalog');
  return catalog;
}

export async function getCatalog(token: string) {
  return catalogView(await readCatalog(githubClient(token), 'main'));
}

function validatedCommit(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    throw new AdminError(400, 'Choose a valid revision.');
  }
  return value;
}

export async function getAlbumHistory(token: string, slug: string | null, page: number) {
  if (!Number.isInteger(page) || page < 1 || page > 1000) throw new AdminError(400, 'Choose a valid history page.');
  const github = githubClient(token);
  const current = findAlbum(await readCatalog(github, 'main'), slug);
  const currentRevision = albumRevision({ ...current, archived: undefined });
  const pageSize = 12;
  const commits = await github<{ sha: string; commit: { committer: { date: string }; message: string } }[]>(
    `/commits?sha=main&path=${catalogPath}&per_page=${pageSize}&page=${page}`,
  );
  const snapshots = await Promise.all(commits.map(async item => {
    const album = (await readCatalog(github, item.sha)).find(entry => entry.slug === current.slug);
    return { item, album };
  }));
  const versions: AlbumVersion[] = [];
  const seen = new Set<string>();
  for (const { item, album } of snapshots) {
    if (!album) continue;
    const revision = albumRevision({ ...album, archived: undefined });
    if (seen.has(revision)) continue;
    seen.add(revision);
    versions.push({
      commit: item.sha, date: item.commit.committer.date, message: item.commit.message.split('\n')[0],
      album, current: revision === currentRevision,
    });
  }
  return { versions, hasMore: commits.length === pageSize };
}

export async function getAlbumDeployment(value: unknown): Promise<DeploymentStatus> {
  const commit = validatedCommit(value);
  const response = await githubClient()<{ statuses: { context: string; state: string; target_url?: string }[] }>(
    `/commits/${commit}/status`,
  );
  const vercel = response.statuses.find(status => status.context === 'Vercel');
  const state = vercel?.state === 'success' ? 'success'
    : vercel?.state === 'failure' || vercel?.state === 'error' ? 'failure' : 'pending';
  const url = vercel?.target_url;
  return { state, url: url?.startsWith('https://vercel.com/') ? url : undefined };
}

async function historyRestore(github: Github, body: Record<string, unknown>) {
  const revision = validatedCommit(body.commit);
  const comparison = await github<{ status: string }>(`/compare/${revision}...main?per_page=1`);
  if (comparison.status !== 'ahead' && comparison.status !== 'identical') {
    throw new AdminError(400, 'This revision is outside the catalog history.');
  }
  const previous = findAlbum(await readCatalog(github, revision), body.slug);
  const originalCover = getAlbumCoverPath(previous.image);
  if (!/^images\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/.test(originalCover)) {
    throw new AdminError(400, 'This revision has an invalid cover.');
  }
  const coverPath = `images/${replacementName(previous.slug)}.${originalCover.split('.').at(-1)}`;
  const originals = [originalCover, getAlbumThumbnailPath(originalCover)];
  const destinations = [coverPath, getAlbumThumbnailPath(coverPath)];
  const files: TreeBlob[] = await Promise.all(originals.map(async (file, index) => {
    const asset = await github<{ sha: string; type: string }>(`/contents/public/${file}?ref=${revision}`);
    if (asset.type !== 'file') throw new AdminError(400, 'This revision has missing artwork.');
    return { path: `public/${destinations[index]}`, mode: '100644', type: 'blob', sha: asset.sha };
  }));
  return { files, change: (catalog: Album[]) => restoreVersion(catalog, body, previous, coverPath) };
}

export async function publishAlbumChange(token: string, body: Record<string, unknown>, limits: ArtworkLimits) {
  const github = githubClient(token);
  const restore = body.action === 'restoreVersion' ? await historyRestore(github, body) : undefined;
  const applyChange = restore?.change ?? prepareCatalogChange(body, limits);

  for (let attempt = 0; attempt < 2; attempt++) {
    const parent = await head(github);
    const [commit, catalog] = await Promise.all([
      github<{ tree: { sha: string } }>(`/git/commits/${parent}`),
      readCatalog(github, parent),
    ]);
    const change = applyChange(catalog);
    const paths = [...(change.images?.map(([path]) => `public/${path}`) ?? []), ...(restore?.files.map(file => file.path) ?? [])];
    if (paths.length) {
      const files = await github<{ truncated: boolean; tree: { path: string }[] }>(
        `/git/trees/${commit.tree.sha}?recursive=1`,
      );
      if (files.truncated) throw new Error('Incomplete repository tree');
      const existingPaths = new Set(files.tree.map(file => file.path));
      if (paths.some(path => existingPaths.has(path))) {
        throw new AdminError(409, 'An artwork file already exists at that path.');
      }
    }

    const images = await Promise.all((change.images ?? []).map(async ([path, contents]) => {
      const blob = await github<{ sha: string }>('/git/blobs', 'POST', {
        content: contents.toString('base64'),
        encoding: 'base64',
      });
      return { path: `public/${path}`, mode: '100644', type: 'blob', sha: blob.sha };
    }));
    const tree = await github<{ sha: string }>('/git/trees', 'POST', {
      base_tree: commit.tree.sha,
      tree: [
        { path: catalogPath, mode: '100644', type: 'blob', content: JSON.stringify(change.updated, null, 2) + '\n' },
        ...images,
        ...(restore?.files ?? []),
      ],
    });
    const saved = await github<{ sha: string }>('/git/commits', 'POST', {
      message: change.message.replace(/\s+/g, ' '),
      tree: tree.sha,
      parents: [parent],
    });

    try {
      await github(`/git/refs/${branch}`, 'PATCH', { sha: saved.sha, force: false });
      return { ...receipt(change, saved.sha), catalog: catalogView(change.updated) };
    } catch (error) {
      const current = await head(github);
      if (current === saved.sha) return { ...receipt(change, saved.sha), catalog: catalogView(change.updated) };
      if (!(error instanceof GithubError && [409, 422].includes(error.status)) || current === parent) throw error;
    }
  }
  throw new AdminError(409, 'The catalog changed during the upload. Try saving again.');
}

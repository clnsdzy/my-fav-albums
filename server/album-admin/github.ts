import type { Album } from '../../src/types.js';
import { AdminError, prepareAlbumUpload, updateCatalog } from './upload.js';

const repository = 'https://api.github.com/repos/clnsdzy/my-fav-albums';
const catalogPath = 'src/album-catalog.json';
const branch = 'heads/main';

class GithubError extends Error {
  constructor(readonly status: number) {
    super(`GitHub API returned HTTP ${status}`);
  }
}

export async function publishAlbum(upload: ReturnType<typeof prepareAlbumUpload>, token: string) {
  async function github<T>(path: string, method = 'GET', body?: object): Promise<T> {
    const response = await fetch(repository + path, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new GithubError(response.status);
    return response.json();
  }

  async function head() {
    const ref = await github<{ object: { sha: string } }>(`/git/ref/${branch}`);
    return ref.object.sha;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const parent = await head();
    const [commit, catalogFile] = await Promise.all([
      github<{ tree: { sha: string } }>(`/git/commits/${parent}`),
      github<{ encoding: string; content: string }>(`/contents/${catalogPath}?ref=${parent}`),
    ]);
    const catalog: Album[] = JSON.parse(Buffer.from(catalogFile.content, 'base64').toString('utf8'));
    if (catalogFile.encoding !== 'base64' || !Array.isArray(catalog)) throw new Error('Invalid album catalog');
    const { entry, updated } = updateCatalog(catalog, upload);
    const files = await github<{ truncated: boolean; tree: { path: string }[] }>(
      `/git/trees/${commit.tree.sha}?recursive=1`,
    );
    if (files.truncated) throw new Error('Incomplete repository tree');
    const existingPaths = new Set(files.tree.map(file => file.path));
    if (upload.images.some(([path]) => existingPaths.has(`public/${path}`))) {
      throw new AdminError(409, 'A cover file already uses that slug. Choose a different slug.');
    }

    const images = await Promise.all(upload.images.map(async ([path, contents]) => {
      const blob = await github<{ sha: string }>('/git/blobs', 'POST', {
        content: contents.toString('base64'),
        encoding: 'base64',
      });
      return { path: `public/${path}`, mode: '100644', type: 'blob', sha: blob.sha };
    }));
    const tree = await github<{ sha: string }>('/git/trees', 'POST', {
      base_tree: commit.tree.sha,
      tree: [
        { path: catalogPath, mode: '100644', type: 'blob', content: JSON.stringify(updated, null, 2) + '\n' },
        ...images,
      ],
    });
    const saved = await github<{ sha: string }>('/git/commits', 'POST', {
      message: `Add album: ${entry.album.replace(/\s+/g, ' ')}`,
      tree: tree.sha,
      parents: [parent],
    });

    try {
      await github(`/git/refs/${branch}`, 'PATCH', { sha: saved.sha, force: false });
      return { slug: entry.slug, title: entry.album, commit: saved.sha };
    } catch (error) {
      const current = await head();
      if (current === saved.sha) return { slug: entry.slug, title: entry.album, commit: saved.sha };
      if (!(error instanceof GithubError && [409, 422].includes(error.status)) || current === parent) throw error;
    }
  }
  throw new AdminError(409, 'The catalog changed during the upload. Try saving again.');
}

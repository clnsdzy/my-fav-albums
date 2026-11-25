export function getAlbumCoverPath(image: string) {
  return image.replace(/^\.?\//, '');
}

export function getAlbumThumbnailPath(image: string) {
  return getAlbumCoverPath(image).replace(/^images\/(.+)\.[^.]+$/, 'images/thumbnails/$1.webp');
}

export function getSpotifyAlbumUrl(id: string) {
  return `https://open.spotify.com/album/${id}`;
}

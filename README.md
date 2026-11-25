<img width="1889" height="997" alt="image" src="https://github.com/user-attachments/assets/a90d1819-a435-46d9-9402-04d880447b18" />

---

A personally curated archive showcasing my all-time favorite music records. This app provides a gallery-like experience for exploring my personal collection of music that has defined my journey in life through sound.

## Features

- Explore a ranked collection with album summaries and shareable detail pages.
- Filter the collection by genre, year, or rating.
- **Dynamic Sorting**: Sort albums by Rank, Year, Rating, or Album Name.
- **Spotify Integration**: Preview tracks directly within the app via embedded Spotify players in the album detail view.

## Tech Stack

- Built with React 19 and TypeScript
- **Styling**: Tailwind CSS for utility-first, artistic styling
- **Animations**: Motion (formerly Framer Motion) for layout and entrance animations
- **Icons**: Lucide React for consistent, crisp SVG icons
- **Data**: Static album data with Spotify and Apple Music integration (Supabase Integration soon ⏳)

## Getting Started

1.  Clone the repository.
2.  Run `npm ci` to install dependencies.
3.  Start the development server: `npm run dev`
4.  Open your browser to `http://localhost:3000/my-fav-albums/`

## Deploying

The Vercel build uses `vercel.json` to serve the gallery at the domain root. Use `npm run deploy` to publish at `/my-fav-albums/` on GitHub Pages.

## Adding an album

Set `ALBUM_ADMIN_PIN` to a 6–12 digit PIN in the gitignored `.env.local` file and start Vite. On localhost, follow **Add an album** in the footer or open `/my-fav-albums/#/admin`. Unlock the form and enter the album information, streaming links, and cover. The editor saves the catalog entry and creates a WebP thumbnail. Leave rank blank to append the album, or enter a rank to move the other albums down.

The form writes to `src/album-catalog.json` and `public/images/`. Review the changes and run `npm run check:catalog` before publishing with the existing GitHub Pages workflow. The editor runs only on the local Vite server.

For a manual edit, keep each album's `slug` stable and leave `legacy_rank` intact for existing entries. Save a WebP thumbnail with the same base name in `public/images/thumbnails/`, with a longest edge of up to 480 pixels.

## Spotify listening status

The homepage displays the current Spotify track when one is playing. It shows the most recently played song otherwise. Only the track title, artist, artwork URL, and Spotify link appear in the public response.

1. Create a Web API app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Register `http://127.0.0.1:8888/spotify/callback` as its redirect URI.
2. Run `npm run spotify:authorize -- YOUR_CLIENT_ID` and open the URL printed in the terminal. Approve access to playback state and recent tracks. The command saves the Client ID and refresh token in the gitignored `.env.local` file. Restart Vite to check the status locally.
3. Deploy the [`spotify-status`](./spotify-status) directory as a Vercel project using the **Other** framework preset. Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_REFRESH_TOKEN` as server environment variables for Production, then deploy the function with those settings.
4. Set `VITE_SPOTIFY_STATUS_URL` in the gallery's `.env.local` to the deployed HTTPS endpoint, including `/api/now-playing`. Run the existing GitHub Pages publishing workflow so that the build includes the endpoint URL.

Spotify requires the owner of a Development Mode app to have Premium. Refresh tokens expire after six months. Run `npm run spotify:authorize` again and update the hosted refresh token when it expires.

## Collection goal

The aim is to get to 50 music albums by the end of 2026.

## Footnotes
* and counting. The aim is to get to 50 music albums by the end of 2026.

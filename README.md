# My Top Albums

A curated, interactive music archive showcasing all-time favorite records. This application provides a premium, gallery-like experience for exploring a personal collection of music that has defined a journey through sound.

## Features

- **All-Time Favorites**: A collection of 26 top-ranked albums with detailed summaries.
- **Interactive Filtering**: Filter the collection by **Genre**, **Year**, and **Rating** to find exactly what you're looking for.
- **Dynamic Sorting**: Sort albums by Rank, Year, Rating, or Album Name.
- **Spotify Integration**: Listen to tracks directly within the app via embedded Spotify players in the album detail view.
- **Premium Design**: A sophisticated dark theme using a deep navy palette (`#0d1b2a`) with high-quality typography (Brother 1816 for headings, Coltan Gea for body text).
- **Responsive & Animated**: Smooth transitions and a fully responsive layout that works beautifully on all devices.

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS for utility-first, artistic styling
- **Animations**: Motion (formerly Framer Motion) for layout and entrance animations
- **Icons**: Lucide React for consistent, crisp SVG icons
- **Data**: Static album data with Spotify and Apple Music integration

## Getting Started

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Start the development server: `npm run dev`
4.  Open your browser to `http://localhost:3000`

## Project Structure

- `/src/albums.ts`: The source of truth for the album collection.
- `/src/App.tsx`: The main application logic and layout.
- `/src/components/`: Reusable UI components (AlbumCard, Select, Rating, etc.).
- `/src/index.css`: Global styles and Tailwind theme configuration.
- `/src/types.ts`: TypeScript interfaces for the data model.

Curated with an audiophile's heart.

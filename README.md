# Zoomer — Outside the Feed

A responsive 2D character website with a continuous skateboard loop, animated scroll scenes and four original mood illustrations.

## Preview locally

No build step or dependency installation is required.

    python -m http.server 5173 --directory dist

Open http://127.0.0.1:5173.

## Deploy to Vercel

The included vercel.json configures the static dist directory. Import this repository in Vercel with Framework Preset Other, or run:

    npx vercel --prod

## Assets and behavior

Artwork and motion provenance is recorded in ASSETS.json. Fonts are self-hosted. Decorative videos are muted, play only when relevant and retain static image fallbacks for reduced-motion, data-saving and playback failures.

The current version includes four original mood illustrations, the continuous skateboarding loop and the complete-character closing composition. Removed decorative captions and controls remain absent.

## 2K media delivery

The wide hero is 2560×1440, with a one-second skateboard cycle, dedicated neural interpolation to 60 fps and a seamless 16-second moving-world composition. The camera follows Zoomer while the park travels left and the pavement passes twice as fast; the sky stays anchored. This is baked into a single video to avoid extra browser animation work. Square illustrations and story videos are delivered at 2048×2048. Story videos use 60 fps. AI video enhancement restores cleaner contours; static image resampling preserves the source artwork without inventing detail. Only active media plays, with reduced-motion and data-saving static fallbacks.

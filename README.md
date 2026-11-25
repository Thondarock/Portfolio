# Korada Purna Sai — 3D Portfolio

An immersive, scroll-driven 3D portfolio for a SOC Analyst / Detection Engineer.

**Live:** https://portfolio-pi-ecru-ymyq50e7wy.vercel.app

## Experience

The whole page sits on top of one continuous Three.js world. As you scroll, the camera flies along a spline through a different set piece for every section:

| Section | 3D scene |
|---|---|
| Hero | "Aegis core": a noise-displaced shield orb with orbiting rings, behind a tilting analyst ID card |
| About | Live threat graph: nodes, edges, travelling pulses and blinking threat nodes |
| Experience | Hexagonal tunnel the camera flies through |
| Work | Animated data terrain (shader-displaced point field) |
| Lab | Floating wireframe polyhedra around a pinned, horizontally scrolling 3D coverflow of GitHub projects |
| Skills | Particle sphere plus an interactive, draggable 3D tag sphere |
| Credentials | Gyroscope rings and flip-card certification badges |
| Contact | Portal vortex |

Also included: a terminal boot loader, smooth scrolling (Lenis), GSAP ScrollTrigger reveals, split-text animation, a magnetic custom cursor, 3D tilt cards, mobile menu and full mobile layout, a `prefers-reduced-motion` mode, and a CSS fallback when WebGL isn't available.

## Design

- **Palette:** midnight `#05070D`, signal cyan `#3CF0D2`, blue `#7AA8FF`, violet `#8B5CFF`, alert amber `#FFB547`
- **Type:** Bricolage Grotesque (display/body), Instrument Serif italic (accents), JetBrains Mono (technical labels)

## Structure

```
index.html            content & markup
css/main.css          design system, layout, responsive rules
js/main.js            loader, smooth scroll, animations, lab, skill sphere, cursor
js/world.js           Three.js world and scroll camera
js/projects.js        GitHub projects shown in the Lab (edit here to add repos)
vendor/               three.js 0.170, GSAP 3.12 + ScrollTrigger, Lenis 1.1 (self-hosted)
assets/               photos, favicon, social image, résumé PDF
```

No build step. Deploy the folder as-is to Vercel, Netlify or GitHub Pages. To preview locally, serve the folder (ES modules need http, not `file://`):

```bash
python3 -m http.server 8000
```

To add a project, append an entry to `js/projects.js`.

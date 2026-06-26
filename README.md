# ForgePC

ForgePC is an intelligent, AI-powered frontend PC builder. It guides users through crafting their ultimate gaming, workstation, or office PC setup by smartly pairing compatible parts from a real-time JSON database using a responsive, modern design framework.

## Features
- **Smart Form Building**: Input your budget and primary use case, and the adapter logic will autonomously handle budget distribution constraints (e.g. reserving 40% for the GPU) and strictly enforce socket compatibility constraints.
- **Deep Search**: Sort and filter hundreds of components across 8 categories instantly.
- **Explainable AI Integration Structure**: Each generated build features an inline component that simulates interacting with a Gemini-like agent to explain the rationale behind a selected part.
- **Polished UX/UI**: Implemented with strict adherence to a copper & navy premium aesthetic. Fully keyboard accessible, features staggered CSS animations, and handles `prefers-reduced-motion`.

## Local Deployment Instructions

The website relies entirely on pure HTML, CSS, and Vanilla JavaScript. It uses the modern `fetch()` API to natively parse the local JSON databases located in `/data/`.

1. **Clone or Download** this directory.
2. **Launch a local server**. Because modern web browsers block `fetch()` requests on `file:///` URLs due to CORS and security policies, you must serve the files locally.
   - *Using Node.js Backend*: 
     Start the node server by running:
     ```bash
     node server.js
     ```
     The frontend will communicate with `http://localhost:5000`.
   - *Using VS Code*: Install and use the **Live Server** extension.

## Project Structure
- `index.html`: The main homepage featuring use cases and the hero.
- `build.html`: The AI PC builder interface.
- `search.html`: The master components search directory.
- `contact.html`: Contact form.
- `server.js`: The NodeJS Express backend for handling user auth and saving builds.
- `assets/css/style.css`: The global, highly-customized styling token system.
- `assets/js/main.js`: The central hub for frontend interaction, data fetching, search mappings, and the smart build engine logic.
- `data/*.json`: Categorized raw component databases.

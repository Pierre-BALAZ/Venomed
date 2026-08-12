# Venomed — PWA

Application web progressive (PWA) reconstruite à partir de l'APK Venomed d'origine.

## Lancer en local
Servez le dossier via un serveur HTTP (nécessaire pour le service worker / mode hors-ligne) :

    python3 -m http.server 8000
    # puis ouvrir http://localhost:8000

Ouvrir `index.html` directement (file://) fonctionne aussi, sauf l'installation PWA et le cache hors-ligne.

## Structure
- `index.html` — page hôte
- `styles.css` — thème et mise en page
- `app.js` — routeur + rendu des vues (accueil, catégories, fiches, syndromes, recherche, urgence, sources)
- `data.js` — tout le contenu (`window.VENOMED_DATA`)
- `venomed_data.json` — mêmes données, format brut réutilisable
- `assets/img/` — 86 photos (WebP)
- `assets/icons/` — icônes de l'app
- `sw.js` / `manifest.json` — service worker et manifeste (installation + hors-ligne)

## Modifier le contenu
Éditez `venomed_data.json`, puis régénérez `data.js` :

    node -e "const d=require('./venomed_data.json');require('fs').writeFileSync('data.js','window.VENOMED_DATA = '+JSON.stringify(d)+';')"

## Déploiement
Hébergez le dossier sur n'importe quel hébergement statique (Netlify, GitHub Pages, Vercel…). HTTPS active l'installation en PWA.

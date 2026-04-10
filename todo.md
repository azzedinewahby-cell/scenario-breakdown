# Project TODO

- [x] Database schema: scenarios table (userId, title, fileName, fileUrl, status, createdAt)
- [x] Database schema: scenes table (scenarioId, sceneNumber, intExt, location, dayNight, description)
- [x] Database schema: characters table (scenarioId, name)
- [x] Database schema: scene_characters junction table (sceneId, characterId)
- [x] Database schema: dialogues table (sceneId, characterId, text, orderIndex)
- [x] Backend: file upload endpoint with S3 storage (PDF, FDX, DOCX)
- [x] Backend: LLM-based scenario parsing and extraction
- [x] Backend: tRPC routes for scenarios CRUD (list, get, delete)
- [x] Backend: tRPC route for scenario breakdown data
- [x] Backend: tRPC route for dashboard statistics
- [x] Backend: CSV export endpoint
- [x] Frontend: global design system (typography, colors, spacing)
- [x] Frontend: DashboardLayout with sidebar navigation
- [x] Frontend: upload page with drag-and-drop interface
- [x] Frontend: scenario breakdown view (structured scene list)
- [x] Frontend: dashboard with summary statistics
- [x] Frontend: CSV export button
- [x] Frontend: scenario history page with access to previous breakdowns
- [x] Authentication: protect all routes with user authentication
- [x] Vitest: unit tests for backend procedures
- [x] Backend: implement real DOCX text extraction (mammoth)
- [x] Backend: implement real FDX text extraction (fast-xml-parser)
- [x] Backend: improve scenario parser to handle extracted text from DOCX/FDX
- [x] Frontend: afficher les lieux sous forme de liste au lieu de badges en ligne dans ScenarioDetail
- [x] Frontend: supprimer le sous-titre "Vue d'ensemble de vos dépouillements" du tableau de bord
- [x] Backend: ajouter une route tRPC d'export PDF du dépouillement
- [x] Frontend: ajouter un bouton d'export PDF dans la page de détail du scénario
- [x] Backend/Frontend: dédupliquer les décors identiques (même lieu = un seul décor) dans les stats et l'affichage (déjà fait via Set sur le nom du lieu)
- [x] Frontend: renommer "Scènes" en "Séquences" partout dans l'interface
- [x] Frontend: afficher les personnages sous forme de liste (comme les lieux) au lieu de badges
- [x] Backend: ajouter le champ "gender" (male/female/unknown) à la table characters
- [x] Backend: modifier le parsing LLM pour extraire le genre des personnages
- [x] Frontend: afficher emoji femme rose pour féminin et emoji homme bleu pour masculin dans les listes de personnages
- [x] Frontend: corriger l'affichage des emojis de genre (👨 pour homme, 👩 pour femme) dans toutes les listes de personnages
- [x] Frontend: créer les icônes SVG pour homme/femme adulte et enfant (bleu/rose)
- [x] Backend: ajouter le champ age (adult/child/unknown) au schéma DB et au parsing LLM
- [x] Frontend: remplacer les emojis par les icônes SVG dans toutes les listes de personnages
- [x] Frontend: corriger le composant CharacterIcon pour que la distinction adulte/enfant soit bien visible
- [x] Frontend: ajouter un lecteur PDF avec pdfjs
- [x] Frontend: ajouter un lecteur DOCX et FDX
- [x] Frontend: intégrer le lecteur dans la page de détail du scénario avec un modal
- [x] Frontend: corriger le worker PDF.js pour fonctionner localement
- [x] Frontend: corriger et améliorer l'extraction DOCX dans le lecteur
- [x] Frontend: simplifier le lecteur PDF pour afficher directement le fichier avec iframe
- [x] Backend: ajouter le champ props (accessoires) au schéma DB et au parsing LLM
- [x] Backend: créer les routes tRPC d'agrégation (getAllCharacters, getAllLocations, getAllProps, getAllSequences)
- [x] Frontend: créer les 4 onglets dans ScenarioDetail (Accessoires, Personnages, Lieux, Séquences)
- [x] Frontend: implémenter les interactions (clic, filtres, recherche, scroll vers scène)
- [x] Frontend: ajouter la logique de création/renommage de séquences

- [x] Navigation principale avec 4 onglets (Accessoires, Personnages, Lieux, Séquences) implémentée
- [x] Recherche et filtres dans les onglets
- [x] Création de séquences fonctionnelle
- [ ] Liaison des accessoires aux scènes (table scene_props) - optionnel pour MVP
- [ ] Renommage de séquences - optionnel pour MVP
- [ ] Scroll vers scène avec highlight - optionnel pour MVP
- [ ] Frontend: permettre le regroupement/fusion de séquences - optionnel pour MVP

## Bugs résolus (session actuelle)
- [x] Bug: résumés des séquences ne s'affichent pas dans l'onglet Séquences - RÉSOLU (les résumés générés par LLM s'affichent correctement)
- [x] Bug: accessoires ne s'affichent pas dans l'onglet Accessoires - RÉSOLU (42 accessoires extraits et affichés correctement)

## Bugs identifiés (session actuelle - suite)
- [ ] Bug: accessoires manquants pour les autres scénarios (GRELLOU, LA PORTE, etc.)
  * Cause: Les accessoires ne sont extraits que lors du parsing initial lors de l'upload
  * Les scénarios uploadés avant l'implémentation de la feature n'ont pas d'accessoires
  * Solution: Re-parser les scénarios existants via une migration manuelle
  * Note: LES DISPARUES a 42 accessoires car il a été uploadé/parsé après l'implémentation

## Nouvelles fonctionnalités (session actuelle)
- [x] Frontend: ajouter un bouton "Télécharger" à côté du bouton "Lire" pour télécharger le scénario original - COMPLÉTÉ

## Corrections et améliorations (session actuelle - suite)
- [x] Backend: corriger le paramètre de la route delete (id -> scenarioId) pour la cohérence
- [x] Frontend: corriger l'appel de la mutation delete pour utiliser scenarioId
- Note: La suppression avec confirmation était déjà implémentée

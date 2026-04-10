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

## Nouvelles fonctionnalités (session actuelle - traçabilité)
- [ ] Backend: créer les relations accessoires-séquences (table props_scenes)
- [ ] Backend: créer les relations personnages-séquences (table characters_scenes) - probablement déjà existante
- [ ] Backend: créer une route tRPC pour récupérer les séquences par accessoire
- [ ] Backend: créer une route tRPC pour récupérer les séquences par personnage
- [ ] Frontend: afficher les séquences pour chaque accessoire dans l'onglet Accessoires
- [ ] Frontend: afficher les séquences pour chaque personnage dans l'onglet Personnages

## Nouvelles fonctionnalités (session Storyboard)
- [x] Backend: ajouter une route tRPC pour générer un synopsis complet via LLM
- [x] Backend: stocker le synopsis dans la table scenarios (champ synopsis)
- [x] Backend: ajouter une route pour récupérer les personnages par séquence
- [x] Backend: ajouter une route pour récupérer les accessoires par séquence
- [x] Frontend: créer l'onglet Storyboard avec synopsis généré par LLM
- [x] Frontend: réorganiser les onglets (Storyboard, Séquences, Personnages, Lieux, Accessoires)
- [x] Frontend: enrichir l'onglet Séquences avec personnages et accessoires par séquence

## Bugs résolus (session actuelle - suite 2)
- [x] Bug: onglet Accessoires n'affiche pas les séquences où l'accessoire est utilisé - RÉSOLU (association automatique des props aux scènes via LLM)

## Bugs résolus (session actuelle - suite 3 - FINAL)
- [x] Bug: accessoires ne trouvent pas les séquences - RÉSOLU (recherche par mots-clés dans les descriptions des scènes)
- [x] Implémentation: getSequencesForProp cherche maintenant directement dans le texte des scènes
- [x] Implémentation: recherche flexible avec extraction de mots-clés (au moins 2 mots-clés doivent correspondre)

## Tâches optionnelles restantes
- [ ] Backend: ajouter une migration/backfill pour créer scene_props pour les scénarios existants - OPTIONNEL
- [ ] Frontend: permettre le renommage de séquences - OPTIONNEL
- [ ] Frontend: scroll vers scène avec highlight - OPTIONNEL
- [ ] Frontend: permettre le regroupement/fusion de séquences - OPTIONNEL


## Bugs résolus (session actuelle - suite 4 - FINAL)
-- [x] Backend: ajouter les champs screenwriterName, screenwriterEmail, screenwriterPhone au schema scenarios
- [x] Backend: generer et executer la migration SQL (colonnes verifiees dans la DB)
- [x] Frontend: modifier la page Historique pour afficher les informations du scenariste
- [x] Frontend: accessoires dans l'onglet Sequences fonctionne correctement (teste avec LABORATOIRE)
- [x] Backend: corriger la deduplication des accessoires (par nom au lieu de par ID)
- [x] Frontend: affichage correct des accessoires sans doublons

## Implementations completes
- [x] Recherche par mots-cles pour trouver les accessoires dans les descriptions des scenes
- [x] Affichage des informations du scenariste dans la page Historique (nom, email, telephone)
- [x] Migration de base de donnees pour ajouter les champs du scenariste
- [x] Deduplication des accessoires par nom (evite les doublons dus aux IDs multiples)
- [x] Tous les tests passent (17/17)
- [x] Application completement fonctionnelle et stable


## Nouvelle session - Restructuration du tableau de bord (4 modules)

### Phase 1 : Restructurer le tableau de bord
- [x] Frontend: créer la nouvelle structure du tableau de bord avec 4 boutons/cartes
- [x] Frontend: implémenter les couleurs professionnelles (Bleu marine, Vert foncé, Ambre, Rouge brique)
- [x] Frontend: créer les routes de navigation pour chaque module

### Phase 2 : Créer les pages de chaque module (stubs)
- [x] Frontend: créer la page BudgetPage (stub)
- [x] Frontend: créer la page DistributionPage (stub)
- [x] Frontend: créer la page FinancementPage (stub)
- [x] Frontend: ajouter les routes dans App.tsx

### Phase 3 : Développer le module Budget
- [ ] Backend: créer le schéma de base de données pour Budget
- [ ] Backend: créer les routes tRPC pour Budget
- [ ] Frontend: implémenter l'interface Budget

### Phase 4 : Développer le module Distribution
- [ ] Backend: créer le schéma de base de données pour Distribution
- [ ] Backend: créer les routes tRPC pour Distribution
- [ ] Frontend: implémenter l'interface Distribution

### Phase 5 : Développer le module Financement
- [ ] Backend: créer le schéma de base de données pour Financement
- [ ] Backend: créer les routes tRPC pour Financement
- [ ] Frontend: implémenter l'interface Financement


## Bugs résolus (session actuelle - suite 5)
- [x] Feature: Supprimer la section Statistiques globales du tableau de bord
- [x] Feature: Modifier le design des modules (fond blanc, texte coloré)
- [x] Feature: Remplacer l'icône dollar par euros pour le module Budget

## Bugs rapportés (session actuelle - à corriger)
- [ ] Bug: Bouton de téléchargement du scénario ne fonctionne pas
- [ ] Bug: Page du scénario reste bloquée sur le spinner de chargement

## Nouvelles demandes (session actuelle - à implémenter)
- [ ] Feature: Module Distribution doit afficher les Festivals (pas les rôles et acteurs)
- [ ] Feature: Implémenter la gestion des Festivals dans le module Distribution

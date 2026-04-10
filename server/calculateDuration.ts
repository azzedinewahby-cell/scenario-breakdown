/**
 * Calcule la durée approximative d'un scénario en minutes
 * Basé sur les standards cinéma : 1 page ≈ 1 minute
 * Avec ajustements selon le type de scène
 */

interface Scene {
  description: string;
  intExt?: string;
  location?: string;
}

function analyzeSceneType(description: string): 'dialogue' | 'action' | 'contemplative' {
  const text = description.toLowerCase();
  
  // Compter les lignes de dialogue (format: PERSONNAGE: dialogue)
  const dialogueMatches = description.match(/^[A-Z\s]+:/gm) || [];
  const dialogueRatio = dialogueMatches.length / (description.split('\n').length || 1);
  
  // Détecter les mots-clés d'action
  const actionKeywords = ['court', 'saute', 'court', 'tire', 'explose', 'crash', 'poursuit', 'combat', 'chute', 'fuit', 'attaque', 'frappe', 'course', 'explosion', 'poursuite'];
  const hasActionKeywords = actionKeywords.some(keyword => text.includes(keyword));
  
  // Détecter les scènes contemplatives
  const contemplativeKeywords = ['silence', 'contemple', 'regarde', 'pense', 'rêve', 'souvenir', 'flashback', 'montage', 'musique', 'poétique', 'lent'];
  const hasContemplativeKeywords = contemplativeKeywords.some(keyword => text.includes(keyword));
  
  if (hasContemplativeKeywords && !hasActionKeywords) {
    return 'contemplative';
  }
  
  if (hasActionKeywords) {
    return 'action';
  }
  
  if (dialogueRatio > 0.4) {
    return 'dialogue';
  }
  
  return 'action';
}

function calculateSceneDuration(scene: Scene): number {
  const lines = scene.description.split('\n').length;
  const words = scene.description.split(/\s+/).length;
  
  // Estimation de pages (250 mots ≈ 1 page)
  const estimatedPages = Math.max(1, Math.round(words / 250));
  
  // Durée de base : 1 page = 60 secondes
  let duration = estimatedPages * 60;
  
  // Ajustement selon le type de scène
  const sceneType = analyzeSceneType(scene.description);
  
  switch (sceneType) {
    case 'dialogue':
      // Les scènes dialoguées sont généralement plus rapides
      duration = Math.round(duration * 0.8);
      break;
    case 'action':
      // Les scènes d'action sont généralement plus lentes (montage, effets)
      duration = Math.round(duration * 1.2);
      break;
    case 'contemplative':
      // Les scènes contemplatives sont plus longues (silence, musique)
      duration = Math.round(duration * 1.4);
      break;
  }
  
  // Durée minimale : 3 secondes
  return Math.max(3, duration);
}

export function calculateScenarioDuration(scenes: Scene[]): {
  totalSeconds: number;
  totalMinutes: number;
  totalSeconds_remainder: number;
  estimatedPages: number;
  sceneCount: number;
  averagePerScene: number;
  rhythm: 'rapide' | 'équilibré' | 'lent';
} {
  if (!scenes || scenes.length === 0) {
    return {
      totalSeconds: 0,
      totalMinutes: 0,
      totalSeconds_remainder: 0,
      estimatedPages: 0,
      sceneCount: 0,
      averagePerScene: 0,
      rhythm: 'équilibré',
    };
  }
  
  let totalSeconds = 0;
  const sceneDurations: number[] = [];
  
  for (const scene of scenes) {
    const duration = calculateSceneDuration(scene);
    totalSeconds += duration;
    sceneDurations.push(duration);
  }
  
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalSeconds_remainder = totalSeconds % 60;
  
  // Estimation du nombre de pages
  const totalWords = scenes.reduce((sum, scene) => sum + scene.description.split(/\s+/).length, 0);
  const estimatedPages = Math.round(totalWords / 250);
  
  // Moyenne par scène
  const averagePerScene = Math.round(totalSeconds / scenes.length);
  
  // Analyse du rythme
  let rhythm: 'rapide' | 'équilibré' | 'lent' = 'équilibré';
  if (totalMinutes < 30) {
    rhythm = 'rapide';
  } else if (totalMinutes > 120) {
    rhythm = 'lent';
  }
  
  return {
    totalSeconds,
    totalMinutes,
    totalSeconds_remainder,
    estimatedPages,
    sceneCount: scenes.length,
    averagePerScene,
    rhythm,
  };
}

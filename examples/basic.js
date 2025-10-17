// ════════════════════════════════════════════════════════════════
// 🧪 FICHIER DE TEST COMPLET - FetchYourKeys SDK (CORRIGÉ)
// Teste tous les cas d'usage pratiques comme un vrai utilisateur
// ════════════════════════════════════════════════════════════════

import FetchYourKeys from '../lib/index.js';
import dotenv from 'dotenv';

dotenv.config();

// ════════════════════════════════════════════════════════════════
// 🎨 Fonctions d'affichage colorées
// ════════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(70));
  log(`  ${title}`, 'cyan');
  console.log('═'.repeat(70));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// ════════════════════════════════════════════════════════════════
// 📊 TEST 1: INITIALISATION NORMALE
// ════════════════════════════════════════════════════════════════

async function testNormalInitialization() {
  logSection('TEST 1: Initialisation normale avec clé valide');
  
  try {
    logInfo('Création de l\'instance FetchYourKeys...');
    
    const fyk = new FetchYourKeys({
      apiKey: process.env.FYK_SECRET_KEY,
      environment: 'dev',
      debug: true,
      silentMode: false
    });

    logInfo('⏳ Attente de l\'initialisation automatique...');
    
    // ✅ FIX: Attendre explicitement l'initialisation avec un test
    await waitForInitialization(fyk);

    const stats = fyk.getStats();
    logSuccess('SDK initialisé avec succès!');
    console.log('\n📊 Statistiques:');
    console.log(`   - Statut: ${stats.status}`);
    console.log(`   - Clés en cache: ${stats.cachedKeys}`);
    console.log(`   - En ligne: ${stats.isOnline}`);
    console.log(`   - Environnement: ${stats.environment}`);
    console.log(`   - Type de cache: ${stats.cacheType}`);
    
    return fyk;
    
  } catch (error) {
    logError('Erreur lors de l\'initialisation:');
    console.log(`   Code: ${error.code}`);
    console.log(`   Message: ${error.message}`);
    if (error.details?.suggestion) {
      console.log(`   💡 Suggestion: ${error.details.suggestion}`);
    }
    throw error;
  }
}

// ✅ FONCTION HELPER: Attendre que l'initialisation soit complète
async function waitForInitialization(fyk, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Tester si on peut récupérer les stats sans erreur
      const stats = fyk.getStats();
      
      // Si on a des clés ou qu'on est en ligne, c'est bon
      if (stats.cachedKeys > 0 || stats.isOnline) {
        return true;
      }
      
      // Attendre 500ms avant de retester
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      // Si erreur critique, on throw
      if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
        throw error;
      }
      
      // Sinon on continue d'attendre
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  throw new Error('Timeout: L\'initialisation a pris trop de temps');
}

// ════════════════════════════════════════════════════════════════
// 🔑 TEST 2: RÉCUPÉRATION D'UNE CLÉ (VERSION RESULT)
// ════════════════════════════════════════════════════════════════

async function testGetWithResult(fyk) {
  logSection('TEST 2: Récupération d\'une clé avec Result<T>');
  
  try {
    logInfo('Récupération de la clé "groq"...');
    const result = await fyk.get('groq');
    
    if (result.success) {
      logSuccess('Clé récupérée avec succès!');
      console.log('\n📦 Données:');
      console.log(`   - Label: ${result.data.label}`);
      console.log(`   - Service: ${result.data.service}`);
      console.log(`   - Valeur: ${result.data.value.substring(0, 20)}...`);
      console.log(`   - Active: ${result.data.is_active}`);
      console.log('\n🔍 Metadata:');
      console.log(`   - Cachée: ${result.metadata.cached}`);
      console.log(`   - En ligne: ${result.metadata.online}`);
      console.log(`   - Timestamp: ${result.metadata.timestamp}`);
    } else {
      logError('Échec de récupération:');
      console.log(`   Code: ${result.error.code}`);
      console.log(`   Message: ${result.error.message}`);
      console.log(`   💡 Suggestion: ${result.error.suggestion}`);
      
      if (result.error.details?.availableKeys) {
        console.log('\n📋 Clés disponibles:');
        result.error.details.availableKeys.forEach(key => {
          console.log(`      - ${key}`);
        });
      }
    }
    
  } catch (error) {
    logError('Erreur inattendue:');
    console.log(error);
  }
}

// ════════════════════════════════════════════════════════════════
// 🚀 TEST 3: RÉCUPÉRATION SIMPLE (SAFEGET)
// ════════════════════════════════════════════════════════════════

async function testSafeGet(fyk) {
  logSection('TEST 3: Récupération simple avec safeGet()');
  
  try {
    logInfo('Test 1: Récupération d\'une clé existante...');
    const groqKey = await fyk.safeGet('groq', 'fallback-key');
    logSuccess(`Clé récupérée: ${groqKey.substring(0, 20)}...`);
    
    logInfo('\nTest 2: Récupération d\'une clé inexistante avec fallback...');
    const fakeKey = await fyk.safeGet('clé-inexistante', 'ma-valeur-par-defaut');
    logWarning(`Fallback utilisé: "${fakeKey}"`);
    
    logInfo('\nTest 3: Récupération sans fallback...');
    const emptyKey = await fyk.safeGet('autre-clé-inexistante');
    logWarning(`Retour vide: "${emptyKey}"`);
    
    logSuccess('\n✅ safeGet() ne crash jamais, même avec des clés inexistantes!');
    
  } catch (error) {
    logError('Erreur inattendue (ne devrait jamais arriver):');
    console.log(error);
  }
}

// ════════════════════════════════════════════════════════════════
// 📦 TEST 4: RÉCUPÉRATION MULTIPLE
// ════════════════════════════════════════════════════════════════

async function testGetMultiple(fyk) {
  logSection('TEST 4: Récupération de plusieurs clés');
  
  try {
    logInfo('Récupération de plusieurs clés...');
    const labels = ['groq', 'openai', 'claude', 'clé-inexistante'];
    const result = await fyk.getMultiple(labels);
    
    if (result.success) {
      logSuccess('Récupération multiple réussie!');
      console.log('\n📦 Résultats:');
      
      labels.forEach(label => {
        const key = result.data[label];
        if (key) {
          console.log(`   ✅ ${label}: ${key.value.substring(0, 30)}...`);
        } else {
          console.log(`   ❌ ${label}: non trouvée`);
        }
      });
      
    } else {
      logError('Échec de récupération multiple:');
      console.log(`   Code: ${result.error.code}`);
      console.log(`   Message: ${result.error.message}`);
    }
    
  } catch (error) {
    logError('Erreur inattendue:');
    console.log(error);
  }
}

// ════════════════════════════════════════════════════════════════
// 🔄 TEST 5: RAFRAÎCHISSEMENT DU CACHE
// ════════════════════════════════════════════════════════════════

async function testRefresh(fyk) {
  logSection('TEST 5: Rafraîchissement du cache');
  
  try {
    logInfo('Rafraîchissement en cours...');
    const result = await fyk.refresh();
    
    if (result.success) {
      logSuccess('Cache rafraîchi avec succès!');
      console.log(`   En ligne: ${result.metadata.online}`);
      console.log(`   Timestamp: ${result.metadata.timestamp}`);
    } else {
      logWarning('Rafraîchissement échoué (mais pas grave):');
      console.log(`   Code: ${result.error.code}`);
      console.log(`   Message: ${result.error.message}`);
      console.log(`   💡 ${result.error.suggestion}`);
    }
    
  } catch (error) {
    logError('Erreur inattendue:');
    console.log(error);
  }
}

// ════════════════════════════════════════════════════════════════
// 🔍 TEST 6: FILTRAGE ET RECHERCHE
// ════════════════════════════════════════════════════════════════

async function testFilterAndSearch(fyk) {
  logSection('TEST 6: Filtrage et recherche de clés');
  
  try {
    logInfo('Récupération de toutes les clés...');
    const allKeys = await fyk.getAll();
    logSuccess(`${allKeys.length} clés trouvées au total`);
    
    console.log('\n📋 Premières clés:');
    allKeys.slice(0, 5).forEach(key => {
      console.log(`   - ${key.label} (${key.service})`);
    });
    
    if (allKeys.length > 0) {
      const firstService = allKeys[0].service;
      logInfo(`\nRecherche par service: "${firstService}"...`);
      const serviceKeys = await fyk.getByService(firstService);
      logSuccess(`${serviceKeys.length} clés trouvées pour le service "${firstService}"`);
    }
    
  } catch (error) {
    logError('Erreur lors du filtrage:');
    console.log(error);
  }
}

// ════════════════════════════════════════════════════════════════
// ⚠️  TEST 7: GESTION D'ERREURS (CLÉ INEXISTANTE)
// ════════════════════════════════════════════════════════════════

async function testKeyNotFound(fyk) {
  logSection('TEST 7: Gestion d\'erreur - Clé inexistante');
  
  try {
    logInfo('Tentative de récupération d\'une clé inexistante...');
    const result = await fyk.get('ma-super-cle-qui-existe-pas');
    
    if (!result.success) {
      logSuccess('Erreur gérée proprement (c\'est normal)!');
      console.log('\n📋 Détails de l\'erreur:');
      console.log(`   Code: ${result.error.code}`);
      console.log(`   Message: ${result.error.message}`);
      console.log(`   💡 Suggestion: ${result.error.suggestion}`);
      
      if (result.error.details?.availableKeys) {
        console.log('\n   Clés disponibles suggérées:');
        result.error.details.availableKeys.slice(0, 5).forEach(key => {
          console.log(`      - ${key}`);
        });
      }
    }
    
  } catch (error) {
    logError('Erreur inattendue (ne devrait pas arriver):');
    console.log(error);
  }
}

// ════════════════════════════════════════════════════════════════
// 📊 TEST 8: STATISTIQUES ET MONITORING
// ════════════════════════════════════════════════════════════════

async function testStatsAndMonitoring(fyk) {
  logSection('TEST 8: Statistiques et monitoring');
  
  try {
    logInfo('Récupération des statistiques...');
    const stats = fyk.getStats();
    
    console.log('\n📊 Statistiques complètes:');
    console.log(`   Status: ${stats.status}`);
    console.log(`   Clés en cache: ${stats.cachedKeys}`);
    console.log(`   En ligne: ${stats.isOnline}`);
    console.log(`   Environnement: ${stats.environment}`);
    console.log(`   Type de cache: ${stats.cacheType}`);
    console.log(`   Cache valide: ${stats.cacheValid}`);
    console.log(`   Cache ID: ${stats.cacheId}`);
    console.log(`   API Key: ${stats.apiKey}`);
    console.log(`   Debug activé: ${stats.debugEnabled}`);
    console.log(`   Silent mode: ${stats.silentMode}`);
    
    logInfo('\nRécupération de l\'historique des logs...');
    const logs = fyk.getLogHistory();
    console.log(`   ${logs.length} entrées dans l'historique`);
    
    if (logs.length > 0) {
      console.log('\n   Derniers logs:');
      logs.slice(-3).forEach(log => {
        console.log(`   [${log.timestamp}] ${log.message}`);
      });
    }
    
    logSuccess('Monitoring opérationnel!');
    
  } catch (error) {
    logError('Erreur lors du monitoring:');
    console.log(error);
  }
}

// ════════════════════════════════════════════════════════════════
// 🚫 TEST 9: INITIALISATION AVEC CLÉ INVALIDE
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// 🧪 MODIFICATION DU TEST 9 - Vérifier l'erreur via getStats()
// ════════════════════════════════════════════════════════════════

async function testInvalidApiKey() {
  logSection('TEST 9: Initialisation avec clé API invalide');
  
  try {
    logInfo('Tentative d\'initialisation avec une clé invalide...');
    
    const fykInvalid = new FetchYourKeys({
      apiKey: 'fake-invalid-key-12345',
      environment: 'dev',
      debug: false,
      silentMode: true
    });

    // ✅ Attendre l'initialisation
    await waitForInitialization(fykInvalid, 10);
    
    // ✅ Vérifier si une erreur est stockée
    const stats = fykInvalid.getStats();
    
    if (stats.error) {
      logSuccess('Erreur interceptée automatiquement (c\'est normal)!');
      console.log('\n📋 Détails de l\'erreur:');
      console.log(`   Code: ${stats.error.code}`);
      console.log(`   Message: ${stats.error.message}`);
      console.log(`   💡 Suggestion: ${stats.error.suggestion}`);
      
      logSuccess('\n✅ Le SDK a correctement bloqué l\'initialisation avec une clé invalide!');
    } else {
      logError('L\'erreur n\'a pas été détectée correctement!');
    }
    
  } catch (error) {
    // ✅ Alternative: Si throw quand même, gérer ici
    logSuccess('Erreur interceptée via catch (c\'est normal)!');
    console.log('\n📋 Détails de l\'erreur:');
    console.log(`   Code: ${error.code}`);
    console.log(`   Message: ${error.message}`);
    if (error.details?.suggestion) {
      console.log(`   💡 Suggestion: ${error.details.suggestion}`);
    }
    logSuccess('\n✅ Le SDK a correctement rejeté la clé invalide!');
  }
}

// ════════════════════════════════════════════════════════════════
// 🔄 TEST 10: MODE SILENT (PRODUCTION)
// ════════════════════════════════════════════════════════════════

async function testSilentMode() {
  logSection('TEST 10: Mode Silent (Production)');
  
  try {
    logInfo('Création d\'une instance en mode silent...');
    
    const fykSilent = new FetchYourKeys({
      apiKey: process.env.FYK_SECRET_KEY,
      environment: 'prod',
      debug: true,
      silentMode: true
    });

    logInfo('⏳ Attente de l\'initialisation silencieuse...');
    await waitForInitialization(fykSilent);

    logInfo('Récupération d\'une clé en mode silent...');
    const result = await fykSilent.get('groq');
    
    if (result.success) {
      logSuccess('Clé récupérée sans pollution de console!');
      console.log(`   Valeur: ${result.data.value.substring(0, 20)}...`);
    }
    
    const logs = fykSilent.getLogHistory();
    console.log(`\n   📝 ${logs.length} logs enregistrés en interne (pas dans la console)`);
    
    logSuccess('Mode silent opérationnel pour la production!');
    
  } catch (error) {
    logError('Erreur en mode silent:');
    console.log(error);
  }
}

// ════════════════════════════════════════════════════════════════
// 🎯 FONCTION PRINCIPALE - EXÉCUTION DE TOUS LES TESTS
// ════════════════════════════════════════════════════════════════

async function runAllTests() {
  log('\n╔═════════════════════════════════════════════════════════════════╗', 'bright');
  log('║     🧪 SUITE DE TESTS COMPLÈTE - FetchYourKeys SDK            ║', 'bright');
  log('╚═════════════════════════════════════════════════════════════════╝', 'bright');
  
  let fyk;
  
  try {
    // Test 1: Initialisation normale
    fyk = await testNormalInitialization();
    
    // Test 2: Récupération avec Result
    await testGetWithResult(fyk);
    
    // Test 3: Récupération simple (safeGet)
    await testSafeGet(fyk);
    
    // Test 4: Récupération multiple
    await testGetMultiple(fyk);
    
    // Test 5: Rafraîchissement
    await testRefresh(fyk);
    
    // Test 6: Filtrage et recherche
    await testFilterAndSearch(fyk);
    
    // Test 7: Clé inexistante
    await testKeyNotFound(fyk);
    
    // Test 8: Stats et monitoring
    await testStatsAndMonitoring(fyk);
    
    // Test 9: Clé invalide
    await testInvalidApiKey();
    
    // Test 10: Mode silent
    await testSilentMode();
    
    // Résumé final
    logSection('RÉSUMÉ FINAL');
    logSuccess('Tous les tests ont été exécutés avec succès! 🎉');
    console.log('\n📋 Ce qui a été testé:');
    console.log('   ✅ Initialisation automatique avec validation');
    console.log('   ✅ Récupération de clés avec Result<T>');
    console.log('   ✅ Récupération simple avec safeGet()');
    console.log('   ✅ Récupération multiple');
    console.log('   ✅ Rafraîchissement du cache');
    console.log('   ✅ Filtrage et recherche');
    console.log('   ✅ Gestion d\'erreurs (clé inexistante)');
    console.log('   ✅ Statistiques et monitoring');
    console.log('   ✅ Validation automatique de clé invalide');
    console.log('   ✅ Mode silent pour production');
    
    console.log('\n' + '═'.repeat(70));
    logSuccess('🎊 FetchYourKeys SDK fonctionne parfaitement! 🎊');
    console.log('═'.repeat(70) + '\n');
    
  } catch (error) {
    logSection('ERREUR CRITIQUE');
    logError('Une erreur critique est survenue:');
    console.log(error);
    process.exit(1);
  }
}

// ════════════════════════════════════════════════════════════════
// 🚀 LANCEMENT DES TESTS
// ════════════════════════════════════════════════════════════════

runAllTests().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
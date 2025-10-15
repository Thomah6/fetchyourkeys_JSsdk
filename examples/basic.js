// 📦 BASIC USAGE EXAMPLE - FetchYourKeys SDK
// Exemples concrets d'utilisation pour les développeurs

import FetchYourKeys from '../lib/index.js';

/**
 * 🎯 EXEMPLE 1: Initialisation de base
 * Configuration minimale pour commencer
 */
async function exempleInitialisation() {
  console.log('🎯 EXEMPLE 1: Initialisation de base\n');

  // Méthode 1: Avec variables d'environnement
  const sdk1 = new FetchYourKeys();
  // Assurez-vous d'avoir FYK_SECRET_KEY dans votre .env

  // Méthode 2: Avec clé API directe
  const sdk2 = new FetchYourKeys({
    apiKey: 'votre-clé-api-secrète-ici'
  });

  // Méthode 3: Configuration complète
  const sdk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY, // Clé API obligatoire
    environment: 'dev', // 'dev' (cache disque) ou 'prod' (cache mémoire)
    debug: false, // Active les logs détaillés
    baseURL: 'https://apifetchyourkeys.vercel.app/v1/keys' // URL par défaut
  });

  console.log('✅ SDK initialisé avec succès');
  return sdk;
}

/**
 * 🎯 EXEMPLE 2: Récupération simple d'une clé
 * Méthode fondamentale pour obtenir une clé API
 */
async function exempleRecuperationSimple() {
  console.log('\n🎯 EXEMPLE 2: Récupération simple d\'une clé\n');

  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY,
    debug: false
  });

  // 📌 Récupérer une clé spécifique
  const stripeKey = await fyk.get('STRIPE_SECRET_KEY');
  
  // if (stripeKey) {
  //   console.log('✅ Clé Stripe trouvée:');
  //   console.log('   Label:', stripeKey.label);
  //   console.log('   Service:', stripeKey.service);
  //   console.log('   Valeur:', stripeKey.value.substring(0, 15) + '...');
  //   console.log('   Active:', stripeKey.is_active);
  // } else {
  //   console.log('❌ Clé Stripe non trouvée');
  // }

  return stripeKey;
}

/**
 * 🎯 EXEMPLE 3: Récupération avec valeur de fallback
 * Essentiel pour les environnements de développement
 */
async function exempleAvecFallback() {
  console.log('\n🎯 EXEMPLE 3: Récupération avec valeur de fallback\n');

  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY
  });

  // 📌 Récupération avec fallback - parfait pour le développement
  const databaseUrl = await fyk.getWithFallback(
    'DATABASE_URL',
    'postgresql://localhost:5432/myapp_dev'
  );

  const apiUrl = await fyk.getWithFallback(
    'API_BASE_URL', 
    'https://api.monapp.com/v1'
  );

  const port = await fyk.getWithFallback('SERVER_PORT', '3000');

  // console.log('✅ Configuration avec fallbacks:');
  // console.log('   Database:', databaseUrl);
  // console.log('   API URL:', apiUrl);
  // console.log('   Port:', port);

  return { databaseUrl, apiUrl, port };
}

/**
 * 🎯 EXEMPLE 4: Récupération multiple
 * Optimise les appels réseau en regroupant les requêtes
 */
async function exempleRecuperationMultiple() {
  console.log('\n🎯 EXEMPLE 4: Récupération multiple\n');

  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY
  });

  // 📌 Récupérer plusieurs clés en un seul appel
  const keys = await fyk.getMultiple([
    'STRIPE_SECRET_KEY',
    'SENDGRID_API_KEY', 
    'JWT_SECRET',
    'DATABASE_URL',
    'UNE_CLE_INEXISTANTE' // Serra null
  ]);

  const foundKeys = Object.values(keys).filter(Boolean);
  const notFoundCount = Object.values(keys).filter(k => !k).length;
  console.log(`✅ Récupération multiple : ${foundKeys.length} clés trouvées, ${notFoundCount} non trouvées`);

  return keys;
}

/**
 * 🎯 EXEMPLE 5: Récupération de toutes les clés
 * Utile pour l'inspection ou le debugging
 */
async function exempleToutesLesCles() {
  console.log('\n🎯 EXEMPLE 5: Récupération de toutes les clés\n');

  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY
  });

  // 📌 Obtenir toutes les clés disponibles
  const allKeys = await fyk.getAll();

  console.log(`📚 ${allKeys.length} clés disponibles dans le système`);
  if (allKeys.length > 0) {
    const sampleKeys = allKeys.slice(0, 3);
    console.log('   Exemples de clés :');
    sampleKeys.forEach(key => {
      console.log(`   • ${key.label} (${key.service}) - Créée le ${new Date(key.created_at).toLocaleDateString()}`);
    });
    if (allKeys.length > 3) {
      console.log(`   ... et ${allKeys.length - 3} clés supplémentaires`);
    }
  }

  return allKeys;
}

/**
 * 🎯 EXEMPLE 6: Filtrage des clés
 * Recherche avancée dans vos clés
 */
async function exempleFiltrage() {
  console.log('\n🎯 EXEMPLE 6: Filtrage des clés\n');

  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY
  });

  // 📌 Filtrer les clés actives
  const activeKeys = await fyk.filter(key => key.is_active);
  console.log(`🎯 ${activeKeys.length} clés actives trouvées`);
  
  // 📌 Filtrer par pattern dans le label
  const stripeKeys = await fyk.filter(key => 
    key.label.toLowerCase().includes('stripe')
  );
  console.log(`🔐 ${stripeKeys.length} clés Stripe trouvées`);

  // 📌 Filtrer par date de création récente
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const recentKeys = await fyk.filter(key => new Date(key.created_at) > oneMonthAgo);
  console.log(`🆕 ${recentKeys.length} clés créées récemment (depuis ${oneMonthAgo.toLocaleDateString()})`);
  
  // Afficher un résumé des résultats
  console.log('\n📊 Résumé des filtres :');
  console.log(`   • Clés actives : ${activeKeys.length}`);
  console.log(`   • Clés Stripe : ${stripeKeys.length}`);
  console.log(`   • Clés récentes : ${recentKeys.length}`);

  return { activeKeys, stripeKeys, recentKeys };
}

/**
 * 🎯 EXEMPLE 7: Récupération par service
 * Organisation par catégories de services
 */
async function exempleParService() {
  console.log('\n🎯 EXEMPLE 7: Récupération par service\n');

  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY
  });

  // 📌 Obtenir toutes les clés d'un service spécifique
  const stripeKeys = await fyk.getByService('stripe');
  const sendgridKeys = await fyk.getByService('sendgrid');
  const databaseKeys = await fyk.getByService('database');

  console.log('🏷️ Clés par service:');
  console.log(`   Stripe: ${stripeKeys.length} clés`);
  console.log(`   SendGrid: ${sendgridKeys.length} clés`);
  console.log(`   Database: ${databaseKeys.length} clés`);

  // Afficher un résumé des clés Stripe
  if (stripeKeys.length > 0) {
    console.log(`\n🔑 Détails des ${stripeKeys.length} clés Stripe :`);
    // Afficher uniquement les 3 premières clés pour éviter la surcharge de logs
    const keysToShow = stripeKeys.slice(0, 3);
    keysToShow.forEach(key => {
      console.log(`   • ${key.label} (${key.service}): ${key.value.substring(0, 8)}...`);
    });
    if (stripeKeys.length > 3) {
      console.log(`   ... et ${stripeKeys.length - 3} clés supplémentaires`);
    }
  }

  return { stripeKeys, sendgridKeys, databaseKeys };
}

/**
 * 🎯 EXEMPLE 8: Gestion du cache et rafraîchissement
 * Contrôle avancé du cache
 */
async function exempleGestionCache() {
  console.log('\n🎯 EXEMPLE 8: Gestion du cache et rafraîchissement\n');

  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY,
    debug: true
  });

  // 📌 Obtenir les statistiques du cache
  const stats = fyk.getStats();
  console.log('📊 Statistiques du cache:');
  console.log('   Clés en cache:', stats.cachedKeys);
  console.log('   Type de cache:', stats.cacheType);
  console.log('   Environnement:', stats.environment);
  console.log('   En ligne:', stats.isOnline);
  console.log('   Statut:', stats.status);
  console.log('   Cache ID:', stats.cacheId);

  // 📌 Rafraîchir manuellement le cache
  console.log('\n🔄 Rafraîchissement du cache...');
  const refreshSuccess = await fyk.refresh();
  console.log('   Rafraîchissement:', refreshSuccess ? '✅ Réussi' : '❌ Échoué');

  // 📌 Vérifier la connexion
  console.log('\n🌐 Vérification de connexion...');
  const isConnected = await fyk.checkConnection();
  console.log('   Connecté à l\'API:', isConnected ? '✅ Oui' : '❌ Non');

  // 📌 Nettoyer le cache
  console.log('\n🧹 Nettoyage du cache...');
  fyk.clearCache();
  console.log('   Cache nettoyé');

  const newStats = fyk.getStats();
  console.log('   Nouvelles statistiques:', newStats);

  return { stats: newStats, isConnected, refreshSuccess };
}

/**
 * 🎯 EXEMPLE 9: Configuration d'application réelle
 * Cas d'usage pratique pour une application
 */
async function exempleConfigurationApplication() {
  console.log('\n🎯 EXEMPLE 9: Configuration d\'application réelle\n');

  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY
  });

  // 📌 Configuration complète d'une application
  const config = {
    // Base de données
    database: {
      url: await fyk.getWithFallback('DATABASE_URL', 'postgresql://localhost:5432/dev'),
      maxConnections: parseInt(await fyk.getWithFallback('DB_MAX_CONNECTIONS', '10'))
    },

    // Paiements
    payments: {
      stripe: {
        secretKey: await fyk.getWithFallback('STRIPE_SECRET_KEY', ''),
        publishableKey: await fyk.getWithFallback('STRIPE_PUBLISHABLE_KEY', ''),
        webhookSecret: await fyk.getWithFallback('STRIPE_WEBHOOK_SECRET', '')
      }
    },

    // Authentification
    auth: {
      jwtSecret: await fyk.getWithFallback('JWT_SECRET', 'dev-secret-change-in-production'),
      jwtExpiry: await fyk.getWithFallback('JWT_EXPIRY', '24h'),
      refreshTokenExpiry: await fyk.getWithFallback('REFRESH_TOKEN_EXPIRY', '7d')
    },

    // Email
    email: {
      sendgridKey: await fyk.getWithFallback('SENDGRID_API_KEY', ''),
      fromEmail: await fyk.getWithFallback('FROM_EMAIL', 'noreply@example.com'),
      fromName: await fyk.getWithFallback('FROM_NAME', 'My App')
    },

    // API externes
    apis: {
      openai: await fyk.getWithFallback('OPENAI_API_KEY', ''),
      googleMaps: await fyk.getWithFallback('GOOGLE_MAPS_API_KEY', '')
    },

    // Application
    app: {
      port: parseInt(await fyk.getWithFallback('PORT', '3000')),
      nodeEnv: await fyk.getWithFallback('NODE_ENV', 'development'),
      logLevel: await fyk.getWithFallback('LOG_LEVEL', 'info')
    }
  };

  console.log('⚙️ Configuration d\'application générée avec succès');
  console.log('📋 Résumé de la configuration :');
  console.log(`   • Base de données : ${config.database ? 'Configurée' : 'Non configurée'}`);
  console.log(`   • Paiements : ${config.payments?.stripe?.secretKey ? 'Stripe configuré' : 'Non configuré'}`);
  console.log(`   • Authentification : ${config.auth?.jwtSecret ? 'JWT configuré' : 'Non configuré'}`);
  console.log(`   • Email : ${config.email?.sendgridKey ? 'SendGrid configuré' : 'Non configuré'}`);
  console.log(`   • API externes : ${Object.values(config.apis || {}).filter(Boolean).length} services configurés`);
  console.log(`   • Application : Port ${config.app?.port}, Environnement ${config.app?.nodeEnv}`);

  return config;
}

/**
 * 🎯 EXEMPLE 10: Gestion des erreurs et debug
 * Bonnes pratiques pour la production
 */
async function exempleGestionErreurs() {
  console.log('\n🎯 EXEMPLE 10: Gestion des erreurs et debug\n');

  try {
    // 📌 Initialisation avec gestion d'erreur
    const fyk = new FetchYourKeys({
      apiKey: process.env.FYK_SECRET_KEY || 'invalid-key',
      debug: true
    });

    // 📌 Activer/désactiver le debug à la volée
    fyk.setDebug(true);
    console.log('🔧 Mode debug activé');

    // 📌 Utilisation sécurisée avec try/catch
    const criticalKey = await fyk.getWithFallback('CRITICAL_KEY', 'fallback-value');
    console.log('✅ Clé critique:', criticalKey);

    // 📌 Récupérer l'historique des logs
    const logs = fyk.getLogHistory();
    console.log(`📝 ${logs.length} entrées de log disponibles`);

    // Afficher un résumé des logs récents
    const recentLogs = logs.slice(-3);
    console.log('📋 3 logs récents sur', logs.length, 'au total:');
    recentLogs.forEach((log, i) => {
      console.log(`   [${i+1}/${logs.length}]`, log);
    });

    // 📌 Nettoyage propre
    fyk.destroy();
    console.log('♻️ Instance nettoyée');

  } catch (error) {
    console.error('💥 Erreur capturée:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    
    if (error.details) {
      console.error('   Détails:', error.details);
    }

    // Suggestions de résolution
    console.log('\n💡 Conseils de dépannage:');
    console.log('   • Vérifiez votre clé API FetchYourKeys');
    console.log('   • Vérifiez votre connexion internet');
    console.log('   • Activez le mode debug pour plus d\'informations');
  }
}

/**
 * 🎯 EXEMPLE 11: Scénario de migration
 * Passage d'environnements classiques à FetchYourKeys
 */
async function exempleMigration() {
  console.log('\n🎯 EXEMPLE 11: Scénario de migration\n');

  const fyk = new FetchYourKeys({
    apiKey: process.env.FYK_SECRET_KEY
  });

  // 📌 Ancienne méthode (variables d'environnement)
  const oldWay = {
    databaseUrl: process.env.DATABASE_URL,
    stripeKey: process.env.STRIPE_SECRET_KEY,
    jwtSecret: process.env.JWT_SECRET
  };

  // 📌 Nouvelle méthode (FetchYourKeys)
  const newWay = {
    databaseUrl: await fyk.getWithFallback('DATABASE_URL', process.env.DATABASE_URL),
    stripeKey: await fyk.getWithFallback('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY),
    jwtSecret: await fyk.getWithFallback('JWT_SECRET', process.env.JWT_SECRET)
  };

  console.log('🔄 Comparaison des méthodes de configuration :');
  
  const compareValues = (label, oldVal, newVal) => {
    const oldStatus = oldVal ? '✅ Défini' : '❌ Non défini';
    const newStatus = newVal ? '✅ Trouvé' : '❌ Non trouvé';
    console.log(`   ${label}:`);
    console.log(`      Ancienne méthode: ${oldStatus}`);
    console.log(`      Nouvelle méthode: ${newStatus}`);
  };
  
  compareValues('DATABASE_URL', oldWay.databaseUrl, newWay.databaseUrl);
  compareValues('STRIPE_SECRET_KEY', oldWay.stripeKey, newWay.stripeKey);
  compareValues('JWT_SECRET', oldWay.jwtSecret, newWay.jwtSecret);
  
  const oldDefined = [oldWay.databaseUrl, oldWay.stripeKey, oldWay.jwtSecret].filter(Boolean).length;
  const newFound = [newWay.databaseUrl, newWay.stripeKey, newWay.jwtSecret].filter(Boolean).length;
  
  console.log(`\n📊 Résumé :`);
  console.log(`   • Ancienne méthode: ${oldDefined}/3 variables définies`);
  console.log(`   • Nouvelle méthode: ${newFound}/3 clés trouvées`);

  return { oldWay, newWay };
}

/**
 * 🚀 FONCTION PRINCIPALE - Exécute tous les exemples
 */
async function runAllExamples() {
  console.log('🚀 DÉMARRAGE DES EXEMPLES FETCHYOURKEYS SDK\n');
  console.log('=' .repeat(50));

  try {
    // Exécution séquentielle des exemples
    await exempleInitialisation();
    await exempleRecuperationSimple();
    await exempleAvecFallback();
    await exempleRecuperationMultiple();
    await exempleToutesLesCles();
    await exempleFiltrage();
    await exempleParService();
    await exempleGestionCache();
    await exempleConfigurationApplication();
    await exempleGestionErreurs();
    await exempleMigration();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 TOUS LES EXEMPLES ONT ÉTÉ EXÉCUTÉS AVEC SUCCÈS!');
    console.log('\n📚 RÉCAPITULATIF DES MÉTHODES DISPONIBLES:');
    console.log('   • get(label) - Récupère une clé spécifique');
    console.log('   • getWithFallback(label, fallback) - Avec valeur par défaut');
    console.log('   • getMultiple(labels) - Récupération groupée');
    console.log('   • getAll() - Toutes les clés');
    console.log('   • filter(predicate) - Filtrage personnalisé');
    console.log('   • getByService(service) - Par catégorie');
    console.log('   • refresh() - Rafraîchit le cache');
    console.log('   • checkConnection() - Vérifie la connexion');
    console.log('   • getStats() - Statistiques du cache');
    console.log('   • clearCache() - Nettoie le cache');
    console.log('   • getLogHistory() - Historique des logs');
    console.log('   • setDebug(enable) - Contrôle du debug');
    console.log('   • destroy() - Nettoyage de l\'instance');

  } catch (error) {
    console.error('\n💥 ERREUR LORS DE L\'EXÉCUTION DES EXEMPLES:');
    console.error('Message:', error.message);
    
    if (error.details) {
      console.error('Détails:', error.details);
    }
  }
}

// 🎯 Point d'entrée principal
// if (import.meta.url.includes(process.argv[1])) {
  runAllExamples();
// }

// Exportation pour utilisation comme module
export {
  exempleInitialisation,
  exempleRecuperationSimple,
  exempleAvecFallback,
  exempleRecuperationMultiple,
  exempleToutesLesCles,
  exempleFiltrage,
  exempleParService,
  exempleGestionCache,
  exempleConfigurationApplication,
  exempleGestionErreurs,
  exempleMigration,
  runAllExamples
};
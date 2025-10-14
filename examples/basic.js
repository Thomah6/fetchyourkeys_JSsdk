// ✅ IMPORT SIMPLE - ES Modules
import FetchYourKeys from '../lib/index.js';

/**
 * Exemple d'utilisation basique du SDK FetchYourKeys
 */
async function testSDK() {
  console.log('🚀 TEST SDK FetchYourKeys - Expérience Développeur\n');

  try {
    // 1. Initialisation
    console.log('1. 📦 Initialisation...');
    const fyk = new FetchYourKeys({
      apiKey: process.env.FYK_SECRET_KEY || 'ton-api-key-ici',
    });

    // Petite pause pour l'initialisation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stats = fyk.getStats();
    console.log('📊 Stats:', stats);
    console.log('---');

    // 2. Test getWithFallback
    console.log('2. 🛡️ Test getWithFallback()...');
    const databaseUrl = await fyk.getWithFallback(
      'DATABASE_URL', 
      'postgresql://localhost:5432/fallback_db'
    );
    console.log('✅ URL Database:', databaseUrl);
    console.log('---');

    // 3. Test getMultiple
    console.log('3. 📦 Test getMultiple()...');
    const multipleKeys = await fyk.getMultiple([
      'stripe1',
      'stripe',
      'stripe1222'
    ]);
    
    console.log('📋 Résultats:');
    Object.entries(multipleKeys).forEach(([label, key]) => {
      console.log(`   ${key ? '✅' : '❌'} ${label}: ${key ? 'Trouvée' : 'Non trouvée'}`);
    });
    console.log('---');

    // 4. Résumé final
    console.log('🎉 TEST RÉUSSI!');
    console.log('📈 Stats finales:', fyk.getStats());

  } catch (error) {
    console.error('💥 ERREUR:', error.message);
  }
}

// Lance le test
testSDK();
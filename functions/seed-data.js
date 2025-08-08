const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Sample data for testing
const sampleOrders = [
  {
    serviceType: 'express',
    amount: 59,
    currency: 'pln',
    fullName: 'Jan Kowalski',
    customerEmail: 'jan.kowalski@example.com',
    phone: '+48123456789',
    caseType: 'Reklamacja (np. produktu, usługi)',
    description: 'Reklamacja wadliwego produktu zakupionego w sklepie internetowym. Produkt nie działa zgodnie z opisem.',
    address: 'ul. Przykładowa 123, 00-001 Warszawa',
    status: 'completed',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    paidAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    serviceType: 'premium',
    amount: 199,
    currency: 'pln',
    fullName: 'Anna Nowak',
    customerEmail: 'anna.nowak@example.com',
    phone: '+48987654321',
    caseType: 'Odwołanie (np. od decyzji ZUS, ubezpieczyciela)',
    description: 'Odwołanie od decyzji ZUS w sprawie odmowy przyznania świadczenia rehabilitacyjnego.',
    address: 'ul. Testowa 456, 30-001 Kraków',
    status: 'in_progress',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    paidAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    serviceType: 'naszeauto',
    amount: 99,
    currency: 'pln',
    fullName: 'Piotr Wiśniewski',
    customerEmail: 'piotr.wisniewski@example.com',
    phone: '+48555666777',
    caseType: 'Wniosek dotyczący pojazdu (Naszeauto)',
    description: 'Wniosek o rejestrację pojazdu sprowadzonego z Niemiec. Potrzebne przygotowanie wszystkich dokumentów.',
    address: 'ul. Samochodowa 789, 80-001 Gdańsk',
    status: 'paid',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    paidAt: admin.firestore.FieldValue.serverTimestamp()
  }
];

async function seedData() {
  try {
    console.log('🌱 Rozpoczynam dodawanie przykładowych danych...');
    
    for (const order of sampleOrders) {
      const docRef = await db.collection('orders').add(order);
      console.log(`✅ Dodano zamówienie: ${docRef.id} (${order.serviceType})`);
    }
    
    console.log('🎉 Wszystkie przykładowe dane zostały dodane pomyślnie!');
    console.log('\n📊 Podsumowanie:');
    console.log(`- Express: ${sampleOrders.filter(o => o.serviceType === 'express').length} zamówienie`);
    console.log(`- Premium: ${sampleOrders.filter(o => o.serviceType === 'premium').length} zamówienie`);
    console.log(`- Naszeauto: ${sampleOrders.filter(o => o.serviceType === 'naszeauto').length} zamówienie`);
    
  } catch (error) {
    console.error('❌ Błąd podczas dodawania danych:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seeding function
seedData()
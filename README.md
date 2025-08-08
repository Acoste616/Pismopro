# PismoPRO - Platforma do Generowania Pism Urzędowych

Platforma hybrydowa AI + ekspert do tworzenia pism urzędowych i skarg z integracją Firebase i Stripe.

## Struktura Projektu

```
PROPismo/
├── .trae/documents/          # Dokumentacja projektu
├── functions/                # Firebase Cloud Functions
│   ├── index.js             # Główne funkcje (Stripe integration)
│   ├── package.json         # Zależności funkcji
│   └── .env.example         # Przykład zmiennych środowiskowych
├── test.html                # Frontend aplikacji
├── firebase.json            # Konfiguracja Firebase
├── firestore.rules          # Reguły bezpieczeństwa Firestore
└── firestore.indexes.json   # Indeksy Firestore
```

## Konfiguracja

### 1. Firebase Setup
```bash
# Zaloguj się do Firebase
firebase login

# Projekt już zainicjalizowany
# firebase init
```

### 2. Stripe Configuration
```bash
# Skopiuj plik środowiskowy
cp functions/.env.example functions/.env

# Edytuj functions/.env i dodaj swoje klucze:
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# EMAIL_USER=your_gmail_address@gmail.com
# EMAIL_PASSWORD=your_gmail_app_password
# EXPERT_EMAIL=expert@pismopro.pl
```

### 3. Email Configuration
1. Włącz 2-step verification w Gmail
2. Wygeneruj App Password dla aplikacji
3. Użyj App Password jako EMAIL_PASSWORD w .env

### 3. Wdrożenie
```bash
# Wdróż Cloud Functions
firebase deploy --only functions

# Wdróż reguły Firestore
firebase deploy --only firestore:rules

# Wdróż całość
firebase deploy
```

## Cloud Functions

### createPaymentIntent
- **Trigger**: Firestore document created in `orders/{orderId}`
- **Funkcja**: Tworzy PaymentIntent w Stripe i aktualizuje zamówienie

### stripeWebhook
- **Endpoint**: `/stripeWebhook`
- **Funkcja**: Obsługuje webhooks od Stripe (payment_intent.succeeded, payment_intent.payment_failed)

### getOrderStatus
- **Endpoint**: `/getOrderStatus?orderId={id}`
- **Funkcja**: Zwraca status zamówienia

## Konfiguracja Stripe Webhook

1. Przejdź do [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Dodaj nowy endpoint: `https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook`
3. Wybierz eventy: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Skopiuj webhook secret do `functions/.env`

## Aktualizacja Frontend

1. W pliku `test.html` zastąp klucz publiczny Stripe:
   ```javascript
   const stripe = Stripe('pk_test_YOUR_ACTUAL_STRIPE_PUBLIC_KEY');
   ```

## Rozwój

### Lokalne testowanie
```bash
# Uruchom emulatory Firebase
firebase emulators:start

# Testuj funkcje lokalnie
cd functions
npm run serve
```

### Logi
```bash
# Sprawdź logi funkcji
firebase functions:log
```

## Bezpieczeństwo

- Klucze Stripe przechowywane w zmiennych środowiskowych
- Reguły Firestore ograniczają dostęp do danych
- CORS skonfigurowany dla funkcji HTTP
- Walidacja webhook signature od Stripe

## Przykładowe dane (opcjonalne)

```bash
# Dodaj przykładowe zamówienia do Firestore
cd functions
node seed-data.js
```

## Następne kroki

1. Skonfiguruj zmienne środowiskowe Stripe i Email
2. Zaktualizuj klucz publiczny Stripe w test.html
3. Wdróż Cloud Functions: `firebase deploy --only functions`
4. Skonfiguruj webhook w Stripe Dashboard
5. Przetestuj pełny flow płatności
6. Zaimplementuj logikę biznesową dla generowania pism
# 🏥 INOX PHARMA — Guide de démarrage complet (XAMPP + MySQL)

## ✅ PRÉREQUIS INSTALLÉS
- XAMPP (avec MySQL démarré)
- Node.js v20+
- VS Code

---

## 📁 ÉTAPE 1 — Copier les fichiers Excel

Créez le dossier `data/` à la racine et copiez-y vos fichiers :
```
inox-pharma/
└── data/
    ├── Client_DPCI_Actif.xlsx
    ├── liste_client_copharmed.xlsx
    ├── CLIT_MAJ.xlsx
    ├── pharmacie_laborex.xlsx
    ├── SECTORISATION_PAYS_2026.xlsx
    ├── SEMENIER_ABIDJAN_INOXPHARMA_MAI_2024_Modifié_2.xlsx
    ├── STRATEGIE_I_Par_Spécialété.xlsx
    ├── Liste_phcie_tedis.xlsx        ← convertir .xls en .xlsx
    └── Clients_Tournées_2.xlsx       ← convertir .xls en .xlsx
```

---

## 🗄️ ÉTAPE 2 — Créer la base MySQL dans XAMPP

1. Ouvrez **XAMPP Control Panel** → cliquez **Start** sur **MySQL**
2. Cliquez **Admin** → phpMyAdmin s'ouvre dans le navigateur
3. Cliquez **Nouvelle base de données** (colonne gauche)
4. Nom : `inoxpharma` → cliquez **Créer**

---

## ⚙️ ÉTAPE 3 — Configurer backend/.env

Ouvrez `backend/.env` et vérifiez :
```
DATABASE_URL="mysql://root:@localhost:3306/inoxpharma"
```
> Si vous avez mis un mot de passe MySQL : `mysql://root:VOTRE_MOT_DE_PASSE@localhost:3306/inoxpharma`

---

## 📦 ÉTAPE 4 — Installer les dépendances

Ouvrez VS Code → Terminal (Ctrl+`)

### Backend :
```bash
cd backend
npm install
```

### Frontend :
```bash
cd ../frontend
npm install
npx tailwindcss init -p
```

---

## 🔧 ÉTAPE 5 — Migrer la base de données

```bash
cd backend
npx prisma migrate dev --name init
```

✅ Succès = "Your database is now in sync with your schema"

Vérifiez dans phpMyAdmin → base `inoxpharma` → vous voyez les tables.

---

## 🌱 ÉTAPE 6 — Initialiser les données

```bash
# Créer labos, grossistes, secteurs, produits, Super Admin
npx ts-node prisma/seed.ts
```

Résultat attendu :
```
✅ 5 laboratoires créés
✅ 4 grossistes créés
✅ 21 secteurs créés
✅ 26 produits créés
✅ Super Admin créé
   Email    : superadmin@inoxpharma.com
   Password : SuperAdmin@2025!
```

---

## 📥 ÉTAPE 7 — Importer les pharmacies Excel

```bash
npx ts-node src/scripts/importExcel.ts
```

Résultat :
```
✅ DPCI: 1352 pharmacies importées
✅ COPHARMED: 1277 pharmacies importées
✅ LABOREX: 1966 pharmacies importées
🎉 Total: ~4500+ pharmacies
```

---

## 📅 ÉTAPE 8 (Optionnel) — Importer le planning

```bash
npx ts-node src/scripts/importPlanning.ts
```

---

## 🚀 ÉTAPE 9 — Lancer l'application

### Terminal 1 — Backend :
```bash
cd backend
npm run dev
```
✅ `INOX PHARMA Server → http://localhost:5000`

### Terminal 2 — Frontend :
```bash
cd frontend
npm run dev
```
✅ `http://localhost:5173/`

---

## 🔑 ÉTAPE 10 — Se connecter

Ouvrez : **http://localhost:5173**

| Champ | Valeur |
|-------|--------|
| Email | superadmin@inoxpharma.com |
| Mot de passe | SuperAdmin@2025! |

> ⚠️ Changez ce mot de passe après la première connexion !

---

## 📱 Installation Android / Windows

### Android :
1. Déployez en production (Railway + Netlify)
2. Ouvrez l'URL dans Chrome Android
3. Menu (⋮) → "Ajouter à l'écran d'accueil"

### Windows :
1. Ouvrez l'URL dans Chrome ou Edge
2. Cliquez l'icône d'installation dans la barre d'adresse
3. Cliquez "Installer"

---

## 🔧 Problèmes fréquents

| Erreur | Solution |
|--------|----------|
| "Access denied for user 'root'" | Ajoutez votre mot de passe MySQL dans DATABASE_URL |
| "Can't connect to MySQL server" | Démarrez MySQL dans XAMPP |
| "Table doesn't exist" | Relancez `npx prisma migrate dev --name init` |
| Leaflet: icônes manquantes | Normal au premier lancement, se règle automatiquement |
| "Module not found" | Relancez `npm install` dans le bon dossier |

---

## 📂 Structure des fichiers importants

```
backend/src/
├── index.ts              ← Serveur principal
├── middleware/auth.ts    ← JWT
├── routes/
│   ├── auth.ts           ← Login
│   ├── users.ts          ← Gestion accès (admin crée délégués)
│   ├── pharmacies.ts     ← 6500+ pharmacies
│   ├── reports.ts        ← Rapports de visite
│   ├── gps.ts            ← Positions GPS
│   ├── products.ts       ← Produits par spécialité
│   └── planning.ts       ← Séminier Abidjan
├── socket/gpsSocket.ts   ← Temps réel Socket.io
└── scripts/
    ├── importExcel.ts    ← Import pharmacies Excel
    └── importPlanning.ts ← Import séminier

frontend/src/
├── App.tsx
├── contexts/AuthContext.tsx
├── services/api.ts
├── components/
│   ├── shared/LoginPage.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   └── tabs/
│   │       ├── OverviewTab.tsx
│   │       ├── GPSMapTab.tsx
│   │       ├── PharmaciesTab.tsx
│   │       ├── ProductsTab.tsx
│   │       ├── UsersTab.tsx
│   │       ├── DelegatesTab.tsx
│   │       ├── PlanningTab.tsx
│   │       ├── ReportsTab.tsx
│   │       └── StatsTab.tsx
│   └── delegate/
│       ├── DelegateView.tsx
│       ├── GeoTracker.tsx
│       ├── VisitReport.tsx
│       ├── MyPlanning.tsx
│       └── MyProducts.tsx
```

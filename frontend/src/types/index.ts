// ═══════════════════════════════════════════════════════════════════════════
// INOX PHARMA — TOUS LES FICHIERS SOURCE FRONTEND
// Créez chaque fichier dans le chemin indiqué par le commentaire de titre
// ═══════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// FICHIER : frontend/src/index.css
// ────────────────────────────────────────────────────────────────────────────
/*
@tailwind base;
@tailwind components;
@tailwind utilities;
@import "leaflet/dist/leaflet.css";

body { font-family: "Inter", system-ui, sans-serif; background-color: #F0F4F8; }
.leaflet-container { border-radius: 12px; }
*/

// ────────────────────────────────────────────────────────────────────────────
// FICHIER : frontend/src/types/index.ts
// ────────────────────────────────────────────────────────────────────────────
export type Role = "SUPER_ADMIN" | "ADMIN" | "DELEGATE";
export type DelegateStatus = "EN_VISITE" | "EN_DEPLACEMENT" | "EN_PAUSE" | "INACTIF";

export interface User {
  id: string; email: string; firstName: string; lastName: string;
  role: Role; isActive: boolean; labs?: string[]; delegate?: DelegateProfile | null;
}
export interface DelegateProfile {
  id: string; zone: string; status: DelegateStatus; laboratory: string;
  phone?: string; lastLat?: number; lastLng?: number; lastSeen?: string; sector?: Sector;
}
export interface Sector {
  id: string; numero: number; zoneResidence: string;
  peripherie?: string; axesMission?: string; type: "ABIDJAN" | "PROVINCE";
  delegateName?: string;
}
export interface Pharmacy {
  id: string; nom: string; pharmacien?: string; codeClient?: string;
  ville?: string; region?: string; province?: string;
  telephone?: string; email?: string; grossiste?: { name: string };
}
export interface Product { id: string; name: string; group: string; specialty: string; }
export interface WeeklyPlanning {
  id: string; zone: string; weekNumber: number;
  lundi?: string; mardi?: string; mercredi?: string; jeudi?: string; vendredi?: string; month: string;
  delegate?: { user: { firstName: string; lastName: string } };
}
export interface VisitReport {
  id: string; doctorName: string; specialty?: string; notes: string;
  aiSummary?: string; productsShown?: string; visitDate: string;
  delegate?: { user: { firstName: string; lastName: string } };
  pharmacy?: { nom: string; ville: string }; laboratory?: { name: string };
}
export interface GPSPosition {
  delegateId: string; name: string; zone: string;
  status: DelegateStatus; latitude: number; longitude: number; timestamp: string;
}

"""
Script Python pour importer les pharmacies depuis le fichier Excel dans Supabase.
Exécuter depuis le dossier backend/ :
  pip install pandas openpyxl psycopg2-binary python-dotenv
  python import_pharmacies.py
"""
import os
import json
import math
import psycopg2
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("?pgbouncer=true","")
EXCEL_FILE   = "../data/LISTE_DES_PHCIES_DES_GROSSISTES_SECTORISATION_PAYS__1_.xlsx"

ZONE_COORDS = {
  "ABOBO":          (5.4200,  -4.0200),
  "ADJAME PLATEAU": (5.3700,  -4.0167),
  "ABIDJAN SUD":    (5.3000,  -4.0100),
  "COCODY":         (5.3767,  -3.9867),
  "YOPOUGON":       (5.3600,  -4.0700),
  "ABENGOUROU":     (6.7297,  -3.4964),
  "ABOISSO":        (5.4667,  -3.2000),
  "ADZOPE":         (6.1000,  -3.8667),
  "AGBOVILLE":      (5.9333,  -4.2167),
  "BOUAKE":         (7.6939,  -5.0319),
  "DALOA":          (6.8744,  -6.4503),
  "DUEKOUE":        (6.7333,  -7.3500),
  "GAGNOA":         (6.1319,  -5.9500),
  "GRABO":          (4.9333,  -7.5000),
  "KORHOGO":        (9.4582,  -5.6297),
  "MAN":            (7.4126,  -7.5533),
  "SANPEDRO":       (4.7485,  -6.6363),
  "SOUBRE":         (5.7833,  -6.6000),
  "YAMOUSSOUKRO":   (6.8276,  -5.2893),
}

ZONE_VILLE = {
  "ABOBO":          "ABIDJAN",
  "ADJAME PLATEAU": "ABIDJAN",
  "ABIDJAN SUD":    "ABIDJAN",
  "COCODY":         "ABIDJAN",
  "YOPOUGON":       "ABIDJAN",
  "ABENGOUROU":     "ABENGOUROU",
  "ABOISSO":        "ABOISSO",
  "ADZOPE":         "ADZOPE",
  "AGBOVILLE":      "AGBOVILLE",
  "BOUAKE":         "BOUAKE",
  "DALOA":          "DALOA",
  "DUEKOUE":        "DUEKOUE",
  "GAGNOA":         "GAGNOA",
  "GRABO":          "GRABO",
  "KORHOGO":        "KORHOGO",
  "MAN":            "MAN",
  "SANPEDRO":       "SAN PEDRO",
  "SOUBRE":         "SOUBRE",
  "YAMOUSSOUKRO":   "YAMOUSSOUKRO",
}

GROSSISTES = ["COPHARMED", "DPCI", "LABOREX", "TEDIS"]

def extract_pharmacies():
    all_sheets = pd.read_excel(EXCEL_FILE, sheet_name=None, header=None)
    pharmacies = []
    
    for zone, df in all_sheets.items():
        zone = zone.strip()
        header_row = None
        for i, row in df.iterrows():
            if any(str(v).strip().upper() == "COPHARMED" for v in row.values if pd.notna(v)):
                header_row = i
                break
        if header_row is None:
            continue
        
        grossiste_cols = {}
        for col_idx, val in enumerate(df.iloc[header_row]):
            if pd.notna(val):
                v = str(val).strip().upper()
                if v in GROSSISTES:
                    grossiste_cols[v] = col_idx
        
        for i in range(header_row + 1, len(df)):
            row = df.iloc[i]
            for g, col in grossiste_cols.items():
                val = row.iloc[col] if col < len(row) else None
                if pd.notna(val) and str(val).strip():
                    name = str(val).strip()
                    if len(name) > 2 and name.upper() not in GROSSISTES:
                        pharmacies.append({"nom": name, "grossiste": g, "zone": zone})
    
    return pharmacies

def import_to_db(pharmacies):
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()
    
    # Récupérer les grossistes
    cur.execute("SELECT id, name FROM \"Grossiste\"")
    grossiste_map = {row[1].upper(): row[0] for row in cur.fetchall()}
    print("Grossistes:", list(grossiste_map.keys()))
    
    # Supprimer les anciennes pharmacies
    cur.execute("DELETE FROM \"Pharmacy\"")
    print("Anciennes pharmacies supprimées")
    
    # Insérer les nouvelles
    inserted = 0
    for idx, p in enumerate(pharmacies):
        coords = ZONE_COORDS.get(p["zone"], (5.3484, -4.0107))
        seed   = idx * 7919
        lat    = coords[0] + (math.sin(seed) * 0.04)
        lng    = coords[1] + (math.cos(seed * 1.3) * 0.04)
        
        grossiste_id = grossiste_map.get(p["grossiste"].upper())
        ville        = ZONE_VILLE.get(p["zone"], p["zone"])
        
        cur.execute("""
            INSERT INTO "Pharmacy" (id, nom, "grossisteId", ville, region, province, latitude, longitude, "isActive", "createdAt")
            VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, true, NOW())
            ON CONFLICT DO NOTHING
        """, (p["nom"], grossiste_id, ville, p["zone"], p["zone"], lat, lng))
        inserted += 1
        
        if inserted % 500 == 0:
            conn.commit()
            print(f"  → {inserted}/{len(pharmacies)} insérées...")
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"\n✅ {inserted} pharmacies importées !")

if __name__ == "__main__":
    print("📊 Extraction des pharmacies depuis Excel...")
    pharmacies = extract_pharmacies()
    print(f"✅ {len(pharmacies)} pharmacies extraites")
    
    print("\n🚀 Import dans Supabase...")
    import_to_db(pharmacies)

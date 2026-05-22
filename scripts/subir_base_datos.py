"""
SCRIPT — Subir base_datos_general.xlsx a Supabase
===================================================
Lee el Excel y sube las métricas clave a rendimiento_base_datos.

INSTRUCCIONES:
1. Poné base_datos_general.xlsx en la misma carpeta
2. Ejecutá: python subir_base_datos.py
"""

import pandas as pd
import math
import os
from supabase import create_client

SUPABASE_URL = "https://cdexhkzjfkvymqnuiugc.supabase.co"
SUPABASE_KEY = "sb_publishable_lIPEnxinoIUAJbf07wNxWQ_PATmr67R"
EXCEL_PATH = os.path.join(os.path.dirname(__file__), "base_datos_general.xlsx")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def safe(val):
    try:
        if val is None: return None
        f = float(val)
        if math.isnan(f) or math.isinf(f): return None
        return round(f, 4)
    except:
        return None

def safe_str(val):
    if val is None or (isinstance(val, float) and math.isnan(val)): return None
    return str(val).strip()

def limpiar_nombre(nombre):
    if pd.isna(nombre): return None
    nombre = str(nombre).strip()
    partes = nombre.rsplit(' ', 1)
    if len(partes) == 2 and partes[1].isdigit() and len(partes[1]) == 4:
        return partes[0].strip()
    return nombre

print("📂 Leyendo base_datos_general.xlsx...")
df = pd.read_excel(EXCEL_PATH)

# Limpiar posiciones
df = df[~df['Pos_principal'].isin(['Desconocida', None])]
df = df[df['Pos_principal'].notna()]
df['Pos_principal'] = df['Pos_principal'].str.strip()

print(f"   {len(df)} jugadores encontrados")
print(f"   Posiciones: {df['Pos_principal'].unique().tolist()}")

# Columnas métricas a subir
METRICAS = [
    'goals', 'assists', 'shots', 'shots_Effectiveness',
    'keyPasses', 'keyPasses_Effectiveness',
    'passesToFinalThird', 'passesToFinalThird_Effectiveness',
    'defensiveDuels', 'defensiveDuels_Effectiveness',
    'offensiveDuels', 'offensiveDuels_Effectiveness',
    'aerialDuels', 'aerialDuels_Effectiveness',
    'fieldAerialDuels', 'fieldAerialDuels_Effectiveness',
    'dribbles', 'dribbles_Effectiveness',
    'dribblesAgainst_Effectiveness',
    'ballRecoveries', 'interceptions',
    'progressivePasses', 'progressivePasses_Effectiveness',
    'touchInBox', 'opponentHalfRecoveries',
    'xgShot', 'xgAssist',
    'gkShotsAgainst', 'gkShotsAgainst_Effectiveness',
    'gkExits', 'gkCleanSheets',
    'gkAerialDuels', 'gkAerialDuels_Effectiveness',
]

print("🚀 Subiendo a Supabase...")
subidos = 0
errores = 0
BATCH = 50

registros = []
for _, row in df.iterrows():
    metricas_dict = {}
    METRICAS_MAP = {
        'goals': 'goals',
        'assists': 'assists',
        'shots': 'shots',
        'shots_Effectiveness': 'shots_effectiveness',
        'keyPasses': 'keypasses',
        'keyPasses_Effectiveness': 'keypasses_effectiveness',
        'passesToFinalThird': 'passestofinalthird',
        'passesToFinalThird_Effectiveness': 'passestofinalthird_effectiveness',
        'defensiveDuels': 'defensiveduels',
        'defensiveDuels_Effectiveness': 'defensiveduels_effectiveness',
        'offensiveDuels': 'offensiveduels',
        'offensiveDuels_Effectiveness': 'offensiveduels_effectiveness',
        'aerialDuels': 'aerialduels',
        'aerialDuels_Effectiveness': 'aerialduels_effectiveness',
        'fieldAerialDuels': 'fieldaerialduels',
        'fieldAerialDuels_Effectiveness': 'fieldaerialduels_effectiveness',
        'dribbles': 'dribbles',
        'dribbles_Effectiveness': 'dribbles_effectiveness',
        'dribblesAgainst_Effectiveness': 'dribblesagainst_effectiveness',
        'ballRecoveries': 'ballrecoveries',
        'interceptions': 'interceptions',
        'progressivePasses': 'progressivepasses',
        'progressivePasses_Effectiveness': 'progressivepasses_effectiveness',
        'touchInBox': 'touchinbox',
        'opponentHalfRecoveries': 'opponenthalfrecoveries',
        'xgShot': 'xgshot',
        'xgAssist': 'xgassist',
        'gkShotsAgainst': 'gkshotsagainst',
        'gkShotsAgainst_Effectiveness': 'gkshotsagainst_effectiveness',
        'gkExits': 'gkexits',
        'gkCleanSheets': 'gkcleansheets',
        'gkAerialDuels': 'gkaerialduels',
        'gkAerialDuels_Effectiveness': 'gkaerialduels_effectiveness',
    }
    for col_excel, col_db in METRICAS_MAP.items():
        if col_excel in df.columns:
            val = safe(row.get(col_excel))
            if val is not None:
                metricas_dict[col_db] = val

    registro = {
        'wy_id': int(row['wyId']) if pd.notna(row.get('wyId')) else None,
        'nombre_completo': limpiar_nombre(row.get('Nombre_Completo')),
        'equipo': safe_str(row.get('teamName')),
        'posicion': safe_str(row.get('Pos_principal')),
        'edad': safe(row.get('Edad')),
        'liga': safe_str(row.get('competitionId_y')),
        'temporada': str(int(row['seasonId_y'])) if pd.notna(row.get('seasonId_y')) else None,
        'minutos': safe(row.get('minutesOnField')),
        'partidos': int(row['matches']) if pd.notna(row.get('matches')) else None,
        'nacionalidad': safe_str(row.get('birthAreaName')),
        'pasaporte': safe_str(row.get('passportAreaName')),
        'pie': safe_str(row.get('foot')),
        'altura': safe(row.get('height')),
        'foto_url': safe_str(row.get('imageDataURL')),
        **metricas_dict,
    }
    registros.append(registro)

for i in range(0, len(registros), BATCH):
    batch = registros[i:i+BATCH]
    try:
        supabase.table('rendimiento_base_datos').insert(batch).execute()
        subidos += len(batch)
        if subidos % 2000 == 0:
            print(f"   ✓ {subidos}/{len(registros)}")
    except Exception as e:
        print(f"   ❌ Error batch {i}: {e}")
        errores += len(batch)

print()
print("=" * 50)
print(f"✅ COMPLETADO — Subidos: {subidos} | Errores: {errores}")
print("=" * 50)

"""
SCRIPT — Subir datos de rendimiento a Supabase
===============================================
Lee el indice_general.xlsx y lo sube a la tabla rendimiento_indice en Supabase.

INSTRUCCIONES:
1. pip install pandas supabase openpyxl
2. Poné el indice_general.xlsx en la misma carpeta que este script
3. Ejecutá: python subir_rendimiento.py
"""

import pandas as pd
import math
import os

# ============================================================
# CONFIGURACIÓN
# ============================================================
SUPABASE_URL = "https://cdexhkzjfkvymqnuiugc.supabase.co"
SUPABASE_KEY = "sb_publishable_lIPEnxinoIUAJbf07wNxWQ_PATmr67R"

# Ruta al Excel — ajustá si está en otro lugar
EXCEL_PATH = os.path.join(os.path.dirname(__file__), "indice_general.xlsx")

# ============================================================
# CONEXIÓN
# ============================================================
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================
# LEER EXCEL
# ============================================================
print("📂 Leyendo indice_general.xlsx...")
df = pd.read_excel(EXCEL_PATH)
print(f"   {len(df)} registros encontrados")

# ============================================================
# LIMPIAR NOMBRE (sacar el año del final)
# ============================================================
def limpiar_nombre(nombre):
    if pd.isna(nombre):
        return None
    nombre = str(nombre).strip()
    # Sacar año del final: "Jugador 2026" → "Jugador"
    partes = nombre.rsplit(' ', 1)
    if len(partes) == 2 and partes[1].isdigit() and len(partes[1]) == 4:
        return partes[0].strip()
    return nombre

def safe(val):
    """Convierte NaN a None para JSON."""
    if val is None:
        return None
    try:
        if math.isnan(float(val)):
            return None
        return val
    except:
        return val

# ============================================================
# MAPEO DE PERCENTILES POR POSICIÓN
# ============================================================
PERCENTILES_POR_POS = {
    "DFC": ['defensiveDuels_percentile', 'defensiveDuels_Effectiveness_percentile',
            'aerialDuels_percentile', 'fieldAerialDuels_Effectiveness_percentile',
            'ballRecoveries_percentile', 'interceptions_percentile',
            'progressivePasses_percentile', 'offensiveDuels_Effectiveness_percentile'],
    "ARQ": ['gkShotsAgainst_percentile', 'gkShotsAgainst_Effectiveness_percentile',
            'gkExits_percentile', 'gkCleanSheets_percentile',
            'gkAerialDuels_percentile', 'gkAerialDuels_Effectiveness_percentile'],
    "LAT IZQ": ['defensiveDuels_Effectiveness_percentile', 'interceptions_percentile',
                'dribbles_Effectiveness_percentile', 'keyPasses_percentile',
                'passesToFinalThird_Effectiveness_percentile', 'offensiveDuels_Effectiveness_percentile'],
    "LAT DER": ['defensiveDuels_Effectiveness_percentile', 'interceptions_percentile',
                'dribbles_Effectiveness_percentile', 'keyPasses_percentile',
                'passesToFinalThird_Effectiveness_percentile', 'offensiveDuels_Effectiveness_percentile'],
    "MED": ['defensiveDuels_Effectiveness_percentile', 'ballRecoveries_percentile',
            'interceptions_percentile', 'passesToFinalThird_Effectiveness_percentile',
            'keyPasses_percentile', 'touchInBox_percentile', 'shots_Effectiveness_percentile'],
    "MED MIX": ['ballRecoveries_percentile', 'interceptions_percentile',
                'keyPasses_percentile', 'goals_percentile',
                'passesToFinalThird_Effectiveness_percentile', 'dribbles_Effectiveness_percentile'],
    "MED OF": ['ballRecoveries_percentile', 'keyPasses_percentile', 'goals_percentile',
               'touchInBox_percentile', 'shots_Effectiveness_percentile',
               'dribbles_Effectiveness_percentile'],
    "EXTR": ['opponentHalfRecoveries_percentile', 'keyPasses_percentile', 'goals_percentile',
             'touchInBox_percentile', 'shots_Effectiveness_percentile',
             'dribbles_Effectiveness_percentile'],
    "DEL": ['offensiveDuels_Effectiveness_percentile', 'shots_percentile',
            'shots_Effectiveness_percentile', 'goals_percentile',
            'dribbles_Effectiveness_percentile', 'keyPasses_percentile'],
}

# ============================================================
# PROCESAR Y SUBIR
# ============================================================
print("🚀 Subiendo a Supabase...")
subidos = 0
errores = 0
BATCH = 100

registros = []

for _, row in df.iterrows():
    pos = str(row.get('Pos_principal', '')).strip()
    percentiles_pos = PERCENTILES_POR_POS.get(pos, [])

    # Construir dict de percentiles disponibles
    percentiles_dict = {}
    for col in percentiles_pos:
        if col in df.columns:
            percentiles_dict[col.replace('_percentile', '')] = safe(row.get(col))

    registro = {
        'nombre_completo': limpiar_nombre(row.get('Nombre_Completo')),
        'equipo': safe(row.get('teamName')),
        'posicion': pos,
        'edad': safe(row.get('Edad')),
        'partidos': int(row['matches']) if pd.notna(row.get('matches')) else None,
        'minutos': safe(row.get('minutesOnField')),
        'liga': safe(row.get('competitionId_y')),
        'temporada': str(safe(row.get('seasonId_y', ''))),
        'indice_total': safe(row.get('Final Score')),
        'score_defensivo': safe(row.get('Score Acciones Defensivas')),
        'score_ofensivo': safe(row.get('Score Acciones Ofensivas')),
        'nacionalidad': safe(row.get('birthAreaName')),
        'pasaporte': safe(row.get('passportAreaName')),
        'pie': safe(row.get('foot')),
        'altura': safe(row.get('height')),
        'percentiles': percentiles_dict,
    }
    registros.append(registro)

# Subir en batches
for i in range(0, len(registros), BATCH):
    batch = registros[i:i+BATCH]
    try:
        supabase.table('rendimiento_indice_datos').insert(batch).execute()
        subidos += len(batch)
        print(f"   ✓ {subidos}/{len(registros)} registros subidos")
    except Exception as e:
        print(f"   ❌ Error en batch {i}: {e}")
        errores += len(batch)

print()
print("=" * 50)
print(f"✅ COMPLETADO — Subidos: {subidos} | Errores: {errores}")
print("=" * 50)

"""
SCRIPT — Subir reportes IA a Supabase
======================================
Lee el conclusiones_jugadores_totales.csv y lo sube a Supabase.

INSTRUCCIONES:
1. Poné el conclusiones_jugadores_totales.csv en la misma carpeta
2. Ejecutá: python subir_reportes_ia.py
"""

import pandas as pd
import math
import os
from supabase import create_client

SUPABASE_URL = "https://cdexhkzjfkvymqnuiugc.supabase.co"
SUPABASE_KEY = "sb_publishable_lIPEnxinoIUAJbf07wNxWQ_PATmr67R"

CSV_PATH = os.path.join(os.path.dirname(__file__), "conclusiones_jugadores_totales.csv")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def safe_int(val):
    try:
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return None
        return int(val)
    except:
        return None

def safe_float(val):
    try:
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return None
        return float(val)
    except:
        return None

def limpiar_nombre(nombre):
    """Saca el año del final del nombre si existe."""
    if pd.isna(nombre):
        return None
    nombre = str(nombre).strip()
    partes = nombre.rsplit(' ', 1)
    if len(partes) == 2 and partes[1].isdigit() and len(partes[1]) == 4:
        return partes[0].strip()
    return nombre

print("📂 Leyendo CSV...")
df = pd.read_csv(CSV_PATH, encoding='utf-8')
print(f"   {len(df)} reportes encontrados")

registros = []
for _, row in df.iterrows():
    registros.append({
        'nombre': limpiar_nombre(row.get('Nombre')),
        'club': str(row.get('Club', '')).strip() if pd.notna(row.get('Club')) else None,
        'posicion': str(row.get('Posición', '')).strip() if pd.notna(row.get('Posición')) else None,
        'minutos': safe_float(row.get('Minutos')),
        'competencia': str(row.get('Competencia', '')).strip() if pd.notna(row.get('Competencia')) else None,
        'temporada': str(int(row['Temporada'])) if pd.notna(row.get('Temporada')) else None,
        'reporte': str(row.get('Reporte', '')).strip() if pd.notna(row.get('Reporte')) else None,
        'wy_id': safe_int(row.get('wyId')),
        'current_team_id': safe_int(row.get('currentTeamId')),
        'competition_id_x': safe_int(row.get('competitionId_x')),
    })

print("🚀 Subiendo a Supabase...")
subidos = 0
errores = 0
BATCH = 50

for i in range(0, len(registros), BATCH):
    batch = registros[i:i+BATCH]
    try:
        supabase.table('reportes_ia').insert(batch).execute()
        subidos += len(batch)
        if subidos % 500 == 0:
            print(f"   ✓ {subidos}/{len(registros)} subidos")
    except Exception as e:
        print(f"   ❌ Error en batch {i}: {e}")
        errores += len(batch)

print()
print("=" * 50)
print(f"✅ COMPLETADO — Subidos: {subidos} | Errores: {errores}")
print("=" * 50)

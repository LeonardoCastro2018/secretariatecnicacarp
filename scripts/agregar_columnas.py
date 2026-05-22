"""
SCRIPT — Agregar columnas faltantes a rendimiento_base_datos
=============================================================
Agrega: crosses, successfulCrosses, longPasses, longPasses_Effectiveness, fouls
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

def limpiar_nombre(nombre):
    if pd.isna(nombre): return None
    nombre = str(nombre).strip()
    partes = nombre.rsplit(' ', 1)
    if len(partes) == 2 and partes[1].isdigit() and len(partes[1]) == 4:
        return partes[0].strip()
    return nombre

print("📂 Leyendo base_datos_general.xlsx...")
df = pd.read_excel(EXCEL_PATH)
df = df[df['Pos_principal'].notna()]
df['Pos_principal'] = df['Pos_principal'].str.strip()
print(f"   {len(df)} jugadores encontrados")

NUEVAS_METRICAS = {
    'crosses':                 'crosses',
    'successfulCrosses':       'successfulcrosses',
    'longPasses':              'longpasses',
    'longPasses_Effectiveness':'longpasses_effectiveness',
    'fouls':                   'fouls',
}

print("🚀 Actualizando registros en Supabase...")
actualizados = 0
errores = 0

for _, row in df.iterrows():
    nombre = limpiar_nombre(row.get('Nombre_Completo'))
    if not nombre:
        continue

    update_dict = {}
    for col_excel, col_db in NUEVAS_METRICAS.items():
        val = safe(row.get(col_excel))
        if val is not None:
            update_dict[col_db] = val

    if not update_dict:
        continue

    try:
        supabase.table('rendimiento_base_datos')\
            .update(update_dict)\
            .eq('nombre_completo', nombre)\
            .execute()
        actualizados += 1
        if actualizados % 1000 == 0:
            print(f"   ✓ {actualizados}/{len(df)}")
    except Exception as e:
        print(f"   ❌ Error {nombre}: {e}")
        errores += 1

print()
print("=" * 50)
print(f"✅ COMPLETADO — Actualizados: {actualizados} | Errores: {errores}")
print("=" * 50)

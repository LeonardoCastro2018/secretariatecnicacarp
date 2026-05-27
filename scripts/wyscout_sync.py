"""
WYSCOUT SYNC — Secretaría Técnica CARP
=======================================
Descarga stats por 90min de Wyscout API y actualiza Supabase automáticamente.
Reemplaza el flujo manual: Wyscout → Excel → Power BI

VARIABLES DE ENTORNO REQUERIDAS:
  WYS_API_KEY       → client ID de Wyscout
  WYS_API_SECRET    → secret de Wyscout
  SUPABASE_URL      → URL del proyecto Supabase
  SUPABASE_KEY      → service_role key (no la anon key)

USO:
  pip install requests pandas supabase
  python wyscout_sync.py
"""

import os
import re
import zlib
import base64
import logging
from datetime import datetime

import requests
import pandas as pd
from supabase import create_client, Client

# ─────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

HOST       = "https://apirest.wyscout.com/v3/"
API_KEY    = os.environ["WYS_API_KEY"]
API_SECRET = os.environ["WYS_API_SECRET"]
SUPA_URL   = os.environ["SUPABASE_URL"]
SUPA_KEY   = os.environ["SUPABASE_KEY"]   # service_role key para poder escribir

# Mínimo de minutos jugados para incluir al jugador
MIN_MINUTOS = 300

# ─────────────────────────────────────────
# LIGAS Y TEMPORADAS A SINCRONIZAR
# Descomentá las que querés actualizar cada semana
# ─────────────────────────────────────────
LISTADO_COMPETICIONES = [
    {"compId": "146",  "seasonId": "192277", "nombre": "ARG_A26"},
    {"compId": "879",  "seasonId": "192353", "nombre": "URU_A26"},
    {"compId": "295",  "seasonId": "192291", "nombre": "COL_A26"},
    {"compId": "284",  "seasonId": "192318", "nombre": "CHI_A26"},
    {"compId": "255",  "seasonId": "192251", "nombre": "BRA_A26"},
    {"compId": "256",  "seasonId": "192290", "nombre": "BRA_B26"},
    {"compId": "685",  "seasonId": "192287", "nombre": "PAR_A26"},
    {"compId": "1601", "seasonId": "192303", "nombre": "ARG_RES_26"},
    {"compId": "143",  "seasonId": "192343", "nombre": "ARG_NB_26"},
    {"compId": "339",  "seasonId": "192364", "nombre": "ECU_A26"},
    {"compId": "886",  "seasonId": "192290", "nombre": "VEN_A26"},
    {"compId": "82",   "seasonId": "192323", "nombre": "Libertadores_26"},
    {"compId": "84",   "seasonId": "192404", "nombre": "Sudamericana_26"},
    # Europeas
    # {"compId": "524",  "seasonId": "191623", "nombre": "ITA_A26"},
    # {"compId": "364",  "seasonId": "191622", "nombre": "ING_A26"},
    # {"compId": "795",  "seasonId": "191659", "nombre": "ESP_A26"},
    # {"compId": "412",  "seasonId": "191683", "nombre": "FRA_A26"},
    # {"compId": "426",  "seasonId": "191661", "nombre": "ALE_A26"},
]

MAPEO_LIGAS = {
    "146": "Argentina 1A", "295": "Colombia 1A", "296": "Colombia 1B",
    "879": "Uruguay 1A",   "284": "Chile 1A",    "255": "Brasil A",
    "256": "Brasil B",     "685": "Paraguay 1A", "1601": "Argentina Reserva",
    "142": "Primera B",    "143": "Argentina NB","339": "Ecuador 1A",
    "617": "México 1A",    "869": "USA MLS",     "82":  "Copa Libertadores",
    "84":  "Copa Sudamericana", "524": "Italia A","364": "Inglaterra A",
    "358": "Inglaterra B", "795": "España A",    "797": "España B",
    "412": "Francia A",    "426": "Alemania A",  "198": "Bélgica A",
    "635": "Países Bajos", "448": "Grecia",      "508": "Israel",
    "602": "Malasia",      "688": "Perú",        "886": "Venezuela 1A",
    "88":  "Sudamericano U20", "86": "Sudamericano U17", "729": "Rusia 1A",
    "302": "Croacia 1A",   "90": "Eliminatorias","716": "Qatar",
    "746": "Arabia",       "852": "Turquía",     "867": "Emiratos Árabes",
    "707": "Portugal A",   "323": "R.Checa 1A",  "741": "Arabia Saudita",
}

TEMPORADA_POR_SEASON_ID = {
    191377: "2025", 189488: "2024", 188660: "2023", 190579: "2024",
    190666: "2024", 191399: "2025", 189534: "2024", 191321: "2025",
    189555: "2024", 190592: "2025", 189554: "2024", 190724: "2024",
    190664: "2025", 189598: "2024", 189708: "2024", 190629: "2025",
    189529: "2024", 190653: "2025", 189573: "2024", 190565: "2025",
    189545: "2024", 190570: "2025", 189585: "2024", 191431: "2025",
    189744: "2024", 190663: "2025", 191307: "2025", 189497: "2024",
    191359: "2025", 191360: "2025", 189602: "2024", 190703: "2025",
    191351: "2025", 189533: "2024", 191347: "2025", 189600: "2024",
    189565: "2024", 190560: "2025", 189618: "2024", 191362: "2025",
    189630: "2024", 190578: "2025", 189518: "2024", 189909: "2025",
    188933: "2024", 190023: "2025", 189973: "2025", 188994: "2024",
    190084: "2025", 189046: "2024", 189908: "2025", 188989: "2024",
    189952: "2025", 188986: "2024", 189974: "2025", 190010: "2025",
    189012: "2024", 189013: "2024", 189972: "2025", 189971: "2024",
    190036: "2025", 189970: "2025", 189976: "2025", 188972: "2024",
    189950: "2025", 188982: "2024", 190011: "2025", 190105: "2025",
    190848: "2025", 189594: "2025", 189938: "2025", 190827: "2025",
    191623: "2026", 191600: "2026", 191622: "2026", 191637: "2026",
    191659: "2026", 191660: "2026", 191683: "2026", 191860: "2026",
    191615: "2026", 191645: "2026", 190285: "2026", 191613: "2026",
    192038: "2025", 190226: "2025", 190065: "2025", 191894: "2026",
    191618: "2026", 192291: "2026", 192277: "2026", 192251: "2026",
    191661: "2026", 191617: "2026", 191676: "2026", 191794: "2026",
    191705: "2026", 191806: "2026", 192318: "2026", 192287: "2026",
    192353: "2026", 192303: "2026", 192290: "2026", 192343: "2026",
    192364: "2026", 192502: "2026", 192361: "2026", 191835: "2026",
    192323: "2026", 192404: "2026", 190715: "2026",
}

MAPEO_POSICIONES = {
    "Goalkeeper": "ARQ",
    "Centre Back": "DFC", "Right Centre Back": "DFC", "Left Centre Back": "DFC",
    "Right Centre Back (3 at the back)": "DFC", "Left Centre Back (3 at the back)": "DFC",
    "Right Back": "LAT DER", "Right Back (5 at the back)": "LAT DER", "Right Wingback": "LAT DER",
    "Left Back": "LAT IZQ", "Left Back (5 at the back)": "LAT IZQ", "Left Wingback": "LAT IZQ",
    "Defensive Midfielder": "MED", "Right Defensive Midfielder": "MED", "Left Defensive Midfielder": "MED",
    "Right Centre Midfielder": "MED MIX", "Left Centre Midfielder": "MED MIX",
    "Attacking Midfielder": "MED OF", "Right Attacking Midfielder": "MED OF", "Left Attacking Midfielder": "MED OF",
    "Right Winger": "EXTR", "Left Winger": "EXTR",
    "Right Wing Forward": "DEL", "Left Wing Forward": "DEL", "Striker": "DEL",
}

# Pesos por posición para el índice (igual que se usa en la plataforma)
PESOS_POR_POSICION = {
    "ARQ": {
        "gkSaves": 0.30, "gkShotsAgainst_Effectiveness": 0.25,
        "gkCleanSheets": 0.15, "gkExitsClaimed": 0.10,
        "aerialDuelsWon": 0.10, "defensiveDuels_Effectiveness": 0.10,
    },
    "DFC": {
        "defensiveDuels_Effectiveness": 0.25, "aerialDuelsWon": 0.20,
        "interceptions": 0.20, "newDefensiveDuelsWon": 0.15,
        "forwardPasses_Effectiveness": 0.10, "progressivePasses": 0.10,
    },
    "LAT DER": {
        "defensiveDuels_Effectiveness": 0.20, "interceptions": 0.15,
        "keyPasses_Effectiveness": 0.20, "crosses": 0.15,
        "progressivePasses": 0.15, "newSuccessfulDribbles": 0.15,
    },
    "LAT IZQ": {
        "defensiveDuels_Effectiveness": 0.20, "interceptions": 0.15,
        "keyPasses_Effectiveness": 0.20, "crosses": 0.15,
        "progressivePasses": 0.15, "newSuccessfulDribbles": 0.15,
    },
    "MED": {
        "defensiveDuels_Effectiveness": 0.25, "interceptions": 0.20,
        "progressivePasses": 0.20, "forwardPasses_Effectiveness": 0.20,
        "recoveries": 0.15,
    },
    "MED MIX": {
        "progressivePasses": 0.20, "keyPasses_Effectiveness": 0.20,
        "defensiveDuels_Effectiveness": 0.20, "forwardPasses_Effectiveness": 0.20,
        "newSuccessfulDribbles": 0.20,
    },
    "MED OF": {
        "keyPasses_Effectiveness": 0.25, "goals": 0.20,
        "assists": 0.20, "newSuccessfulDribbles": 0.20,
        "shots_Effectiveness": 0.15,
    },
    "EXTR": {
        "newSuccessfulDribbles": 0.25, "keyPasses_Effectiveness": 0.20,
        "goals": 0.20, "assists": 0.15, "crosses": 0.10,
        "shots_Effectiveness": 0.10,
    },
    "DEL": {
        "goals": 0.30, "shots_Effectiveness": 0.25,
        "assists": 0.15, "newSuccessfulDribbles": 0.15,
        "aerialDuelsWon": 0.15,
    },
}


# ─────────────────────────────────────────
# WYSCOUT API
# ─────────────────────────────────────────

def _auth_header() -> dict:
    token = base64.b64encode(f"{API_KEY}:{API_SECRET}".encode()).decode()
    return {"Authorization": f"Basic {token}"}

def query_api(endpoint: str, params: dict = None) -> dict | None:
    url = f"{HOST}{endpoint}"
    try:
        r = requests.get(url, params=params, headers=_auth_header(), timeout=30)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        log.warning(f"API error {endpoint}: {e}")
        return None

def get_players_by_season(season_id: int, comp_id: str) -> pd.DataFrame:
    frames = []
    page = 1
    while True:
        data = query_api(f"seasons/{season_id}/players", {"limit": 100, "page": page, "compId": comp_id})
        if not data or "players" not in data:
            break
        df = pd.DataFrame(data["players"])
        df["seasonId"] = season_id

        for campo, nuevo in [("birthArea", "birthAreaName"), ("passportArea", "passportAreaName")]:
            if campo in df.columns:
                expanded = pd.json_normalize(df[campo]).rename(columns={"name": nuevo})
                df = df.drop(columns=[campo]).join(expanded[[nuevo]])

        if "role" in df.columns:
            role_exp = pd.json_normalize(df["role"]).rename(columns={"name": "roleName"})
            df = df.drop(columns=["role"]).join(role_exp[["roleName"]])

        frames.append(df)
        if data.get("meta", {}).get("page_count", 0) <= page:
            break
        page += 1

    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

def get_advanced_stats(players_df: pd.DataFrame, comp_id: str) -> pd.DataFrame:
    rows = []
    total = len(players_df)
    for i, (_, p) in enumerate(players_df.iterrows(), 1):
        log.info(f"  Stats jugador {i}/{total}: {p.get('wyId')}")
        data = query_api(f"players/{p['wyId']}/advancedstats",
                         {"compId": comp_id, "seasonId": p["seasonId"]})
        if not data:
            continue
        positions = data.get("positions", [])
        pos_name = positions[0].get("position", {}).get("name", "Unknown") if positions else "Unknown"
        rows.append({
            "playerId": p["wyId"],
            "competitionId": comp_id,
            "seasonId": p["seasonId"],
            "positions": pos_name,
            **data.get("total", {}),
            **data.get("average", {}),
        })
    return pd.DataFrame(rows)

def add_effectiveness(stats_df: pd.DataFrame) -> pd.DataFrame:
    """Calcula métricas de efectividad (Won/Total o Success/Total)."""
    # Par Won
    for col in stats_df.columns:
        if col.endswith("Won"):
            base = col[:-3]
            if base in stats_df.columns:
                stats_df[f"{base}_Effectiveness"] = (
                    stats_df[col] / stats_df[base] * 100
                ).fillna(0).round(2)

    # Pares específicos
    pares = {
        "shots": "shotsOnTarget",
        "smartPasses": "successfulSmartPasses",
        "passesToFinalThird": "successfulPassesToFinalThird",
        "forwardPasses": "successfulForwardPasses",
        "backPasses": "successfulBackPasses",
        "throughPasses": "successfulThroughPasses",
        "keyPasses": "successfulKeyPasses",
        "verticalPasses": "successfulVerticalPasses",
        "longPasses": "successfulLongPasses",
        "attackingActions": "successfulAttackingActions",
        "linkupPlays": "successfulLinkupPlays",
        "progressivePasses": "successfulProgressivePasses",
        "slidingTackles": "successfulSlidingTackles",
        "defensiveDuels": "newDefensiveDuelsWon",
        "dribbles": "newSuccessfulDribbles",
        "gkShotsAgainst": "gkSaves",
    }
    for total_col, success_col in pares.items():
        if total_col in stats_df.columns and success_col in stats_df.columns:
            stats_df[f"{total_col}_Effectiveness"] = (
                stats_df[success_col] / stats_df[total_col] * 100
            ).fillna(0).round(2)

    return stats_df

def add_team_data(players_df: pd.DataFrame) -> pd.DataFrame:
    if "currentTeamId" not in players_df.columns:
        return players_df
    team_cache = {}
    for tid in players_df["currentTeamId"].dropna().unique():
        data = query_api(f"teams/{int(tid)}")
        if data:
            team_cache[tid] = {"teamName": data.get("name", ""), "teamImage": data.get("imageDataURL", "")}
    players_df["teamName"]  = players_df["currentTeamId"].map(lambda t: team_cache.get(t, {}).get("teamName", ""))
    players_df["teamImage"] = players_df["currentTeamId"].map(lambda t: team_cache.get(t, {}).get("teamImage", ""))
    return players_df

def map_positions(df: pd.DataFrame) -> pd.DataFrame:
    def split_pos(s):
        if not isinstance(s, str):
            return [None, None, None]
        parts = [re.sub(r"\(.*?\)", "", p).strip() for p in s.split(",")]
        return (parts + [None, None, None])[:3]

    pos_data = df["positions"].apply(split_pos)
    df[["POS1", "POS2", "POS3"]] = pd.DataFrame(pos_data.tolist(), index=df.index)
    df["Pos_principal"] = df["POS1"].map(MAPEO_POSICIONES).fillna("Desconocida")
    return df


# ─────────────────────────────────────────
# JUGADORES PROMEDIO POR POSICIÓN
# ─────────────────────────────────────────

def crear_jugadores_promedio(df: pd.DataFrame, comp_id: str, season_id: int, temporada: str) -> pd.DataFrame:
    def last2(s):
        s = str(s)
        if "/" in s:
            s = s.split("/")[-1]
        return s[-2:] if s[-2:].isdigit() else s

    codigo_pais = {
        "Argentina 1A": "ARG", "Argentina NB": "ARNB", "Colombia 1A": "COL",
        "Colombia 1B": "COLB", "Uruguay 1A": "URU", "Chile 1A": "CHI",
        "Brasil A": "BRA", "Brasil B": "BRB", "Paraguay 1A": "PAR",
        "Argentina Reserva": "RES", "Ecuador 1A": "ECU", "México 1A": "MEX",
        "USA MLS": "USA", "Venezuela 1A": "VEN", "Copa Libertadores": "LIB",
        "Copa Sudamericana": "SUD", "Italia A": "ITA", "Inglaterra A": "ENG",
        "Inglaterra B": "ENB", "España A": "ESP", "España B": "ESB",
        "Francia A": "FRA", "Alemania A": "ALE", "Bélgica A": "BEL",
        "Países Bajos": "HOL", "Grecia": "GRE", "Israel": "ISR",
        "Portugal A": "POR",
    }

    liga = MAPEO_LIGAS.get(str(comp_id), "Desconocida")
    sufijo = codigo_pais.get(liga, "X")
    t2 = last2(temporada)

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    excluir = {"wyId", "playerId", "currentTeamId", "competitionId_x",
               "competitionId_y", "seasonId_x", "seasonId_y", "competitionId"}
    numeric_cols = [c for c in numeric_cols if c not in excluir]

    promedios = df.groupby("Pos_principal")[numeric_cols].mean().reset_index()

    def stable_id(pos):
        key = f"MED|{comp_id}|{season_id}|{t2}|{sufijo}|{pos}"
        return -int(zlib.crc32(key.encode()) & 0xFFFFFFFF)

    promedios["wyId"]           = promedios["Pos_principal"].apply(stable_id)
    promedios["playerId"]       = promedios["wyId"]
    promedios["Nombre_Completo"]= promedios["Pos_principal"].apply(lambda p: f"MED_{p}_{t2}_{sufijo}")
    promedios["firstName"]      = None
    promedios["lastName"]       = None
    promedios["seasonId_y"]     = season_id
    promedios["competitionId_y"]= liga
    promedios = promedios.round(2)
    return promedios


# ─────────────────────────────────────────
# CÁLCULO DE PERCENTILES E ÍNDICE
# ─────────────────────────────────────────

def calcular_percentiles_e_indice(df: pd.DataFrame) -> pd.DataFrame:
    """
    Para cada posición, calcula percentiles de las métricas clave
    y genera un índice total ponderado (0-100).
    Agrega columnas: indice_total, score_defensivo, score_ofensivo, percentiles (JSON).
    """
    from scipy.stats import percentileofscore  # pip install scipy

    resultados = []

    for pos, pesos in PESOS_POR_POSICION.items():
        subset = df[df["Pos_principal"] == pos].copy()
        if subset.empty:
            continue

        metricas_disponibles = {m: p for m, p in pesos.items() if m in subset.columns}
        if not metricas_disponibles:
            continue

        # Normalizar pesos al 100%
        total_peso = sum(metricas_disponibles.values())
        pesos_norm = {m: p / total_peso for m, p in metricas_disponibles.items()}

        # Percentil de cada métrica dentro de la posición
        for metrica in metricas_disponibles:
            col_vals = subset[metrica].fillna(0).tolist()
            subset[f"_pct_{metrica}"] = subset[metrica].fillna(0).apply(
                lambda v: round(percentileofscore(col_vals, v, kind="rank"), 1)
            )

        # Índice total ponderado
        subset["indice_total"] = sum(
            subset[f"_pct_{m}"] * p for m, p in pesos_norm.items()
        ).round(1)

        # Scores separados (defensivo / ofensivo) — split simple por tipo de métrica
        metricas_def = {"defensiveDuels_Effectiveness", "interceptions", "newDefensiveDuelsWon",
                        "aerialDuelsWon", "recoveries", "gkSaves", "gkShotsAgainst_Effectiveness",
                        "gkCleanSheets", "gkExitsClaimed", "slidingTackles_Effectiveness"}
        metricas_of  = {"goals", "assists", "shots_Effectiveness", "keyPasses_Effectiveness",
                        "newSuccessfulDribbles", "crosses", "progressivePasses",
                        "forwardPasses_Effectiveness", "smartPasses_Effectiveness"}

        def sub_score(tipo_metricas):
            m_sub = {m: p for m, p in pesos_norm.items() if m in tipo_metricas}
            if not m_sub:
                return 0
            t = sum(m_sub.values())
            return sum(subset[f"_pct_{m}"] * p / t for m, p in m_sub.items()).round(1)

        subset["score_defensivo"] = sub_score(metricas_def)
        subset["score_ofensivo"]  = sub_score(metricas_of)

        # Construir JSON de percentiles para guardar en Supabase
        pct_cols = [f"_pct_{m}" for m in metricas_disponibles]
        subset["percentiles"] = subset.apply(
            lambda row: {m: row[f"_pct_{m}"] for m in metricas_disponibles}, axis=1
        )

        # Limpiar columnas temporales
        subset = subset.drop(columns=pct_cols)
        resultados.append(subset)

    if not resultados:
        return df

    return pd.concat(resultados, ignore_index=True)


# ─────────────────────────────────────────
# SUPABASE UPLOAD
# ─────────────────────────────────────────

def upload_to_supabase(df: pd.DataFrame, comp_id: str, season_id: str, liga: str, temporada: str):
    supabase: Client = create_client(SUPA_URL, SUPA_KEY)

    # 1) Borrar registros anteriores de ESTA liga + temporada
    log.info(f"  Eliminando datos anteriores: liga={liga}, temporada={temporada}")
    supabase.table("rendimiento_base_datos").delete().eq("liga", liga).eq("temporada", temporada).execute()

    # 2) Preparar registros
    cols_supabase = [
        "nombre_completo", "equipo", "posicion", "edad", "partidos", "minutos",
        "liga", "temporada", "nacionalidad", "pasaporte", "pie", "altura",
        # Stats clave (todas las que existan)
        "goals", "assists", "shots", "shotsOnTarget", "keyPasses", "successfulKeyPasses",
        "dribbles", "newSuccessfulDribbles", "defensiveDuels", "newDefensiveDuelsWon",
        "aerialDuels", "aerialDuelsWon", "interceptions", "recoveries", "crosses",
        "progressivePasses", "successfulProgressivePasses", "forwardPasses", "successfulForwardPasses",
        "gkSaves", "gkShotsAgainst", "gkCleanSheets", "gkExitsClaimed",
        # Effectividad
        "shots_Effectiveness", "keyPasses_Effectiveness", "defensiveDuels_Effectiveness",
        "forwardPasses_Effectiveness", "gkShotsAgainst_Effectiveness",
        "dribbles_Effectiveness", "progressivePasses_Effectiveness",
        # Índice calculado
        "indice_total", "score_defensivo", "score_ofensivo", "percentiles",
    ]

    mapeo_cols = {
        "Nombre_Completo": "nombre_completo",
        "teamName": "equipo",
        "Pos_principal": "posicion",
        "Edad": "edad",
        "matches": "partidos",
        "minutesOnField": "minutos",
        "birthAreaName": "nacionalidad",
        "passportAreaName": "pasaporte",
        "foot": "pie",
        "height": "altura",
        "competitionId_y": "liga",
        "seasonId_y_label": "temporada",
    }

    df_upload = df.rename(columns=mapeo_cols)
    df_upload["temporada"] = temporada
    df_upload["liga"]      = liga

    # Convertir percentiles a dict serializable
    if "percentiles" in df_upload.columns:
        df_upload["percentiles"] = df_upload["percentiles"].apply(
            lambda x: x if isinstance(x, dict) else {}
        )

    # Solo filas con suficientes minutos
    if "minutos" in df_upload.columns:
        df_upload = df_upload[df_upload["minutos"].fillna(0) >= MIN_MINUTOS]

    # Construir lista de dicts con solo las columnas que existen
    records = []
    for _, row in df_upload.iterrows():
        record = {}
        for col in cols_supabase:
            if col in df_upload.columns:
                val = row[col]
                # Limpiar NaN
                if pd.isna(val) if not isinstance(val, dict) else False:
                    val = None
                record[col] = val
        records.append(record)

    # 3) Insertar en lotes de 500
    batch_size = 500
    total_insertados = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        supabase.table("rendimiento_base_datos").insert(batch).execute()
        total_insertados += len(batch)
        log.info(f"  Insertados {total_insertados}/{len(records)} registros")

    log.info(f"  ✅ Upload completo: {total_insertados} jugadores — {liga} {temporada}")


# ─────────────────────────────────────────
# PIPELINE PRINCIPAL
# ─────────────────────────────────────────

def procesar_liga(comp: dict):
    comp_id   = comp["compId"]
    season_id = int(comp["seasonId"])
    liga      = MAPEO_LIGAS.get(str(comp_id), f"Liga_{comp_id}")
    temporada = TEMPORADA_POR_SEASON_ID.get(season_id, str(season_id))

    log.info(f"══════════════════════════════════════════")
    log.info(f"Procesando: {liga} — Temporada {temporada}")
    log.info(f"══════════════════════════════════════════")

    # 1. Jugadores
    log.info("1/6 Descargando jugadores...")
    players_df = get_players_by_season(season_id, comp_id)
    if players_df.empty:
        log.warning(f"Sin jugadores para {liga}. Se omite.")
        return
    players_df["competitionId"] = comp_id
    log.info(f"   → {len(players_df)} jugadores encontrados")

    # 2. Stats avanzadas
    log.info("2/6 Descargando stats avanzadas...")
    stats_df = get_advanced_stats(players_df, comp_id)
    if stats_df.empty:
        log.warning("Sin stats avanzadas. Se omite.")
        return

    # 3. Efectividad
    log.info("3/6 Calculando efectividad...")
    stats_df = add_effectiveness(stats_df)

    # 4. Team data + merge
    log.info("4/6 Agregando datos de equipo...")
    players_df = add_team_data(players_df)
    merged = players_df.merge(stats_df, left_on="wyId", right_on="playerId", how="inner")

    # 5. Posiciones + nombre + edad
    log.info("5/6 Procesando posiciones y datos personales...")
    merged = map_positions(merged)
    merged["Nombre_Completo"] = merged["firstName"].fillna("") + " " + merged["lastName"].fillna("")
    now = datetime.now()
    merged["Edad"] = merged["birthDate"].apply(
        lambda x: now.year - pd.to_datetime(x).year - (
            (now.month, now.day) < (pd.to_datetime(x).month, pd.to_datetime(x).day)
        ) if pd.notnull(x) else None
    )
    merged["competitionId_y"] = liga
    merged["seasonId_y"]      = season_id

    # Jugadores promedio
    promedios = crear_jugadores_promedio(merged, comp_id, season_id, temporada)
    combined = pd.concat([merged, promedios], ignore_index=True, sort=False)

    # 6. Percentiles e índice
    log.info("6/6 Calculando percentiles e índice...")
    try:
        combined = calcular_percentiles_e_indice(combined)
    except ImportError:
        log.warning("scipy no instalado — se omite cálculo de percentiles. Ejecutá: pip install scipy")

    # 7. Upload Supabase
    log.info("7/6 Subiendo a Supabase...")
    upload_to_supabase(combined, comp_id, comp["seasonId"], liga, temporada)


def main():
    log.info("🚀 Wyscout Sync — Inicio")
    log.info(f"   Ligas a procesar: {len(LISTADO_COMPETICIONES)}")

    errores = []
    for comp in LISTADO_COMPETICIONES:
        try:
            procesar_liga(comp)
        except Exception as e:
            log.error(f"Error en {comp['nombre']}: {e}", exc_info=True)
            errores.append(comp["nombre"])

    log.info("══════════════════════════════════════════")
    log.info(f"✅ Sync finalizado. Ligas OK: {len(LISTADO_COMPETICIONES) - len(errores)}")
    if errores:
        log.warning(f"❌ Ligas con error: {', '.join(errores)}")


if __name__ == "__main__":
    main()

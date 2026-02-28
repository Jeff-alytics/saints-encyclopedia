"""Parser for FootballDB box score pages.

Used as a fallback when Pro Football Archives doesn't have box score data
(e.g., 2025 season, some preseason games).

FootballDB structure: separate tables per team per stat category.
Team tables come in pairs: away team first (even index), home team second (odd).
"""

import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://www.footballdb.com"

# Table identification by header columns
TABLE_TYPES = {
    # (header_col_1, header_col_2, ...): (stat_type, col_mapping)
    "passing": {
        "match": ("Att", "Cmp", "Yds", "YPA", "TD", "Int"),
        "table": "player_passing",
        "cols": {
            "Att": "att", "Cmp": "com", "Yds": "yds", "TD": "td",
            "Int": "int_thrown", "Lg": "lg", "Sack": "sacked",
            "Loss": "sacked_yds", "Rate": "rtg",
        },
    },
    "rushing": {
        "match": ("Att", "Yds", "Avg", "Lg", "TD"),
        "table": "player_rushing",
        "cols": {
            "Att": "att", "Yds": "yds", "Avg": "avg", "Lg": "lg", "TD": "td",
        },
    },
    "receiving": {
        "match": ("Rec", "Yds", "Avg", "Lg", "TD"),
        "table": "player_receiving",
        "cols": {
            "Tar": "tar", "Rec": "rec", "Yds": "yds", "Avg": "avg",
            "Lg": "lg", "TD": "td",
        },
    },
    "punt_returns": {
        "match": ("Num", "Yds", "Avg", "FC", "Lg", "TD"),
        "table": "player_punt_returns",
        "cols": {
            "Num": "ret", "FC": "fc", "Yds": "yds", "Avg": "avg",
            "Lg": "lg", "TD": "td",
        },
    },
    "kick_returns": {
        "match": ("Num", "Yds", "Avg", "FC", "Lg", "TD"),
        "table": "player_kick_returns",
        "cols": {
            "Num": "ret", "FC": "fc", "Yds": "yds", "Avg": "avg",
            "Lg": "lg", "TD": "td",
        },
    },
    "punting": {
        "match": ("Punts", "Yds", "Avg", "Lg"),
        "table": "player_punting",
        "cols": {
            "Punts": "punts", "Yds": "yds", "Avg": "avg", "Lg": "lg",
        },
    },
    "kickoffs": {
        "match_header": "Num",
        "match_after": "punting",  # kickoffs table comes right after punting
        "table": "player_kickoffs",
        "cols": {
            "Num": "kickoffs", "Yds": "yds", "Avg": "avg", "TB": "tb",
        },
    },
    "defense": {
        "match": ("Int", "Yds", "Avg", "Lg", "TD", "Solo", "Ast"),
        "table": "player_defense",
        "cols": {
            "Solo": "tkl", "Sack": "sacks",
        },
        # Defense also contains interception and sack data
        "extra_tables": {
            "player_interceptions": {
                "Int": "int_count", "Yds": "yds", "Avg": "avg",
                "Lg": "lg", "TD": "td",
            },
            "player_sacks": {
                "Sack": "sacks", "YdsL": "yds",
            },
        },
    },
}


def parse_footballdb_results(html: str, season: int) -> list[dict]:
    """Parse a FootballDB team results page to get game list and box score URLs.

    Returns list of dicts with: game_date, opponent, home_away, saints_score,
    opponent_score, result, boxscore_url, game_type.
    """
    soup = BeautifulSoup(html, "lxml")
    games = []

    links = soup.find_all("a", href=re.compile(r"/games/boxscore/"))
    for link in links:
        href = link["href"]
        url = urljoin(BASE_URL, href)

        # Extract date from URL: ...-2025090701 -> 20250907
        date_match = re.search(r"(\d{8})\d{2}$", href)
        if not date_match:
            continue
        date_str = date_match.group(1)
        game_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"

        # Determine home/away from URL
        # URL format: /team1-vs-team2-date (team1 is away, team2 is home)
        slug = href.split("/")[-1]
        is_saints_home = slug.split("-vs-")[1].startswith("new-orleans")
        is_saints_away = slug.split("-vs-")[0].startswith("new-orleans")

        # Extract opponent from link text
        link_text = link.get_text(strip=True)
        # "Cardinals vs Saints Box Score" or "Saints vs Seahawks Box Score"
        opp_match = re.match(r"(.+?) vs (.+?) Box Score", link_text)
        if opp_match:
            if is_saints_home:
                opponent = opp_match.group(1).strip()
            else:
                opponent = opp_match.group(2).strip()
        else:
            opponent = "Unknown"

        home_away = "home" if is_saints_home else "away"

        # Determine game type from date
        month = int(date_str[4:6])
        game_type = "preseason" if month == 8 else "regular"

        # Generate a game_id
        game_id = f"fdb_{date_str}"

        games.append({
            "game_id": game_id,
            "season": season,
            "game_date": game_date,
            "game_type": game_type,
            "opponent": opponent,
            "home_away": home_away,
            "boxscore_url": url,
        })

    return games


def parse_footballdb_boxscore(html: str, game_id: str) -> dict:
    """Parse a FootballDB box score page.

    Returns same format as parsers.parse_boxscore():
        - teams: (away_team, home_team)
        - metadata: {date, location, venue, attendance}
        - scoring_plays: list of dicts
        - stats: {table_name: [row_dicts]}
        - players: {player_id: {name, url}}
    """
    soup = BeautifulSoup(html, "lxml")
    tables = soup.find_all("table")

    result = {
        "teams": (None, None),
        "metadata": {},
        "scoring_plays": [],
        "stats": {},
        "players": {},
    }

    if len(tables) < 6:
        return result

    # --- Identify team names from passing tables (tables 4 & 5) ---
    away_team = _extract_team_name(tables[4]) if len(tables) > 4 else None
    home_team = _extract_team_name(tables[5]) if len(tables) > 5 else None
    result["teams"] = (away_team, home_team)

    # --- Score by quarters (table 0) ---
    if tables:
        qtr_rows = tables[0].find_all("tr")
        if len(qtr_rows) >= 3:
            away_cells = qtr_rows[1].find_all("td")
            home_cells = qtr_rows[2].find_all("td")
            if away_cells and home_cells:
                result["metadata"]["away_score"] = _safe_int(_text(away_cells[-1]))
                result["metadata"]["home_score"] = _safe_int(_text(home_cells[-1]))

    # --- Parse stat tables ---
    # Tables come in pairs: [away, home] for each stat category
    # Identify tables by their header columns
    stat_pair_map = _identify_stat_tables(tables)

    for stat_type, (away_idx, home_idx) in stat_pair_map.items():
        config = TABLE_TYPES.get(stat_type)
        if not config:
            continue

        table_name = config["table"]
        col_map = config["cols"]

        for tbl_idx, team_name in [(away_idx, away_team), (home_idx, home_team)]:
            if tbl_idx is None or tbl_idx >= len(tables):
                continue

            tbl = tables[tbl_idx]
            rows = tbl.find_all("tr")
            if len(rows) < 2:
                continue

            # Get actual column headers from the table
            header_cells = rows[0].find_all(["th", "td"])
            headers = [c.get_text(strip=True) for c in header_cells]

            for row in rows[1:]:
                cells = row.find_all("td")
                if not cells:
                    continue

                player_text = _text(cells[0])
                if player_text == "TOTAL" or not player_text:
                    continue

                player_link = cells[0].find("a")
                if not player_link:
                    continue

                # Extract player name (remove abbreviated version)
                player_name = _clean_player_name(player_text)
                player_href = player_link.get("href", "")
                player_id = _extract_fdb_player_id(player_href)

                if not player_id:
                    continue

                result["players"][player_id] = {
                    "name": player_name,
                    "url": urljoin(BASE_URL, player_href),
                }

                stat_row = {
                    "game_id": game_id,
                    "player_id": player_id,
                    "team": team_name,
                }

                # Map columns using header positions
                for i, hdr in enumerate(headers[1:], 1):
                    db_col = col_map.get(hdr)
                    if db_col and i < len(cells):
                        stat_row[db_col] = _parse_stat_value(
                            _text(cells[i]), db_col
                        )

                if table_name not in result["stats"]:
                    result["stats"][table_name] = []
                result["stats"][table_name].append(stat_row)

                # Handle defense table extra stats (interceptions, sacks)
                if stat_type == "defense" and "extra_tables" in config:
                    for extra_table, extra_cols in config["extra_tables"].items():
                        extra_row = {
                            "game_id": game_id,
                            "player_id": player_id,
                            "team": team_name,
                        }
                        has_data = False
                        for i, hdr in enumerate(headers[1:], 1):
                            db_col = extra_cols.get(hdr)
                            if db_col and i < len(cells):
                                val = _parse_stat_value(_text(cells[i]), db_col)
                                extra_row[db_col] = val
                                if val and val != 0:
                                    has_data = True

                        if has_data:
                            if extra_table not in result["stats"]:
                                result["stats"][extra_table] = []
                            result["stats"][extra_table].append(extra_row)

    # Compute pct for passing
    for row in result["stats"].get("player_passing", []):
        att = row.get("att", 0) or 0
        com = row.get("com", 0) or 0
        row["pct"] = round(com / att * 100, 1) if att > 0 else 0.0

    return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _text(cell) -> str:
    return cell.get_text(strip=True)


def _safe_int(s: str) -> int | None:
    s = s.replace(",", "").strip()
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def _parse_stat_value(text: str, col_name: str):
    """Parse a stat cell value."""
    if not text or text == "-":
        return None
    text = text.rstrip("t").strip()
    if col_name in ("avg", "pct", "rtg", "sacks"):
        try:
            return float(text)
        except ValueError:
            return None
    try:
        return int(text)
    except ValueError:
        try:
            return float(text)
        except ValueError:
            return None


def _clean_player_name(text: str) -> str:
    """Clean player name from footballdb format.

    'Alvin KamaraA.\xa0Kamara' -> 'Alvin Kamara'
    """
    # The abbreviated name follows the full name with no space
    # Pattern: "Full Name" followed by "F.\xa0Last"
    # Find where the abbreviated version starts (capital letter after lowercase)
    for i in range(len(text) - 1, 0, -1):
        if text[i] == "." and i >= 1:
            # Found abbreviated name start — look back for the capital
            j = i - 1
            while j > 0 and text[j].isupper():
                j -= 1
            if j > 0 and j < i:
                return text[:j + 1].strip()
    return text.replace("\xa0", " ")


def _extract_fdb_player_id(href: str) -> str | None:
    """Extract player ID from footballdb URL.

    /players/alvin-kamara-kamaral01 -> fdb_kamaral01
    """
    match = re.search(r"/players/[\w-]+-(\w+)$", href)
    if match:
        return f"fdb_{match.group(1)}"
    return None


def _extract_team_name(table) -> str | None:
    """Extract full team name from a stat table header.

    FootballDB puts "New Orleans SaintsNew Orleans" (full name + city) in one cell.
    We also handle abbreviated forms like "New Orleans SaintsNO".
    """
    first_row = table.find("tr")
    if first_row:
        first_cell = first_row.find(["th", "td"])
        if first_cell:
            # Use the link text if available (cleaner)
            link = first_cell.find("a")
            if link:
                return link.get_text(strip=True)

            text = first_cell.get_text(strip=True)

            # Known NFL team names — try to match the full name
            nfl_teams = [
                "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens",
                "Buffalo Bills", "Carolina Panthers", "Chicago Bears",
                "Cincinnati Bengals", "Cleveland Browns", "Dallas Cowboys",
                "Denver Broncos", "Detroit Lions", "Green Bay Packers",
                "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars",
                "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers",
                "Los Angeles Rams", "Miami Dolphins", "Minnesota Vikings",
                "New England Patriots", "New Orleans Saints", "New York Giants",
                "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers",
                "San Francisco 49ers", "Seattle Seahawks", "Tampa Bay Buccaneers",
                "Tennessee Titans", "Washington Commanders",
            ]
            for team in nfl_teams:
                if text.startswith(team):
                    return team
            return text
    return None


def _identify_stat_tables(tables: list) -> dict:
    """Identify which table indices correspond to which stat types.

    Returns dict of stat_type -> (away_table_idx, home_table_idx).
    """
    result = {}
    i = 4  # First stat tables typically start at index 4

    # Known sequence: passing, rushing, receiving, punt_returns, kick_returns,
    # punting, kicking, kickoffs, defense, fumbles
    stat_sequence = [
        "passing", "rushing", "receiving",
        "punt_returns", "kick_returns",
        "punting", None,  # kicking (skip)
        "kickoffs",
        "defense", None,  # fumbles (skip)
    ]

    for stat_type in stat_sequence:
        if i + 1 >= len(tables):
            break

        # Verify this looks like a stat table (has player data rows)
        rows = tables[i].find_all("tr")
        if len(rows) < 2:
            i += 2
            continue

        if stat_type is not None:
            result[stat_type] = (i, i + 1)

        i += 2

    return result

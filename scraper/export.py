"""Export SQLite data to JSON for the Saints Encyclopedia frontend."""

import json
import os
import sqlite3
from datetime import datetime


def export_json(db_path: str, output_dir: str) -> None:
    """Generate dashboard-compatible JSON from the SQLite database.

    Produces:
        - saints_dashboard_latest.json — main file consumed by the frontend
        - seasons/{YYYY}.json — per-season detailed files (for future use)
    """
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(os.path.join(output_dir, "seasons"), exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    games_flat = _build_games_flat(conn)
    players_out = _build_players(conn, games_flat)
    season_summary = _build_season_summary(conn, games_flat)
    seasons_covered = sorted(set(g["season"] for g in games_flat))

    dashboard = {
        "meta": {
            "generated": datetime.now().isoformat(),
            "team": "New Orleans Saints",
            "total_records": len(games_flat),
            "total_players": len(players_out),
            "seasons_covered": seasons_covered,
            "source": "Pro Football Archives",
        },
        "players": players_out,
        "games_flat": games_flat,
        "season_summary": season_summary,
    }

    # Write main dashboard file
    latest_path = os.path.join(output_dir, "saints_dashboard_latest.json")
    with open(latest_path, "w") as f:
        json.dump(dashboard, f, separators=(",", ":"), default=str)
    print(f"  Wrote {latest_path} ({len(games_flat)} records, {len(players_out)} players)")

    # Write per-season files
    _write_season_files(conn, output_dir)

    conn.close()


def _build_games_flat(conn: sqlite3.Connection) -> list[dict]:
    """Build the flat games array matching the old dashboard format.

    One row per player per game per stat_type (passing, rushing, receiving).
    Only includes Saints players.
    """
    rows = []

    # Get all games (only those with box scores)
    games = conn.execute(
        "SELECT * FROM games WHERE boxscore_url IS NOT NULL ORDER BY game_date"
    ).fetchall()

    game_map = {g["game_id"]: dict(g) for g in games}

    # Passing stats (Saints players only)
    for stat in conn.execute(
        "SELECT p.player_name, ps.* FROM player_passing ps "
        "JOIN players p ON ps.player_id = p.player_id "
        "WHERE ps.team LIKE '%New Orleans%' OR ps.team LIKE '%Saints%' "
        "ORDER BY ps.game_id"
    ).fetchall():
        game = game_map.get(stat["game_id"])
        if not game:
            continue
        rows.append({
            "player": stat["player_name"],
            "player_id": stat["player_id"],
            "season": game["season"],
            "game_date": game["game_date"],
            "opponent": game["opponent"],
            "game_location": "Home" if game["home_away"] == "home" else "Away",
            "result": game["result"],
            "stat_type": "passing",
            "pass_att": stat["att"],
            "pass_com": stat["com"],
            "pass_yds": stat["yds"],
            "pass_td": stat["td"],
            "pass_int": stat["int_thrown"],
            "pass_rtg": stat["rtg"],
            "sacked": stat["sacked"],
            "sacked_yds": stat["sacked_yds"],
        })

    # Rushing stats
    for stat in conn.execute(
        "SELECT p.player_name, ps.* FROM player_rushing ps "
        "JOIN players p ON ps.player_id = p.player_id "
        "WHERE ps.team LIKE '%New Orleans%' OR ps.team LIKE '%Saints%' "
        "ORDER BY ps.game_id"
    ).fetchall():
        game = game_map.get(stat["game_id"])
        if not game:
            continue
        rows.append({
            "player": stat["player_name"],
            "player_id": stat["player_id"],
            "season": game["season"],
            "game_date": game["game_date"],
            "opponent": game["opponent"],
            "game_location": "Home" if game["home_away"] == "home" else "Away",
            "result": game["result"],
            "stat_type": "rushing",
            "rush_att": stat["att"],
            "rush_yds": stat["yds"],
            "rush_td": stat["td"],
            "rush_avg": stat["avg"],
            "rush_lg": stat["lg"],
        })

    # Receiving stats
    for stat in conn.execute(
        "SELECT p.player_name, ps.* FROM player_receiving ps "
        "JOIN players p ON ps.player_id = p.player_id "
        "WHERE ps.team LIKE '%New Orleans%' OR ps.team LIKE '%Saints%' "
        "ORDER BY ps.game_id"
    ).fetchall():
        game = game_map.get(stat["game_id"])
        if not game:
            continue
        rows.append({
            "player": stat["player_name"],
            "player_id": stat["player_id"],
            "season": game["season"],
            "game_date": game["game_date"],
            "opponent": game["opponent"],
            "game_location": "Home" if game["home_away"] == "home" else "Away",
            "result": game["result"],
            "stat_type": "receiving",
            "rec": stat["rec"],
            "rec_yds": stat["yds"],
            "rec_td": stat["td"],
            "rec_avg": stat["avg"],
            "rec_lg": stat["lg"],
            "rec_tar": stat["tar"],
        })

    return rows


def _build_players(conn: sqlite3.Connection, games_flat: list[dict]) -> list[dict]:
    """Build the players array with career stats from games_flat."""
    player_games = {}
    for g in games_flat:
        pid = g["player_id"]
        if pid not in player_games:
            player_games[pid] = {"name": g["player"], "games": []}
        player_games[pid]["games"].append(g)

    players_out = []
    for pid, data in player_games.items():
        games = data["games"]
        seasons = sorted(set(g["season"] for g in games))

        career = {}
        for stat_type in ("passing", "rushing", "receiving"):
            typed = [g for g in games if g["stat_type"] == stat_type]
            if not typed:
                continue
            totals = {}
            for g in typed:
                for k, v in g.items():
                    if isinstance(v, (int, float)) and v is not None and k not in ("season",):
                        totals[k] = totals.get(k, 0) + (v or 0)
            totals["games_played"] = len(typed)
            # Round floats
            for k, v in totals.items():
                if isinstance(v, float):
                    totals[k] = round(v, 2)
            career[stat_type] = totals

        players_out.append({
            "player": data["name"],
            "player_id": pid,
            "seasons": seasons,
            "career_stats": career,
            "games": games,
        })

    players_out.sort(key=lambda p: p["player"].split()[-1] if p["player"] else "")
    return players_out


def _build_season_summary(conn: sqlite3.Connection, games_flat: list[dict]) -> list[dict]:
    """Build season summary aggregates."""
    by_season = {}
    for g in games_flat:
        s = g["season"]
        if s not in by_season:
            by_season[s] = {}
        st = g["stat_type"]
        if st not in by_season[s]:
            by_season[s][st] = {"rows": [], "players": set()}
        by_season[s][st]["rows"].append(g)
        by_season[s][st]["players"].add(g["player_id"])

    summary = []
    for season in sorted(by_season):
        entry = {"season": season, "stat_types": {}}
        for st, data in by_season[season].items():
            totals = {}
            for g in data["rows"]:
                for k, v in g.items():
                    if isinstance(v, (int, float)) and v is not None and k not in ("season",):
                        totals[k] = totals.get(k, 0) + (v or 0)
            totals["unique_players"] = len(data["players"])
            for k, v in totals.items():
                if isinstance(v, float):
                    totals[k] = round(v, 2)
            entry["stat_types"][st] = totals
        summary.append(entry)

    return summary


def _write_season_files(conn: sqlite3.Connection, output_dir: str) -> None:
    """Write per-season JSON files with full game details."""
    seasons_dir = os.path.join(output_dir, "seasons")

    seasons = [r[0] for r in conn.execute(
        "SELECT DISTINCT season FROM games ORDER BY season"
    ).fetchall()]

    for season in seasons:
        games = [dict(r) for r in conn.execute(
            "SELECT * FROM games WHERE season = ? ORDER BY game_date", (season,)
        ).fetchall()]

        # Attach box score stats to each game
        for game in games:
            gid = game["game_id"]
            game["team_stats"] = [dict(r) for r in conn.execute(
                "SELECT * FROM team_game_stats WHERE game_id = ?", (gid,)
            ).fetchall()]
            game["scoring_plays"] = [dict(r) for r in conn.execute(
                "SELECT * FROM scoring_plays WHERE game_id = ? ORDER BY id", (gid,)
            ).fetchall()]

        season_data = {
            "season": season,
            "games": games,
        }

        path = os.path.join(seasons_dir, f"{season}.json")
        with open(path, "w") as f:
            json.dump(season_data, f, separators=(",", ":"), default=str)

    print(f"  Wrote {len(seasons)} season files to {seasons_dir}")

import { tool } from "ai";
import { z } from "zod";
import { query } from "./db";

export const saintsTools = {
  query_games: tool({
    description:
      "Search Saints games by season, opponent, date range, result, or game type. Returns game records with scores and results.",
    inputSchema: z.object({
      season: z.number().optional().describe("Filter by season year (e.g. 2009)"),
      opponent: z.string().optional().describe("Filter by opponent name (partial match)"),
      result: z.enum(["W", "L", "T"]).optional().describe("Filter by game result"),
      game_type: z.enum(["regular", "playoff", "preseason"]).optional().describe("Filter by game type"),
      limit: z.number().default(20).describe("Max results to return"),
    }),
    execute: async ({ season, opponent, result, game_type, limit }) => {
      const conditions: string[] = [];
      const args: (string | number)[] = [];

      if (season) {
        conditions.push("season = ?");
        args.push(season);
      }
      if (opponent) {
        conditions.push("opponent LIKE ?");
        args.push(`%${opponent}%`);
      }
      if (result) {
        conditions.push("result = ?");
        args.push(result);
      }
      if (game_type) {
        conditions.push("game_type = ?");
        args.push(game_type);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      args.push(limit);

      return await query(
        `SELECT game_id, season, game_date, game_type, opponent, home_away,
                saints_score, opponent_score, result
         FROM games ${where}
         ORDER BY game_date DESC LIMIT ?`,
        args
      );
    },
  }),

  query_player_stats: tool({
    description:
      "Get passing, rushing, receiving, or defensive stats for a specific player. Can filter by season or return career totals. For defense, queries tackles, sacks, and interceptions across all three defensive tables.",
    inputSchema: z.object({
      player_name: z.string().describe("Player name to search for (partial match)"),
      stat_type: z.enum(["passing", "rushing", "receiving", "defense"]).default("passing"),
      season: z.number().optional().describe("Filter to a specific season"),
      career_totals: z.boolean().default(false).describe("If true, return career aggregates instead of game-by-game"),
    }),
    execute: async ({ player_name, stat_type, season, career_totals }) => {
      const playerCondition = "p.player_name LIKE ?";
      const teamCondition = "(t.team LIKE '%Saints%' OR t.team LIKE '%New Orleans%')";

      if (stat_type === "defense") {
        const seasonWhere = season ? "AND g.season = ?" : "";
        const args: (string | number)[] = [`%${player_name}%`];
        if (season) args.push(season);

        if (career_totals) {
          return await query(
            `SELECT p.player_name,
              COALESCE(def.tkl, 0) as tkl, COALESCE(def.tfl, 0) as tfl,
              COALESCE(def.ff, 0) as ff, COALESCE(def.pd_count, 0) as pd,
              COALESCE(sk.sacks, 0) as sacks,
              COALESCE(it.int_count, 0) as interceptions
            FROM players p
            LEFT JOIN (
              SELECT t.player_id, SUM(t.tkl) as tkl, SUM(t.tfl) as tfl, SUM(t.ff) as ff, SUM(t.pd) as pd_count
              FROM player_defense t JOIN games g ON t.game_id = g.game_id
              WHERE ${teamCondition} AND g.game_type = 'regular' ${seasonWhere}
              GROUP BY t.player_id
            ) def ON def.player_id = p.player_id
            LEFT JOIN (
              SELECT t.player_id, SUM(t.sacks) as sacks
              FROM player_sacks t JOIN games g ON t.game_id = g.game_id
              WHERE ${teamCondition} AND g.game_type = 'regular' ${seasonWhere}
              GROUP BY t.player_id
            ) sk ON sk.player_id = p.player_id
            LEFT JOIN (
              SELECT t.player_id, SUM(t.int_count) as int_count
              FROM player_interceptions t JOIN games g ON t.game_id = g.game_id
              WHERE ${teamCondition} AND g.game_type = 'regular' ${seasonWhere}
              GROUP BY t.player_id
            ) it ON it.player_id = p.player_id
            WHERE ${playerCondition}
              AND (def.player_id IS NOT NULL OR sk.player_id IS NOT NULL OR it.player_id IS NOT NULL)`,
            args
          );
        }

        // Game-by-game defense
        return await query(
          `SELECT p.player_name, g.game_date, g.opponent, g.season,
            COALESCE(pd.tkl, 0) as tkl, COALESCE(pd.tfl, 0) as tfl, COALESCE(pd.ff, 0) as ff,
            COALESCE(sk.sacks, 0) as sacks, COALESCE(it.int_count, 0) as interceptions
          FROM players p
          JOIN (
            SELECT game_id, player_id FROM player_defense WHERE ${teamCondition}
            UNION SELECT game_id, player_id FROM player_sacks WHERE ${teamCondition}
            UNION SELECT game_id, player_id FROM player_interceptions WHERE ${teamCondition}
          ) all_gp ON all_gp.player_id = p.player_id
          JOIN games g ON all_gp.game_id = g.game_id
          LEFT JOIN player_defense pd ON pd.player_id = p.player_id AND pd.game_id = g.game_id
          LEFT JOIN player_sacks sk ON sk.player_id = p.player_id AND sk.game_id = g.game_id
          LEFT JOIN player_interceptions it ON it.player_id = p.player_id AND it.game_id = g.game_id
          WHERE ${playerCondition} AND g.game_type != 'preseason' ${seasonWhere}
          ORDER BY g.game_date DESC
          LIMIT 50`,
          args
        );
      }

      const table = `player_${stat_type}`;

      if (career_totals) {
        const cols =
          stat_type === "passing"
            ? "SUM(t.att) as att, SUM(t.com) as com, SUM(t.yds) as yds, SUM(t.td) as td, SUM(t.int_thrown) as int_thrown, COUNT(DISTINCT t.game_id) as games"
            : stat_type === "rushing"
              ? "SUM(t.att) as att, SUM(t.yds) as yds, SUM(t.td) as td, COUNT(DISTINCT t.game_id) as games"
              : "SUM(t.rec) as rec, SUM(t.yds) as yds, SUM(t.td) as td, COUNT(DISTINCT t.game_id) as games";

        const seasonWhere = season ? "AND g.season = ?" : "";
        const args: (string | number)[] = [`%${player_name}%`];
        if (season) args.push(season);

        return await query(
          `SELECT p.player_name, ${cols}
           FROM ${table} t
           JOIN players p ON t.player_id = p.player_id
           JOIN games g ON t.game_id = g.game_id
           WHERE ${playerCondition} AND ${teamCondition} ${seasonWhere}
           GROUP BY t.player_id`,
          args
        );
      }

      const cols =
        stat_type === "passing"
          ? "t.att, t.com, t.yds, t.td, t.int_thrown, t.rtg"
          : stat_type === "rushing"
            ? "t.att, t.yds, t.avg, t.td"
            : "t.rec, t.yds, t.avg, t.td";

      const seasonWhere = season ? "AND g.season = ?" : "";
      const args: (string | number)[] = [`%${player_name}%`];
      if (season) args.push(season);

      return await query(
        `SELECT p.player_name, g.game_date, g.opponent, g.season, ${cols}
         FROM ${table} t
         JOIN players p ON t.player_id = p.player_id
         JOIN games g ON t.game_id = g.game_id
         WHERE ${playerCondition} AND ${teamCondition} ${seasonWhere}
         ORDER BY g.game_date DESC
         LIMIT 50`,
        args
      );
    },
  }),

  query_leaderboards: tool({
    description:
      "Get top N players for a given stat. Supports career totals, single-season, or single-game records. For defense, sort_by can be: sacks, int_count, tkl.",
    inputSchema: z.object({
      stat_type: z.enum(["passing", "rushing", "receiving", "defense"]),
      scope: z.enum(["career", "season", "game"]).default("career"),
      sort_by: z.string().default("yds").describe("Column to sort by (e.g. yds, td, rec, sacks, int_count, tkl)"),
      limit: z.number().default(10),
    }),
    execute: async ({ stat_type, scope, sort_by, limit }) => {
      const teamCondition = "(t.team LIKE '%Saints%' OR t.team LIKE '%New Orleans%')";

      if (stat_type === "defense") {
        if (scope === "career") {
          return await query(
            `SELECT p.player_name,
              COALESCE(def.tkl, 0) as tkl, COALESCE(def.tfl, 0) as tfl,
              COALESCE(def.ff, 0) as ff,
              COALESCE(sk.sacks, 0) as sacks,
              COALESCE(it.int_count, 0) as int_count
            FROM (
              SELECT player_id FROM player_defense WHERE team LIKE '%Saints%' OR team LIKE '%New Orleans%'
              UNION
              SELECT player_id FROM player_sacks WHERE team LIKE '%Saints%' OR team LIKE '%New Orleans%'
              UNION
              SELECT player_id FROM player_interceptions WHERE team LIKE '%Saints%' OR team LIKE '%New Orleans%'
            ) all_def
            JOIN players p ON all_def.player_id = p.player_id
            LEFT JOIN (
              SELECT t.player_id, SUM(t.tkl) as tkl, SUM(t.tfl) as tfl, SUM(t.ff) as ff
              FROM player_defense t JOIN games g ON t.game_id = g.game_id
              WHERE ${teamCondition} AND g.game_type = 'regular'
              GROUP BY t.player_id
            ) def ON def.player_id = all_def.player_id
            LEFT JOIN (
              SELECT t.player_id, SUM(t.sacks) as sacks
              FROM player_sacks t JOIN games g ON t.game_id = g.game_id
              WHERE ${teamCondition} AND g.game_type = 'regular'
              GROUP BY t.player_id
            ) sk ON sk.player_id = all_def.player_id
            LEFT JOIN (
              SELECT t.player_id, SUM(t.int_count) as int_count
              FROM player_interceptions t JOIN games g ON t.game_id = g.game_id
              WHERE ${teamCondition} AND g.game_type = 'regular'
              GROUP BY t.player_id
            ) it ON it.player_id = all_def.player_id
            ORDER BY ${sort_by} DESC
            LIMIT ?`,
            [limit]
          );
        }

        if (scope === "season") {
          return await query(
            `SELECT p.player_name, combined.season,
              COALESCE(SUM(tkl), 0) as tkl, COALESCE(SUM(tfl), 0) as tfl,
              COALESCE(SUM(ff), 0) as ff,
              COALESCE(SUM(sacks), 0) as sacks,
              COALESCE(SUM(int_count), 0) as int_count
            FROM (
              SELECT t.player_id, g.season, SUM(t.tkl) as tkl, SUM(t.tfl) as tfl, SUM(t.ff) as ff, 0 as sacks, 0 as int_count
              FROM player_defense t JOIN games g ON t.game_id = g.game_id
              WHERE ${teamCondition} AND g.game_type = 'regular'
              GROUP BY t.player_id, g.season
              UNION ALL
              SELECT t.player_id, g.season, 0,0,0, SUM(t.sacks), 0
              FROM player_sacks t JOIN games g ON t.game_id = g.game_id
              WHERE ${teamCondition} AND g.game_type = 'regular'
              GROUP BY t.player_id, g.season
              UNION ALL
              SELECT t.player_id, g.season, 0,0,0,0, SUM(t.int_count)
              FROM player_interceptions t JOIN games g ON t.game_id = g.game_id
              WHERE ${teamCondition} AND g.game_type = 'regular'
              GROUP BY t.player_id, g.season
            ) combined
            JOIN players p ON combined.player_id = p.player_id
            GROUP BY combined.player_id, combined.season
            ORDER BY ${sort_by} DESC
            LIMIT ?`,
            [limit]
          );
        }

        // single game - not practical for defense across 3 tables, fall through to sacks
        return await query(
          `SELECT p.player_name, g.game_date, g.opponent, g.season, t.sacks
           FROM player_sacks t
           JOIN players p ON t.player_id = p.player_id
           JOIN games g ON t.game_id = g.game_id
           WHERE ${teamCondition} AND g.game_type = 'regular'
           ORDER BY t.sacks DESC
           LIMIT ?`,
          [limit]
        );
      }

      const table = `player_${stat_type}`;

      if (scope === "career") {
        const cols =
          stat_type === "passing"
            ? "SUM(t.yds) as yds, SUM(t.td) as td, SUM(t.att) as att, SUM(t.com) as com, SUM(t.int_thrown) as int_thrown"
            : stat_type === "rushing"
              ? "SUM(t.yds) as yds, SUM(t.td) as td, SUM(t.att) as att"
              : "SUM(t.yds) as yds, SUM(t.td) as td, SUM(t.rec) as rec";

        return await query(
          `SELECT p.player_name, ${cols}, COUNT(DISTINCT t.game_id) as games
           FROM ${table} t
           JOIN players p ON t.player_id = p.player_id
           JOIN games g ON t.game_id = g.game_id
           WHERE ${teamCondition} AND g.game_type = 'regular'
           GROUP BY t.player_id
           ORDER BY ${sort_by} DESC
           LIMIT ?`,
          [limit]
        );
      }

      if (scope === "season") {
        const cols =
          stat_type === "passing"
            ? "SUM(t.yds) as yds, SUM(t.td) as td, SUM(t.att) as att, SUM(t.com) as com"
            : stat_type === "rushing"
              ? "SUM(t.yds) as yds, SUM(t.td) as td, SUM(t.att) as att"
              : "SUM(t.yds) as yds, SUM(t.td) as td, SUM(t.rec) as rec";

        return await query(
          `SELECT p.player_name, g.season, ${cols}, COUNT(DISTINCT t.game_id) as games
           FROM ${table} t
           JOIN players p ON t.player_id = p.player_id
           JOIN games g ON t.game_id = g.game_id
           WHERE ${teamCondition} AND g.game_type = 'regular'
           GROUP BY t.player_id, g.season
           ORDER BY ${sort_by} DESC
           LIMIT ?`,
          [limit]
        );
      }

      // single game
      const cols =
        stat_type === "passing"
          ? "t.yds, t.td, t.att, t.com, t.int_thrown, t.rtg"
          : stat_type === "rushing"
            ? "t.yds, t.td, t.att"
            : "t.yds, t.td, t.rec";

      return await query(
        `SELECT p.player_name, g.game_date, g.opponent, g.season, ${cols}
         FROM ${table} t
         JOIN players p ON t.player_id = p.player_id
         JOIN games g ON t.game_id = g.game_id
         WHERE ${teamCondition} AND g.game_type = 'regular'
         ORDER BY t.${sort_by} DESC
         LIMIT ?`,
        [limit]
      );
    },
  }),

  query_team_season: tool({
    description: "Get team aggregate stats for a specific season (total offense, points, etc.)",
    inputSchema: z.object({
      season: z.number().describe("Season year"),
    }),
    execute: async ({ season }) => {
      const teamStats = await query(
        `SELECT
          COALESCE(SUM(t.rush_att), 0) as rush_att,
          COALESCE(SUM(t.rush_yds), 0) as rush_yds,
          COALESCE(SUM(t.rush_td), 0) as rush_td,
          COALESCE(SUM(t.pass_att), 0) as pass_att,
          COALESCE(SUM(t.pass_com), 0) as pass_com,
          COALESCE(SUM(t.pass_yds), 0) as pass_yds,
          COALESCE(SUM(t.pass_td), 0) as pass_td,
          COALESCE(SUM(t.pass_int), 0) as pass_int,
          COALESCE(SUM(t.total_points), 0) as total_points
        FROM team_game_stats t
        JOIN games g ON t.game_id = g.game_id
        WHERE g.season = ?
          AND (t.team LIKE '%Saints%' OR t.team LIKE '%New Orleans%')
          AND g.game_type = 'regular'`,
        [season]
      );

      const record = await query(
        `SELECT
          SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN result='L' THEN 1 ELSE 0 END) as losses,
          SUM(CASE WHEN result='T' THEN 1 ELSE 0 END) as ties
        FROM games WHERE season = ? AND game_type = 'regular'`,
        [season]
      );

      return { season, record: record[0], stats: teamStats[0] };
    },
  }),

  search_players: tool({
    description: "Search for players by name. Returns matching player names, position, college, and seasons with the Saints.",
    inputSchema: z.object({
      name: z.string().describe("Player name to search (partial match)"),
      limit: z.number().default(10),
    }),
    execute: async ({ name, limit }) => {
      return await query(
        `SELECT DISTINCT p.player_id, p.player_name, p.position, p.college, p.seasons_text
         FROM players p
         WHERE p.player_name LIKE ?
         ORDER BY p.player_name
         LIMIT ?`,
        [`%${name}%`, limit]
      );
    },
  }),

  query_player_bio: tool({
    description: "Get a player's biographical info: position, college, height, weight, seasons with Saints, and draft info.",
    inputSchema: z.object({
      player_name: z.string().describe("Player name to search for (partial match)"),
    }),
    execute: async ({ player_name }) => {
      const players = await query(
        `SELECT p.player_id, p.player_name, p.position, p.college, p.height, p.weight,
                p.birth_date, p.seasons_text
         FROM players p
         WHERE p.player_name LIKE ?
         ORDER BY p.player_name
         LIMIT 5`,
        [`%${player_name}%`]
      );

      // Enrich with draft info
      const results = [];
      for (const p of players) {
        const draft = await query(
          `SELECT season, round, pick FROM draft_picks
           WHERE player_id = ? OR LOWER(player_name) = LOWER(?)
           LIMIT 1`,
          [p.player_id as string, p.player_name as string]
        );
        results.push({
          ...p,
          draft: draft.length > 0 ? draft[0] : null,
        });
      }
      return results;
    },
  }),

  query_scoring: tool({
    description: "Get scoring plays for a specific game. You can find games by date or opponent first.",
    inputSchema: z.object({
      game_id: z.string().optional().describe("Specific game ID"),
      season: z.number().optional(),
      opponent: z.string().optional(),
    }),
    execute: async ({ game_id, season, opponent }) => {
      if (game_id) {
        return await query(
          `SELECT sp.quarter, sp.team, sp.description, sp.saints_score, sp.opp_score
           FROM scoring_plays sp WHERE sp.game_id = ? ORDER BY sp.id`,
          [game_id]
        );
      }

      const conditions: string[] = [];
      const args: (string | number)[] = [];
      if (season) { conditions.push("g.season = ?"); args.push(season); }
      if (opponent) { conditions.push("g.opponent LIKE ?"); args.push(`%${opponent}%`); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const games = await query(
        `SELECT g.game_id, g.game_date, g.opponent, g.saints_score, g.opponent_score
         FROM games g ${where} ORDER BY g.game_date DESC LIMIT 1`,
        args
      );

      if (games.length === 0) return { error: "No matching game found" };

      const gid = games[0].game_id as string;
      const plays = await query(
        `SELECT sp.quarter, sp.team, sp.description, sp.saints_score, sp.opp_score
         FROM scoring_plays sp WHERE sp.game_id = ? ORDER BY sp.id`,
        [gid]
      );

      return { game: games[0], scoring_plays: plays };
    },
  }),

  query_records: tool({
    description:
      "Find records and milestones. Examples: 1000-yard receiving seasons, 4000-yard passing seasons, games with 300+ passing yards.",
    inputSchema: z.object({
      stat_type: z.enum(["passing", "rushing", "receiving"]),
      stat_column: z.string().describe("Column name: yds, td, rec, att, etc."),
      min_value: z.number().describe("Minimum value threshold"),
      scope: z.enum(["game", "season"]).default("season"),
    }),
    execute: async ({ stat_type, stat_column, min_value, scope }) => {
      const table = `player_${stat_type}`;
      const teamCondition = "(t.team LIKE '%Saints%' OR t.team LIKE '%New Orleans%')";

      if (scope === "season") {
        return await query(
          `SELECT p.player_name, g.season, SUM(t.${stat_column}) as total,
                  COUNT(DISTINCT t.game_id) as games
           FROM ${table} t
           JOIN players p ON t.player_id = p.player_id
           JOIN games g ON t.game_id = g.game_id
           WHERE ${teamCondition} AND g.game_type = 'regular'
           GROUP BY t.player_id, g.season
           HAVING total >= ?
           ORDER BY total DESC`,
          [min_value]
        );
      }

      return await query(
        `SELECT p.player_name, g.game_date, g.opponent, g.season, t.${stat_column} as value
         FROM ${table} t
         JOIN players p ON t.player_id = p.player_id
         JOIN games g ON t.game_id = g.game_id
         WHERE ${teamCondition} AND g.game_type = 'regular' AND t.${stat_column} >= ?
         ORDER BY t.${stat_column} DESC`,
        [min_value]
      );
    },
  }),
};

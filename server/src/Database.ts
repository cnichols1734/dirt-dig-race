import Database from 'better-sqlite3';
import { PlayerProfile, Resources } from '@dig/shared';
import { BALANCE } from '@dig/shared';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class GameDatabase {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(__dirname, '..', 'dig.db');
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL DEFAULT 'Miner',
        total_tiles_dug INTEGER DEFAULT 0,
        copper_collected INTEGER DEFAULT 0,
        iron_collected INTEGER DEFAULT 0,
        gold_collected INTEGER DEFAULT 0,
        crystal_collected INTEGER DEFAULT 0,
        ember_stone_collected INTEGER DEFAULT 0,
        rounds_played INTEGER DEFAULT 0,
        rounds_won INTEGER DEFAULT 0,
        guardians_defeated INTEGER DEFAULT 0,
        collapse_survived INTEGER DEFAULT 0,
        mirror_wins INTEGER DEFAULT 0,
        portals_entered INTEGER DEFAULT 0,
        deepest_dig INTEGER DEFAULT 0,
        fastest_vault REAL DEFAULT 0,
        xp INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        encounter TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (player_id) REFERENCES players(id)
      );
    `);
  }

  getOrCreatePlayer(id: string, username: string = 'Miner'): PlayerProfile {
    const row = this.db.prepare('SELECT * FROM players WHERE id = ?').get(id) as any;
    if (row) return this.rowToProfile(row);

    this.db.prepare('INSERT INTO players (id, username) VALUES (?, ?)').run(id, username);
    return this.getOrCreatePlayer(id, username);
  }

  updatePlayerStats(
    id: string,
    tilesDug: number,
    oreCollected: Resources,
    won: boolean,
    encounter: string,
    xpEarned: number,
    distFromCenter: number,
    vaultTime?: number,
  ) {
    const stmt = this.db.prepare(`
      UPDATE players SET
        total_tiles_dug = total_tiles_dug + ?,
        copper_collected = copper_collected + ?,
        iron_collected = iron_collected + ?,
        gold_collected = gold_collected + ?,
        crystal_collected = crystal_collected + ?,
        ember_stone_collected = ember_stone_collected + ?,
        rounds_played = rounds_played + 1,
        rounds_won = rounds_won + ?,
        guardians_defeated = guardians_defeated + ?,
        collapse_survived = collapse_survived + ?,
        mirror_wins = mirror_wins + ?,
        portals_entered = portals_entered + ?,
        deepest_dig = MAX(deepest_dig, ?),
        fastest_vault = CASE WHEN ? > 0 AND (fastest_vault = 0 OR ? < fastest_vault) THEN ? ELSE fastest_vault END,
        xp = xp + ?
      WHERE id = ?
    `);

    stmt.run(
      tilesDug,
      oreCollected.copper, oreCollected.iron, oreCollected.gold,
      oreCollected.crystal, oreCollected.emberStone,
      won ? 1 : 0,
      encounter === 'GUARDIAN' && won ? 1 : 0,
      encounter === 'COLLAPSE' && won ? 1 : 0,
      encounter === 'MIRROR' && won ? 1 : 0,
      encounter === 'PORTAL' ? 1 : 0,
      distFromCenter,
      vaultTime || 0, vaultTime || 0, vaultTime || 0,
      xpEarned,
      id,
    );
  }

  getLeaderboard(limit: number = 10): PlayerProfile[] {
    const rows = this.db.prepare(
      'SELECT * FROM players ORDER BY xp DESC LIMIT ?'
    ).all(limit) as any[];
    return rows.map(r => this.rowToProfile(r));
  }

  private rowToProfile(row: any): PlayerProfile {
    const xp = row.xp || 0;
    let rank = BALANCE.MINER_RANKS[0].name;
    for (const r of BALANCE.MINER_RANKS) {
      if (xp >= r.xp) rank = r.name;
    }

    return {
      id: row.id,
      username: row.username,
      totalTilesDug: row.total_tiles_dug,
      totalOreCollected: {
        copper: row.copper_collected,
        iron: row.iron_collected,
        gold: row.gold_collected,
        crystal: row.crystal_collected,
        emberStone: row.ember_stone_collected,
      },
      roundsPlayed: row.rounds_played,
      roundsWon: row.rounds_won,
      guardiansDefeated: row.guardians_defeated,
      collapseSurvived: row.collapse_survived,
      mirrorWins: row.mirror_wins,
      portalsEntered: row.portals_entered,
      deepestDig: row.deepest_dig,
      fastestVault: row.fastest_vault,
      currentRank: rank,
      xp,
    };
  }
}

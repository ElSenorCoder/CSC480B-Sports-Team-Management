const express = require('express');
const pool = require('../db/db');
const requireAuth = require('../middleware/requireAuth');
const {
    DAYS_BETWEEN_ROUNDS,
    MIN_TEAMS,
    MAX_TEAMS,
    isValidTeamCount,
    totalRounds,
    roundLabel,
    pairTeams,
    isDecided,
    winnerOf,
    simulateScores,
    rankStandings,
    isValidDate,
    isValidTime,
    toTournamentGame,
} = require('../lib/tournament');

const router = express.Router();

router.use(requireAuth);

// =========================
// Helpers
// =========================

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function handleError(res, error) {
    if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
    }

    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
}

// Coaches and administrators can create, simulate and delete tournaments.
function requireCoachOrAdmin(req, res, next) {
    if (req.user.role !== 'coach' && req.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Coach or administrator access required' });
    }
    next();
}

// Only the creator (or an administrator) can change an existing tournament.
function canManage(user, tournament) {
    return user.role === 'administrator' || Number(tournament.user_id) === Number(user.id);
}

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function withTransaction(work) {
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

async function findTournament(db, id, { lock = false } = {}) {
    const [rows] = await db.query(
        `SELECT * FROM tournament WHERE id = ?${lock ? ' FOR UPDATE' : ''}`,
        [id]
    );

    return rows[0] || null;
}

// mysql2 returns BIGINT columns as JS numbers; the frontend treats ids as
// strings everywhere, so stringify them here.
function toTournament(row) {
    return {
        id: String(row.id),
        name: row.name,
        status: row.status,
        createdBy: String(row.user_id),
        createdAt: row.date_created,
    };
}

async function fetchGames(db, tournamentId) {
    const [rows] = await db.query(
        `SELECT * FROM view_teams_with_games
        WHERE tournament_id = ?
        ORDER BY round ASC, game_id ASC`,
        [tournamentId]
    );

    return rows.map(toTournamentGame);
}

async function fetchStandings(db, tournamentId) {
    const [rows] = await db.query(
        `SELECT s.team_id, t.name AS team_name, s.win, s.loss, s.draw, s.score
        FROM tournament_standings s
        INNER JOIN teams t ON t.id = s.team_id
        WHERE s.tournament_id = ?`,
        [tournamentId]
    );

    const ranked = rankStandings(rows.map((row) => ({
        teamId: row.team_id,
        teamName: row.team_name,
        win: row.win,
        loss: row.loss,
        draw: row.draw,
        score: row.score,
    })));

    return ranked.map((row, index) => ({
        rank: index + 1,
        teamId: String(row.teamId),
        teamName: row.teamName,
        wins: row.win,
        losses: row.loss,
        draws: row.draw,
        score: row.score,
    }));
}

// =========================
// GET /api/tournaments
// =========================
// Every tournament, newest first.

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT t.*,
                (SELECT COUNT(*) FROM tournament_standings s WHERE s.tournament_id = t.id) AS team_count
            FROM tournament t
            ORDER BY t.date_created DESC, t.id DESC`
        );

        res.json(rows.map((row) => ({
            ...toTournament(row),
            teamCount: row.team_count,
        })));

    } catch (error) {
        handleError(res, error);
    }
});

// =========================
// POST /api/tournaments/create
// =========================
// Creates the tournament, a zeroed standings row for every team, and the
// first-round games. Later rounds are created by the simulation once their
// participants are known.
//
// Body: { name, teamIds, startDate: 'YYYY-MM-DD', time?: 'HH:MM', location? }
// teamIds is the bracket order: teams 1 and 2 play each other, 3 and 4, ...
// and the field must be a power of two.

router.post('/create', requireCoachOrAdmin, async (req, res) => {
    try {
        const { name, teamIds, startDate, time = '18:00', location } = req.body ?? {};

        const cleanName = typeof name === 'string' ? name.trim() : '';
        if (!cleanName || cleanName.length > 100) {
            throw new HttpError(400, 'name is required (max 100 characters)');
        }

        const ids = Array.isArray(teamIds)
            ? teamIds.map((id) => (typeof id === 'number' || typeof id === 'string' ? Number(id) : NaN))
            : [];
        if (!ids.length || !ids.every((id) => Number.isInteger(id) && id > 0)) {
            throw new HttpError(400, 'teamIds must be a list of team ids');
        }
        if (new Set(ids).size !== ids.length) {
            throw new HttpError(400, 'teamIds must not contain duplicates');
        }
        if (!isValidTeamCount(ids.length)) {
            throw new HttpError(
                400,
                `A single-elimination tournament needs a power-of-two number of teams (${MIN_TEAMS}-${MAX_TEAMS})`
            );
        }

        if (!isValidDate(startDate)) {
            throw new HttpError(400, 'startDate must be a valid date (YYYY-MM-DD)');
        }
        if (!isValidTime(time)) {
            throw new HttpError(400, 'time must be HH:MM (24-hour)');
        }

        const cleanLocation = typeof location === 'string' && location.trim() ? location.trim() : null;
        if (cleanLocation && cleanLocation.length > 255) {
            throw new HttpError(400, 'location must be at most 255 characters');
        }

        const [teamRows] = await pool.query(`SELECT id FROM teams WHERE id IN (?)`, [ids]);
        if (teamRows.length !== ids.length) {
            throw new HttpError(400, 'One or more teams do not exist');
        }

        const tournamentId = await withTransaction(async (conn) => {
            const [created] = await conn.query(
                `INSERT INTO tournament (user_id, name) VALUES (?, ?)`,
                [req.user.id, cleanName]
            );
            const id = created.insertId;

            await conn.query(
                `INSERT INTO tournament_standings (tournament_id, team_id) VALUES ?`,
                [ids.map((teamId) => [id, teamId])]
            );

            const label = roundLabel(1, totalRounds(ids.length));
            const gameDate = `${startDate} ${time}:00`;

            await conn.query(
                `INSERT INTO games
                    (home_team_id, away_team_id, game_date, location, round, tournament_id, descriptions)
                VALUES ?`,
                [pairTeams(ids).map(([home, away]) =>
                    [home, away, gameDate, cleanLocation, 1, id, label]
                )]
            );

            return id;
        });

        const tournament = await findTournament(pool, tournamentId);

        res.status(201).json({
            ...toTournament(tournament),
            games: await fetchGames(pool, tournamentId),
            standings: await fetchStandings(pool, tournamentId),
        });

    } catch (error) {
        handleError(res, error);
    }
});

// =========================
// GET /api/tournaments/:id
// =========================
// The tournament with all of its games, in bracket order.

router.get('/:id', async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) throw new HttpError(400, 'Invalid tournament id');

        const tournament = await findTournament(pool, id);
        if (!tournament) throw new HttpError(404, 'Tournament not found');

        res.json({
            ...toTournament(tournament),
            games: await fetchGames(pool, id),
        });

    } catch (error) {
        handleError(res, error);
    }
});

// =========================
// GET /api/tournaments/:id/simulation
// =========================
// Plays every game that has not been decided yet, creating each next round
// from the winners until the final is played, then marks the tournament
// completed. Standings are not touched here: database triggers recompute
// them whenever a game's score changes. Runs in one transaction, so a
// failure leaves the tournament untouched.

router.get('/:id/simulation', requireCoachOrAdmin, async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) throw new HttpError(400, 'Invalid tournament id');

        const championTeamId = await withTransaction(async (conn) => {
            const tournament = await findTournament(conn, id, { lock: true });
            if (!tournament) throw new HttpError(404, 'Tournament not found');
            if (!canManage(req.user, tournament)) {
                throw new HttpError(403, 'You did not create this tournament');
            }
            if (tournament.status === 'completed' || tournament.status === 'cancelled') {
                throw new HttpError(409, `Tournament is already ${tournament.status}`);
            }

            const [teamRows] = await conn.query(
                `SELECT team_id FROM tournament_standings WHERE tournament_id = ?`,
                [id]
            );
            const teamIds = teamRows.map((row) => row.team_id);
            const rounds = totalRounds(teamIds.length);

            const [games] = await conn.query(
                `SELECT * FROM games WHERE tournament_id = ? ORDER BY round ASC, id ASC`,
                [id]
            );
            if (games.length === 0) {
                throw new HttpError(409, 'Tournament has no games to simulate');
            }

            let currentRound = games[games.length - 1].round;
            let roundGames;

            while (true) {
                roundGames = games.filter((game) => game.round === currentRound);

                // A round holds half as many games as the round before it;
                // anything else means games were removed by hand.
                if (roundGames.length !== teamIds.length / 2 ** currentRound) {
                    throw new HttpError(409, `Round ${currentRound} is missing games`);
                }

                for (const game of roundGames) {
                    if (isDecided(game)) continue;

                    const { home, away } = simulateScores();
                    await conn.query(
                        `UPDATE games SET home_team_score = ?, away_team_score = ? WHERE id = ?`,
                        [home, away, game.id]
                    );
                    game.home_team_score = home;
                    game.away_team_score = away;
                }

                if (currentRound >= rounds) break;

                const [[{ next_date: nextDate }]] = await conn.query(
                    `SELECT DATE_FORMAT(
                        DATE_ADD(MAX(game_date), INTERVAL ? DAY), '%Y-%m-%d %H:%i:%s'
                    ) AS next_date
                    FROM games WHERE tournament_id = ? AND round = ?`,
                    [DAYS_BETWEEN_ROUNDS, id, currentRound]
                );

                const label = roundLabel(currentRound + 1, rounds);
                await conn.query(
                    `INSERT INTO games
                        (home_team_id, away_team_id, game_date, location, round, tournament_id, descriptions)
                    VALUES ?`,
                    [pairTeams(roundGames.map(winnerOf)).map(([home, away]) =>
                        [home, away, nextDate, roundGames[0].location, currentRound + 1, id, label]
                    )]
                );

                const [nextGames] = await conn.query(
                    `SELECT * FROM games WHERE tournament_id = ? AND round = ? ORDER BY id ASC`,
                    [id, currentRound + 1]
                );
                games.push(...nextGames);
                currentRound += 1;
            }

            await conn.query(`UPDATE tournament SET status = 'completed' WHERE id = ?`, [id]);

            return winnerOf(roundGames[0]);
        });

        const tournament = await findTournament(pool, id);
        const standings = await fetchStandings(pool, id);

        res.json({
            ...toTournament(tournament),
            games: await fetchGames(pool, id),
            standings,
            champion: standings.find((row) => row.teamId === String(championTeamId)),
        });

    } catch (error) {
        handleError(res, error);
    }
});

// =========================
// DELETE /api/tournaments/:id/delete
// =========================
// Removes the tournament together with its games and standings. Children are
// deleted explicitly, before the tournament, because MySQL does not fire
// triggers for foreign-key cascades, and the history log needs to see them.

router.delete('/:id/delete', requireCoachOrAdmin, async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) throw new HttpError(400, 'Invalid tournament id');

        const tournament = await findTournament(pool, id);
        if (!tournament) throw new HttpError(404, 'Tournament not found');
        if (!canManage(req.user, tournament)) {
            throw new HttpError(403, 'You did not create this tournament');
        }

        await withTransaction(async (conn) => {
            await conn.query(`DELETE FROM tournament_standings WHERE tournament_id = ?`, [id]);
            await conn.query(`DELETE FROM games WHERE tournament_id = ?`, [id]);
            await conn.query(`DELETE FROM tournament WHERE id = ?`, [id]);
        });

        res.status(204).send();

    } catch (error) {
        handleError(res, error);
    }
});

// =========================
// GET /api/tournaments/:id/standings
// =========================
// Teams ranked by wins, then total points scored.

router.get('/:id/standings', async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) throw new HttpError(400, 'Invalid tournament id');

        const tournament = await findTournament(pool, id);
        if (!tournament) throw new HttpError(404, 'Tournament not found');

        res.json(await fetchStandings(pool, id));

    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;

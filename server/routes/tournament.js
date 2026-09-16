const express = require('express');
const pool = require('../db/db');
const requireAuth = require('../middleware/requireAuth');
const { toScheduleGame } = require('../lib/gameFormat');

const router = express.Router();

function toTournamentSummary(row) {
    return {
        id: String(row.tournament_id),
        name: row.name,
        date_created: row.date_created,
    };
}

// Get all tournaments
router.get('/', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT tournament_id, name, date_created
             FROM tournament
             ORDER BY date_created DESC`
        );

        res.json(rows.map(toTournamentSummary));

    } catch (error) {
        console.error('Error getting tournaments:', error);

        res.status(500).json({
            error: error.message
        });
    }
});

// ---------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------

// Generate the games
function generateRoundRobinGames(teams) {
    const games = [];

    // If odd number of teams, add a BYE
    const teamsWithBye = [...teams];

    if (teamsWithBye.length % 2 !== 0) {
        teamsWithBye.push(null);
    }

    const numberOfTeams = teamsWithBye.length;
    const numberOfRounds = numberOfTeams - 1;
    const gamesPerRound = numberOfTeams / 2;

    let rotation = [...teamsWithBye];

    for (let round = 0; round < numberOfRounds; round++) {
        for (let i = 0; i < gamesPerRound; i++) {
            const homeTeam = rotation[i];
            const awayTeam = rotation[numberOfTeams - 1 - i];

            // Skip BYE games
            if (homeTeam && awayTeam) {
                games.push({
                    home_team_id: homeTeam.id,
                    away_team_id: awayTeam.id
                });
            }
        }

        // Keep the first team fixed and rotate the rest
        rotation = [
            rotation[0],
            rotation[numberOfTeams - 1],
            ...rotation.slice(1, numberOfTeams - 1)
        ];
    }

    return games;
}

// Create a tournament and generate games
router.post('/create', requireAuth, async (req, res) => {
    
    const connection = await pool.getConnection();

    try {
        const { name } = req.body;

        console.log("creation");

        if (!name || !name.trim()) {
            return res.status(400).json({
                error: 'Tournament name is required'
            });
        }

        await connection.beginTransaction();

        // 1. Generate tournament name
        const [countRows] = await connection.query(
            `SELECT COUNT(*) AS count
             FROM tournament`
        );

        const tournamentNumber = Number(countRows[0].count) + 1;
        const tournamentName = `${name.trim()}_${tournamentNumber}`;

        // 2. Create tournament
        const [tournamentResult] = await connection.query(
            `INSERT INTO tournament
                (user_id, name, status, date_created)
             VALUES (?, ?, ?, NOW())`,
            [
                req.user.id,
                tournamentName,
                'open'
            ]
        );

        const tournamentId = tournamentResult.insertId;

        // 3. Get all teams
        const [teams] = await connection.query(
            `SELECT id, name
             FROM teams
             ORDER BY id`
        );

        if (teams.length < 2) {
            await connection.rollback();

            return res.status(400).json({
                error: 'At least 2 teams are required'
            });
        }

        // 4. Generate round-robin games
        const games = generateRoundRobinGames(teams);

        // 5. Insert games
        for (const game of games) {
            await connection.query(
                `INSERT INTO games (
                    tournament_id,
                    home_team_id,
                    away_team_id,
                    game_date,
                    home_team_score,
                    away_team_score,
                    descriptions
                )
                VALUES (?, ?, ?, NOW(), 0, 0, ?)`,
                [
                    tournamentId,
                    game.home_team_id,
                    game.away_team_id,
                    tournamentName
                ]
            );
        }

        // 6. Create standings for every team
        for (const team of teams) {
            await connection.query(
                `INSERT INTO tournament_standings (
                    tournament_id,
                    team_id,
                    win,
                    loss,
                    draw
                )
                VALUES (?, ?, 0, 0, 0)`,
                [
                    tournamentId,
                    team.id
                ]
            );
        }

        await connection.commit();

        // Log generated games
        console.log(`Tournament: ${tournamentName}`);

        games.forEach((game, index) => {
            const homeTeam = teams.find(
                team => team.id === game.home_team_id
            );

            const awayTeam = teams.find(
                team => team.id === game.away_team_id
            );

            console.log(
                `${index + 1}. ${homeTeam.name} vs ${awayTeam.name}`
            );
        });

        res.status(201).json({
            id: tournamentId,
            name: tournamentName,
            status: 'open',
            teams: teams.length,
            games: games.length
        });

    } catch (error) {
        await connection.rollback();

        console.error('Error creating tournament:', error);

        res.status(500).json({
            error: 'Failed to create tournament'
        });

    } finally {
        connection.release();
    }
});

// ---------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------

function simulateGame() {
    let homeScore = Math.floor(Math.random() * 40);
    let awayScore = Math.floor(Math.random() * 40);

    // Allow draws, but don't allow 0-0
    if (homeScore === 0 && awayScore === 0) {
        homeScore = 1;
    }

    return {
        homeScore,
        awayScore
    };
}

// Get tournament by id and simulate its existing games
// Example: /api/tournaments/3/simulation
router.get('/:id/simulation', requireAuth, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;

        console.log('Simulating tournament:', id);

        await connection.beginTransaction();

        // --------------------------------
        // 1. Get existing tournament
        // --------------------------------

        const [tournamentRows] = await connection.query(
            `SELECT tournament_id, name, status
             FROM tournament
             WHERE tournament_id = ?`,
            [id]
        );

        if (tournamentRows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                error: 'Tournament not found'
            });
        }

        const tournament = tournamentRows[0];

        // --------------------------------
        // 2. Get EXISTING games
        // --------------------------------

        const [games] = await connection.query(
            `SELECT
                g.id,
                g.round,
                g.home_team_id,
                g.away_team_id,
                g.home_team_score,
                g.away_team_score,
                ht.name AS home_team,
                at.name AS away_team
             FROM games g
             INNER JOIN teams ht
                ON g.home_team_id = ht.id
             INNER JOIN teams at
                ON g.away_team_id = at.id
             WHERE g.tournament_id = ?
             ORDER BY g.round, g.id`,
            [id]
        );

        if (games.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                error: 'No games found for this tournament'
            });
        }

        console.log(`Found ${games.length} existing games`);

        const simulatedGames = [];

        // --------------------------------
        // 3. Simulate EXISTING games
        // --------------------------------

        for (const game of games) {

            const {
                homeScore,
                awayScore
            } = simulateGame();

            let result;

            if (homeScore > awayScore) {
                result = 'home_win';
            } else if (awayScore > homeScore) {
                result = 'away_win';
            } else {
                result = 'draw';
            }

            console.log(
                `${game.home_team} ${homeScore} - ${awayScore} ${game.away_team}`
            );

            // --------------------------------
            // Update existing game
            // --------------------------------

            await connection.query(
                `UPDATE games
                 SET
                    home_team_score = ?,
                    away_team_score = ?
                 WHERE id = ?
                   AND tournament_id = ?`,
                [
                    homeScore,
                    awayScore,
                    game.id,
                    id
                ]
            );

            // --------------------------------
            // Update standings
            // --------------------------------

            if (result === 'home_win') {

                // Home team WIN + home score
                await connection.query(
                    `UPDATE tournament_standings
                     SET
                        win = win + 1,
                        score = score + ?
                     WHERE tournament_id = ?
                       AND team_id = ?`,
                    [
                        homeScore,
                        id,
                        game.home_team_id
                    ]
                );

                // Away team LOSS + away score
                await connection.query(
                    `UPDATE tournament_standings
                     SET
                        loss = loss + 1,
                        score = score + ?
                     WHERE tournament_id = ?
                       AND team_id = ?`,
                    [
                        awayScore,
                        id,
                        game.away_team_id
                    ]
                );
            }

            else if (result === 'away_win') {

                // Away team WIN + away score
                await connection.query(
                    `UPDATE tournament_standings
                     SET
                        win = win + 1,
                        score = score + ?
                     WHERE tournament_id = ?
                       AND team_id = ?`,
                    [
                        awayScore,
                        id,
                        game.away_team_id
                    ]
                );

                // Home team LOSS + home score
                await connection.query(
                    `UPDATE tournament_standings
                     SET
                        loss = loss + 1,
                        score = score + ?
                     WHERE tournament_id = ?
                       AND team_id = ?`,
                    [
                        homeScore,
                        id,
                        game.home_team_id
                    ]
                );
            }

            else {

                // Both teams DRAW.
                // Each team gets its own score.
                await connection.query(
                    `UPDATE tournament_standings
                     SET
                        draw = draw + 1,
                        score = score + ?
                     WHERE tournament_id = ?
                       AND team_id = ?`,
                    [
                        homeScore,
                        id,
                        game.home_team_id
                    ]
                );

                await connection.query(
                    `UPDATE tournament_standings
                     SET
                        draw = draw + 1,
                        score = score + ?
                     WHERE tournament_id = ?
                       AND team_id = ?`,
                    [
                        awayScore,
                        id,
                        game.away_team_id
                    ]
                );
            }

            simulatedGames.push({
                id: String(game.id),
                round: game.round,

                homeTeam: {
                    id: String(game.home_team_id),
                    name: game.home_team,
                    score: homeScore
                },

                awayTeam: {
                    id: String(game.away_team_id),
                    name: game.away_team,
                    score: awayScore
                },

                result
            });
        }

        // --------------------------------
        // 4. Get updated standings
        // --------------------------------

        const [standings] = await connection.query(
            `SELECT
                ts.team_id,
                t.name AS team,
                ts.win,
                ts.loss,
                ts.draw,
                ts.score
             FROM tournament_standings ts
             INNER JOIN teams t
                ON ts.team_id = t.id
             WHERE ts.tournament_id = ?
             ORDER BY ts.win DESC, ts.draw DESC, ts.score DESC`,
            [id]
        );

        // --------------------------------
        // 5. Commit updates
        // --------------------------------

        await connection.commit();

        // --------------------------------
        // 6. Return results
        // --------------------------------

        res.json({
            tournament: {
                id: String(tournament.tournament_id),
                name: tournament.name,
                status: tournament.status
            },

            games: simulatedGames,

            standings: standings.map(row => ({
                teamId: String(row.team_id),
                team: row.team,
                win: row.win,
                loss: row.loss,
                draw: row.draw,
                score: row.score
            }))
        });

    } catch (error) {
        await connection.rollback();

        console.error(
            'Error simulating tournament:',
            error
        );

        res.status(500).json({
            error: 'Failed to simulate tournament'
        });

    } finally {
        connection.release();
    }
});

// ---------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------

// Get tournament by id, including its games
// Example: /api/tournaments/3
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT
                tournament_id,
                name,
                date_created
             FROM tournament
             WHERE tournament_id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Tournament not found'
            });
        }

        const [gameRows] = await pool.query(
            `SELECT *
             FROM view_teams_with_games
             WHERE tournament_id = ?`,
            [id]
        );

        res.json({
            id: String(rows[0].tournament_id),
            name: rows[0].name,
            date_created: rows[0].date_created,

            games: gameRows.map((row) => ({
                id: String(row.game_id),

                homeTeam: {
                    id: String(row.home_team_id),
                    name: row.home_team,
                    score: row.home_team_score
                },

                awayTeam: {
                    id: String(row.away_team_id),
                    name: row.away_team,
                    score: row.away_team_score
                },

                gameDate: row.game_date,
                location: row.location,
                status: row.status
            }))
        });

    } catch (error) {
        console.error('Error getting tournament:', error);

        res.status(500).json({
            error: error.message
        });
    }
});

router.get('/:id/standings', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [standings] = await pool.query(
            `SELECT
                ts.team_id,
                t.name AS team,
                ts.win,
                ts.loss,
                ts.draw,
                ts.score,
                (
                    ts.win + 0.5 * ts.draw
                ) / NULLIF(
                    ts.win + ts.loss + ts.draw,
                    0
                ) AS win_percentage
             FROM tournament_standings ts
             INNER JOIN teams t
                ON ts.team_id = t.id
             WHERE ts.tournament_id = ?
             ORDER BY
                win_percentage DESC,
                ts.score DESC,
                ts.win DESC`,
            [id]
        );

        res.json(
            standings.map((row, index) => ({
                position: index + 1,
                teamId: String(row.team_id),
                team: row.team,
                win: row.win,
                loss: row.loss,
                draw: row.draw,
                score: row.score,
                winPercentage: Number(row.win_percentage)
            }))
        );

    } catch (error) {
        console.error('Error getting standings:', error);

        res.status(500).json({
            error: error.message
        });
    }
});

// Delete a tournament created by the current user
router.delete('/:id/delete', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            `DELETE FROM tournament
             WHERE tournament_id = ?
             AND user_id = ?`,
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Tournament not found or you do not have permission to delete it'
            });
        }

        res.status(204).send();

    } catch (error) {
        console.error('Error deleting tournament:', error);

        res.status(500).json({
            error: 'Failed to delete tournament'
        });
    }
});

module.exports = router;
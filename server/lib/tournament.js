// Single-elimination bracket helpers. Pure functions only (no database
// access) so the rules can be unit tested on their own.
//
// A tournament game is "decided" once its scores differ. Elimination games
// cannot end in a draw, so 0-0 (the column default) means "not played yet".

const MIN_TEAMS = 2;
const MAX_TEAMS = 32;
const DAYS_BETWEEN_ROUNDS = 7;
const MAX_SIMULATED_SCORE = 5;

function pad(value) {
    return String(value).padStart(2, '0');
}

// A single-elimination bracket needs a power-of-two field (2, 4, 8, ...).
function isValidTeamCount(count) {
    return Number.isInteger(count)
        && count >= MIN_TEAMS
        && count <= MAX_TEAMS
        && (count & (count - 1)) === 0;
}

function totalRounds(teamCount) {
    return Math.log2(teamCount);
}

function roundLabel(round, rounds) {
    switch (rounds - round) {
        case 0: return 'Final Match';
        case 1: return 'Semi-Final Match';
        case 2: return 'Quarter-Final Match';
        default: return `Round ${round} Match`;
    }
}

// [a, b, c, d] -> [[a, b], [c, d]]. The order of the team list is the
// bracket order, and the first team in each pair is the home team.
function pairTeams(teamIds) {
    const pairs = [];
    for (let i = 0; i < teamIds.length; i += 2) {
        pairs.push([teamIds[i], teamIds[i + 1]]);
    }
    return pairs;
}

function isDecided(game) {
    return game.home_team_score !== game.away_team_score;
}

function winnerOf(game) {
    return game.home_team_score > game.away_team_score
        ? game.home_team_id
        : game.away_team_id;
}

// Random 0..MAX score for each side, re-rolled until there is a winner.
function simulateScores(random = Math.random) {
    const roll = () => Math.floor(random() * (MAX_SIMULATED_SCORE + 1));
    let home = roll();
    let away = roll();

    while (home === away) {
        away = roll();
    }

    return { home, away };
}

// More wins means a deeper run in the bracket; total points scored breaks
// ties between teams knocked out in the same round.
function rankStandings(rows) {
    return [...rows].sort((a, b) =>
        b.win - a.win || b.score - a.score || a.teamId - b.teamId
    );
}

function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// Translates a joined games row (view_teams_with_games) into the API shape.
function toTournamentGame(row) {
    const gameDate = new Date(row.game_date);
    const decided = isDecided(row);

    return {
        id: String(row.game_id),
        round: row.round,
        description: row.descriptions,
        homeTeamId: String(row.home_team_id),
        homeTeamName: row.home_team_name,
        awayTeamId: String(row.away_team_id),
        awayTeamName: row.away_team_name,
        // Local getters, matching gameFormat.js, so date and time agree.
        date: [
            gameDate.getFullYear(),
            pad(gameDate.getMonth() + 1),
            pad(gameDate.getDate()),
        ].join('-'),
        time: `${pad(gameDate.getHours())}:${pad(gameDate.getMinutes())}`,
        location: row.location,
        homeScore: row.home_team_score,
        awayScore: row.away_team_score,
        status: decided ? 'completed' : 'scheduled',
        winnerTeamId: decided ? String(winnerOf(row)) : null,
    };
}

module.exports = {
    MIN_TEAMS,
    MAX_TEAMS,
    DAYS_BETWEEN_ROUNDS,
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
};

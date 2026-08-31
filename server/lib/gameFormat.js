// Translates a `games` row (one row per matchup: home_team_id/away_team_id)
// into the per-team shape the frontend expects (opponent name + homeAway),
// from the perspective of `myTeamId`.

function pad(value) {
    return String(value).padStart(2, '0');
}

function toScheduleGame(row, myTeamId) {
    const isHome = row.home_team_id === myTeamId;
    const gameDate = new Date(row.game_date);

    // Use local getters consistently for both date and time — mixing
    // toISOString() (UTC) with toTimeString() (local) shifts the date
    // by a day whenever the server's timezone isn't UTC.
    const date = [
        gameDate.getFullYear(),
        pad(gameDate.getMonth() + 1),
        pad(gameDate.getDate()),
    ].join('-');
    const time = `${pad(gameDate.getHours())}:${pad(gameDate.getMinutes())}`;

    return {
        id: String(row.id),
        opponent: isHome ? row.away_team_name : row.home_team_name,
        date,
        time,
        location: row.location,
        homeAway: isHome ? 'home' : 'away',
    };
}

module.exports = { toScheduleGame };

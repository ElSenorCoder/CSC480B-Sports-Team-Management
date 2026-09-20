// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
} = require('./tournament');

const game = (home, away, homeScore, awayScore) => ({
    home_team_id: home,
    away_team_id: away,
    home_team_score: homeScore,
    away_team_score: awayScore,
});

test('only power-of-two fields between 2 and 32 are valid', () => {
    for (const count of [2, 4, 8, 16, 32]) assert.equal(isValidTeamCount(count), true);
    for (const count of [0, 1, 3, 5, 6, 12, 64, -4, 2.5]) assert.equal(isValidTeamCount(count), false);
});

test('rounds and labels', () => {
    assert.equal(totalRounds(4), 2);
    assert.equal(totalRounds(16), 4);
    assert.equal(roundLabel(2, 2), 'Final Match');
    assert.equal(roundLabel(1, 2), 'Semi-Final Match');
    assert.equal(roundLabel(1, 3), 'Quarter-Final Match');
    assert.equal(roundLabel(1, 4), 'Round 1 Match');
});

test('pairTeams pairs neighbours in bracket order', () => {
    assert.deepEqual(pairTeams([1, 2, 3, 4]), [[1, 2], [3, 4]]);
});

test('a game is decided only when the scores differ', () => {
    assert.equal(isDecided(game(1, 2, 0, 0)), false);
    assert.equal(isDecided(game(1, 2, 3, 3)), false);
    assert.equal(isDecided(game(1, 2, 3, 2)), true);
    assert.equal(winnerOf(game(1, 2, 3, 2)), 1);
    assert.equal(winnerOf(game(1, 2, 2, 3)), 2);
});

test('simulateScores never produces a draw and stays in range', () => {
    for (let i = 0; i < 1000; i++) {
        const { home, away } = simulateScores();
        assert.notEqual(home, away);
        assert.ok(home >= 0 && home <= 5 && away >= 0 && away <= 5);
    }
});

test('simulateScores re-rolls a tie', () => {
    const rolls = [0.5, 0.5, 0.9];
    const { home, away } = simulateScores(() => rolls.shift());
    assert.deepEqual({ home, away }, { home: 3, away: 5 });
});

test('rankStandings orders by wins, then points scored, then team id', () => {
    const ranked = rankStandings([
        { teamId: 4, win: 0, loss: 1, draw: 0, score: 3 },
        { teamId: 2, win: 0, loss: 1, draw: 0, score: 78 },
        { teamId: 3, win: 2, loss: 0, draw: 0, score: 9 },
        { teamId: 1, win: 1, loss: 1, draw: 0, score: 84 },
    ]);

    assert.deepEqual(ranked.map((row) => row.teamId), [3, 1, 2, 4]);
});

test('date and time validation', () => {
    assert.equal(isValidDate('2026-09-27'), true);
    assert.equal(isValidDate('2026-02-30'), false);
    assert.equal(isValidDate('09/27/2026'), false);
    assert.equal(isValidDate(undefined), false);
    assert.equal(isValidTime('18:00'), true);
    assert.equal(isValidTime('24:00'), false);
    assert.equal(isValidTime('6pm'), false);
});

test('toTournamentGame reports status and winner', () => {
    const row = {
        game_id: 7,
        round: 1,
        descriptions: 'Semi-Final Match',
        home_team_id: 1,
        home_team_name: 'Thunderbolts',
        away_team_id: 2,
        away_team_name: 'Vipers',
        game_date: new Date(2026, 8, 15, 18, 0),
        location: 'Main Arena Stadium',
        home_team_score: 84,
        away_team_score: 78,
    };

    assert.deepEqual(toTournamentGame(row), {
        id: '7',
        round: 1,
        description: 'Semi-Final Match',
        homeTeamId: '1',
        homeTeamName: 'Thunderbolts',
        awayTeamId: '2',
        awayTeamName: 'Vipers',
        date: '2026-09-15',
        time: '18:00',
        location: 'Main Arena Stadium',
        homeScore: 84,
        awayScore: 78,
        status: 'completed',
        winnerTeamId: '1',
    });

    const pending = toTournamentGame({ ...row, home_team_score: 0, away_team_score: 0 });
    assert.equal(pending.status, 'scheduled');
    assert.equal(pending.winnerTeamId, null);
});

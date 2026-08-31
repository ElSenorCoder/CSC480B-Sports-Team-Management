import { FormEvent, useEffect, useState } from "react";
import {
  addGame,
  deleteGame,
  getManagedSchedule,
  getManagedTeam,
  searchTeams,
  type Game,
  type Team,
} from "../lib/mockPlayerData";

export function CoachSchedulePage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [opponentTeamId, setOpponentTeamId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [homeAway, setHomeAway] = useState<Game["homeAway"]>("home");
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([getManagedTeam(), getManagedSchedule(), searchTeams({})])
      .then(([teamData, gamesData, teamsData]) => {
        setTeam(teamData);
        setGames(gamesData);
        setAllTeams(teamsData.filter((t) => t.id !== teamData.id));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load schedule."));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!opponentTeamId || !date || !time.trim() || !location.trim()) return;

    try {
      await addGame({ opponentTeamId, date, time: time.trim(), location: location.trim(), homeAway });
      setOpponentTeamId("");
      setDate("");
      setTime("");
      setLocation("");
      setHomeAway("home");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add game.");
    }
  }

  async function handleDelete(gameId: string) {
    try {
      await deleteGame(gameId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove game.");
    }
  }

  if (error && !team) {
    return (
      <main className="dashboard-main">
        <p className="form-error">{error}</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="dashboard-main">
        <p className="empty-note">Loading schedule…</p>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Schedule</p>
          <h1>Manage {team.name} schedule</h1>
          <p>Add new games or remove games from the schedule.</p>
        </div>
        <span className="session-badge">{games.length} games</span>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <form className="form-stack search-form" onSubmit={handleAddGame}>
        <div className="form-field">
          <label htmlFor="game-opponent">Opponent</label>
          <select
            id="game-opponent"
            className="form-input"
            value={opponentTeamId}
            onChange={(e) => setOpponentTeamId(e.target.value)}
          >
            <option value="">Select a team…</option>
            {allTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="game-date">Date</label>
          <input id="game-date" className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="game-time">Time</label>
          <input id="game-time" className="form-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="game-location">Location</label>
          <input id="game-location" className="form-input" type="text" placeholder="Venue" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="game-home-away">Home / Away</label>
          <select
            id="game-home-away"
            className="form-input"
            value={homeAway}
            onChange={(e) => setHomeAway(e.target.value as Game["homeAway"])}
          >
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>
        </div>
        <button className="submit-button" type="submit">
          <span>Add game</span>
        </button>
      </form>

      <ul className="game-list">
        {games.map((game) => (
          <li key={game.id} className="game-row">
            <span className={`badge badge-${game.homeAway}`}>{game.homeAway === "home" ? "Home" : "Away"}</span>
            <div>
              <strong>vs {game.opponent}</strong>
              <small>{game.location}</small>
            </div>
            <div className="game-when">
              <strong>{game.date}</strong>
              <small>{game.time}</small>
            </div>
            <button className="link-button" type="button" onClick={() => handleDelete(game.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

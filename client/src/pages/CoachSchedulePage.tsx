import { FormEvent, useState } from "react";
import { addGame, deleteGame, getManagedSchedule, getManagedTeam, type Game } from "../lib/mockPlayerData";

export function CoachSchedulePage() {
  const team = getManagedTeam();
  const [games, setGames] = useState(getManagedSchedule());
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [homeAway, setHomeAway] = useState<Game["homeAway"]>("home");

  function refresh() {
    setGames(getManagedSchedule());
  }

  function handleAddGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!opponent.trim() || !date || !time.trim() || !location.trim()) return;

    addGame({ opponent: opponent.trim(), date, time: time.trim(), location: location.trim(), homeAway });
    setOpponent("");
    setDate("");
    setTime("");
    setLocation("");
    setHomeAway("home");
    refresh();
  }

  function handleDelete(gameId: string) {
    deleteGame(gameId);
    refresh();
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

      <form className="form-stack search-form" onSubmit={handleAddGame}>
        <div className="form-field">
          <label htmlFor="game-opponent">Opponent</label>
          <input id="game-opponent" className="form-input" type="text" placeholder="e.g. Wolves" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="game-date">Date</label>
          <input id="game-date" className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="game-time">Time</label>
          <input id="game-time" className="form-input" type="text" placeholder="e.g. 6:00 PM" value={time} onChange={(e) => setTime(e.target.value)} />
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

import { FormEvent, useState } from "react";
import { addPlayerToRoster, getManagedTeam, removePlayerFromRoster } from "../lib/mockPlayerData";

export function CoachRosterPage() {
  const [team, setTeam] = useState(getManagedTeam());
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [email, setEmail] = useState("");

  function refresh() {
    setTeam({ ...getManagedTeam() });
  }

  function handleAddPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !position.trim() || !jerseyNumber.trim()) return;

    addPlayerToRoster({
      name: name.trim(),
      position: position.trim(),
      jerseyNumber: Number(jerseyNumber),
      email: email.trim(),
    });
    setName("");
    setPosition("");
    setJerseyNumber("");
    setEmail("");
    refresh();
  }

  function handleRemove(playerId: string) {
    removePlayerFromRoster(playerId);
    refresh();
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Roster</p>
          <h1>Manage {team.name} roster</h1>
          <p>Add new players or remove players from the team.</p>
        </div>
        <span className="session-badge">{team.roster.length} players</span>
      </div>

      <form className="form-stack search-form" onSubmit={handleAddPlayer}>
        <div className="form-field">
          <label htmlFor="player-name">Name</label>
          <input id="player-name" className="form-input" type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="player-position">Position</label>
          <input id="player-position" className="form-input" type="text" placeholder="e.g. Forward" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="player-jersey">Jersey #</label>
          <input id="player-jersey" className="form-input" type="number" min="0" placeholder="00" value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="player-email">Email</label>
          <input id="player-email" className="form-input" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="submit-button" type="submit">
          <span>Add player</span>
        </button>
      </form>

      <ul className="game-list">
        {team.roster.map((player) => (
          <li key={player.id} className="game-row">
            <div>
              <strong>{player.name}</strong>
              <small>{player.position} · #{player.jerseyNumber}</small>
            </div>
            <div className="game-when">
              <small>{player.email}</small>
            </div>
            <button className="link-button" type="button" onClick={() => handleRemove(player.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

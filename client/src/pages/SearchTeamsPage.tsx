import { FormEvent, useEffect, useState } from "react";
import {
  getMyTeams,
  getTeamById,
  requestToJoinTeam,
  searchTeams,
  type MyTeam,
  type Team,
} from "../lib/mockPlayerData";

export function SearchTeamsPage() {
  const [name, setName] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [myTeams, setMyTeams] = useState<MyTeam[]>([]);
  const [selected, setSelected] = useState<Team | null>(null);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyTeams().then(setMyTeams).catch(() => setMyTeams([]));
    searchTeams({}).then(setResults).catch((err) => setError(err instanceof Error ? err.message : "Search failed."));
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    searchTeams({ name })
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err.message : "Search failed."));
    setSelected(null);
  }

  function handleSelectTeam(team: Team) {
    getTeamById(team.id)
      .then(setSelected)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load team."));
  }

  async function handleRequestToJoin(teamId: string) {
    setRequesting(true);
    try {
      await requestToJoinTeam(teamId);
      setRequestedIds((ids) => [...ids, teamId]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Find a team</p>
          <h1>Search for other teams</h1>
          <p>Search by name, then request to join a team.</p>
        </div>
      </div>

      <form className="form-stack search-form" onSubmit={handleSearch}>
        <div className="form-field">
          <label htmlFor="search-name">Team name</label>
          <input
            id="search-name"
            className="form-input"
            type="text"
            placeholder="e.g. Vipers"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <button className="submit-button" type="submit">
          <span>Search</span>
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="card-grid" aria-label="Search results">
        {results.length === 0 ? (
          <p className="empty-note">No teams matched your search.</p>
        ) : (
          results.map((team) => (
            <button
              key={team.id}
              type="button"
              className="person-card"
              onClick={() => handleSelectTeam(team)}
              aria-current={selected?.id === team.id}
            >
              <span className="person-avatar" aria-hidden="true">
                {team.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{team.name}</strong>
                <small>{team.description ?? "No description"}</small>
              </span>
            </button>
          ))
        )}
      </section>

      {selected ? (
        <section className="session-panel" aria-labelledby="team-title">
          <div>
            <p className="dashboard-eyebrow">Team</p>
            <h2 id="team-title">{selected.name}</h2>
            <ul className="status-list">
              {(selected.roster ?? []).map((player) => (
                <li key={player.id}>
                  <span>{player.name}</span>
                  <strong>{player.position ?? "Not set"} · #{player.jerseyNumber ?? "—"}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div>
            {myTeams.some((team) => team.id === selected.id) ? (
              <span className="pill pill-neutral">Your team</span>
            ) : requestedIds.includes(selected.id) ? (
              <span className="pill pill-sent">Request sent</span>
            ) : (
              <button
                className="submit-button"
                type="button"
                disabled={requesting}
                onClick={() => handleRequestToJoin(selected.id)}
              >
                <span>{requesting ? "Sending…" : "Request to join"}</span>
              </button>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}

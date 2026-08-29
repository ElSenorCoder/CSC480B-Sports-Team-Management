import { FormEvent, useState } from "react";
import { isMyTeam, requestToJoinTeam, searchTeams, type Team } from "../lib/mockPlayerData";

export function SearchTeamsPage() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<Team[]>(() => searchTeams({}));
  const [selected, setSelected] = useState<Team | null>(null);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResults(searchTeams({ name, city }));
    setSelected(null);
  }

  function handleRequestToJoin(teamId: string) {
    requestToJoinTeam(teamId);
    setRequestedIds((ids) => [...ids, teamId]);
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Find a team</p>
          <h1>Search for other teams</h1>
          <p>Search by name or city, then request to join a team.</p>
        </div>
      </div>

      <form className="form-stack search-form" onSubmit={handleSearch}>
        <div className="form-field">
          <label htmlFor="search-name">Team name</label>
          <input
            id="search-name"
            className="form-input"
            type="text"
            placeholder="e.g. Bears"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="search-city">City</label>
          <input
            id="search-city"
            className="form-input"
            type="text"
            placeholder="e.g. Chicago"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>
        <button className="submit-button" type="submit">
          <span>Search</span>
        </button>
      </form>

      <section className="card-grid" aria-label="Search results">
        {results.length === 0 ? (
          <p className="empty-note">No teams matched your search.</p>
        ) : (
          results.map((team) => (
            <button
              key={team.id}
              type="button"
              className="person-card"
              onClick={() => setSelected(team)}
              aria-current={selected?.id === team.id}
            >
              <span className="person-avatar" aria-hidden="true">
                {team.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{team.name}</strong>
                <small>{team.city} · {team.roster.length} players</small>
              </span>
            </button>
          ))
        )}
      </section>

      {selected ? (
        <section className="session-panel" aria-labelledby="team-title">
          <div>
            <p className="dashboard-eyebrow">Team</p>
            <h2 id="team-title">{selected.name} · {selected.city}</h2>
            <ul className="status-list">
              {selected.roster.map((player) => (
                <li key={player.id}>
                  <span>{player.name}</span>
                  <strong>{player.position} · #{player.jerseyNumber}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div>
            {isMyTeam(selected.id) ? (
              <span className="pill pill-neutral">Your team</span>
            ) : requestedIds.includes(selected.id) ? (
              <span className="pill pill-sent">Request sent</span>
            ) : (
              <button
                className="submit-button"
                type="button"
                onClick={() => handleRequestToJoin(selected.id)}
              >
                <span>Request to join</span>
              </button>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}

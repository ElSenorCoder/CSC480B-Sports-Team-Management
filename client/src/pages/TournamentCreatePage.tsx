import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authUserStorage } from "../lib/auth/tokenStorage";
import { searchTeams, type Team } from "../lib/mockPlayerData";
import { createTournament } from "../lib/tournamentApi";
import {
  VALID_TEAM_COUNTS,
  isValidTeamCount,
  pairUp,
} from "../lib/tournamentBracket";

export function TournamentCreatePage() {
  const navigate = useNavigate();
  const role = authUserStorage.get()?.role;
  const canCreate = role === "coach" || role === "administrator";

  const [teams, setTeams] = useState<Team[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    searchTeams({})
      .then(setTeams)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load teams."),
      );
  }, []);

  if (!canCreate) {
    return (
      <main className="dashboard-main">
        <p className="form-error">
          Only coaches and administrators can create tournaments.
        </p>
        <p>
          <Link className="link-button muted-link" to="/tournaments">
            Back to tournaments
          </Link>
        </p>
      </main>
    );
  }

  if (!teams) {
    return (
      <main className="dashboard-main">
        {error ? <p className="form-error">{error}</p> : <p className="empty-note">Loading teams…</p>}
      </main>
    );
  }

  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? id;
  const countValid = isValidTeamCount(selected.length);
  const ready = countValid && name.trim() !== "" && startDate !== "";
  const matchups = pairUp(selected);

  function toggleTeam(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((teamId) => teamId !== id) : [...current, id],
    );
  }

  function move(index: number, offset: -1 | 1) {
    setSelected((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await createTournament({
        name: name.trim(),
        teamIds: selected,
        startDate,
        time,
        location: location.trim() || undefined,
      });
      navigate(`/tournaments/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tournament.");
      setSubmitting(false);
    }
  }

  const countHint = countValid
    ? `${selected.length} teams selected`
    : `${selected.length} selected. Choose ${VALID_TEAM_COUNTS.join(", ")} teams.`;

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Compete</p>
          <h1>New tournament</h1>
          <p>
            Pick the teams and their bracket order. The first round is created
            now; later rounds are created as winners are decided.
          </p>
        </div>
        <Link className="link-button muted-link" to="/tournaments">
          Cancel
        </Link>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <form className="tournament-form" onSubmit={handleSubmit}>
        <div className="form-stack search-form">
          <div className="form-field">
            <label htmlFor="t-name">Tournament name</label>
            <input
              id="t-name"
              className="form-input"
              type="text"
              maxLength={100}
              placeholder="Fall Championship"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="form-field">
            <label htmlFor="t-date">First round date</label>
            <input
              id="t-date"
              className="form-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="form-field">
            <label htmlFor="t-time">Start time</label>
            <input
              id="t-time"
              className="form-input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="form-field">
            <label htmlFor="t-location">Location (optional)</label>
            <input
              id="t-location"
              className="form-input"
              type="text"
              placeholder="Main Arena"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="picker-grid">
          <fieldset className="picker-panel">
            <legend>Teams</legend>
            <ul className="picker-list">
              {teams.map((team) => (
                <li key={team.id}>
                  <label className="picker-option">
                    <input
                      type="checkbox"
                      checked={selected.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      disabled={submitting}
                    />
                    <span>{team.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <section className="picker-panel" aria-labelledby="bracket-order">
            <h2 id="bracket-order" className="picker-title">Bracket order</h2>
            <p className={countValid ? "picker-hint picker-hint-ok" : "picker-hint"} aria-live="polite">
              {countHint}
            </p>
            {selected.length === 0 ? (
              <p className="empty-note">Select teams to build the bracket.</p>
            ) : (
              <ol className="matchup-list">
                {selected.map((id, index) => (
                  <li key={id} className={index % 2 === 1 ? "matchup-second" : "matchup-first"}>
                    <span className="matchup-seed">{index + 1}</span>
                    <span className="matchup-name">{teamName(id)}</span>
                    <span className="matchup-controls">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Move ${teamName(id)} up`}
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || submitting}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Move ${teamName(id)} down`}
                        onClick={() => move(index, 1)}
                        disabled={index === selected.length - 1 || submitting}
                      >
                        ↓
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {matchups.length > 0 ? (
              <p className="picker-hint">
                Round 1:{" "}
                {matchups.map(([a, b]) => `${teamName(a)} vs ${teamName(b)}`).join(" · ")}
              </p>
            ) : null}
          </section>
        </div>

        <button className="submit-button tournament-submit" type="submit" disabled={!ready || submitting}>
          <span>{submitting ? "Creating…" : "Create tournament"}</span>
        </button>
      </form>
    </main>
  );
}

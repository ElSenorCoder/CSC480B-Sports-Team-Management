import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTeamById, getTeamSchedule, type Game } from "../lib/mockPlayerData";

function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr).getTime() >= new Date().setHours(0, 0, 0, 0);
}

export function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const [teamName, setTeamName] = useState<string | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getTeamById(id), getTeamSchedule(id)])
      .then(([team, gamesData]) => {
        setTeamName(team.name);
        setGames(gamesData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load schedule."));
  }, [id]);

  if (error) {
    return (
      <main className="dashboard-main">
        <p className="form-error">{error}</p>
      </main>
    );
  }

  if (!games) {
    return (
      <main className="dashboard-main">
        <p className="empty-note">Loading schedule…</p>
      </main>
    );
  }

  const upcoming = games.filter((game) => isUpcoming(game.date));
  const past = games.filter((game) => !isUpcoming(game.date));

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Schedule</p>
          <h1>{teamName} schedule</h1>
          <p>Upcoming and past games for this team.</p>
        </div>
        <span className="session-badge">{upcoming.length} upcoming</span>
      </div>

      <section aria-labelledby="upcoming-title">
        <h2 id="upcoming-title" className="section-heading">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="empty-note">No upcoming games scheduled.</p>
        ) : (
          <ul className="game-list">
            {upcoming.map((game) => (
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="past-title">
        <h2 id="past-title" className="section-heading">Past</h2>
        {past.length === 0 ? (
          <p className="empty-note">No past games yet.</p>
        ) : (
          <ul className="game-list">
            {past.map((game) => (
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

import { useEffect, useState } from "react";
import {
  approveJoinRequest,
  getManagedTeam,
  getPendingJoinRequests,
  rejectJoinRequest,
  removePlayerFromRoster,
  type JoinRequest,
  type Team,
} from "../lib/mockPlayerData";

export function CoachRosterPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [jerseys, setJerseys] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([getManagedTeam(), getPendingJoinRequests()])
      .then(([teamData, requestsData]) => {
        setTeam(teamData);
        setRequests(requestsData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roster."));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(request: JoinRequest) {
    const position = positions[request.id]?.trim();
    const jerseyNumber = Number(jerseys[request.id]);

    if (!position || !jerseyNumber) {
      setError("Enter a position and jersey number before approving.");
      return;
    }

    try {
      await approveJoinRequest(request.id, { position, jerseyNumber });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request.");
    }
  }

  async function handleReject(request: JoinRequest) {
    try {
      await rejectJoinRequest(request.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request.");
    }
  }

  async function handleRemove(playerId: string) {
    try {
      await removePlayerFromRoster(playerId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove player.");
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
        <p className="empty-note">Loading roster…</p>
      </main>
    );
  }

  const roster = team.roster ?? [];

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Roster</p>
          <h1>Manage {team.name} roster</h1>
          <p>Approve or reject requests to join, or remove a current player.</p>
        </div>
        <span className="session-badge">{roster.length} players</span>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <h2 className="section-heading">Pending join requests</h2>
      {requests.length === 0 ? (
        <p className="empty-note">No pending requests.</p>
      ) : (
        <ul className="game-list">
          {requests.map((request) => (
            <li key={request.id} className="game-row">
              <div>
                <strong>{request.name}</strong>
                <small>{request.email}</small>
              </div>
              <input
                className="form-input"
                type="text"
                placeholder="Position"
                style={{ maxWidth: "8rem" }}
                value={positions[request.id] ?? ""}
                onChange={(e) => setPositions((p) => ({ ...p, [request.id]: e.target.value }))}
              />
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="Jersey #"
                style={{ maxWidth: "6rem" }}
                value={jerseys[request.id] ?? ""}
                onChange={(e) => setJerseys((j) => ({ ...j, [request.id]: e.target.value }))}
              />
              <button className="submit-button" type="button" style={{ width: "auto" }} onClick={() => handleApprove(request)}>
                <span>Approve</span>
              </button>
              <button className="link-button" type="button" onClick={() => handleReject(request)}>
                Reject
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-heading">Current roster</h2>
      {roster.length === 0 ? (
        <p className="empty-note">No players on this team yet.</p>
      ) : (
        <ul className="game-list">
          {roster.map((player) => (
            <li key={player.id} className="game-row">
              <div>
                <strong>{player.name}</strong>
                <small>{player.position ?? "Position not set"} · #{player.jerseyNumber ?? "—"}</small>
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
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [jerseys, setJerseys] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  function load() {
    if (!id) return;
    Promise.all([getManagedTeam(id), getPendingJoinRequests(id)])
      .then(([teamData, requestsData]) => {
        setTeam(teamData);
        setRequests(requestsData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roster."));
  }

  useEffect(() => {
    setTeam(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleApprove(request: JoinRequest) {
    if (!id) return;
    const position = positions[request.id]?.trim();
    const jerseyRaw = jerseys[request.id]?.trim();
    const jerseyNumber = Number(jerseyRaw);

    if (!position || !jerseyRaw || !Number.isFinite(jerseyNumber) || jerseyNumber < 0) {
      setError("Enter a position and a valid jersey number before approving.");
      return;
    }

    setProcessingId(request.id);
    try {
      await approveJoinRequest(id, request.id, { position, jerseyNumber });
      setError(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(request: JoinRequest) {
    if (!id) return;
    setProcessingId(request.id);
    try {
      await rejectJoinRequest(id, request.id);
      setError(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRemove(playerId: string) {
    if (!id) return;
    setProcessingId(playerId);
    try {
      await removePlayerFromRoster(id, playerId);
      setError(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove player.");
    } finally {
      setProcessingId(null);
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
        <div className="dashboard-heading-actions">
          <span className="session-badge">{roster.length} players</span>
          <Link className="link-button" to={`/coach/team/${team.id}/schedule`}>
            Manage schedule
          </Link>
        </div>
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
                disabled={processingId === request.id}
              />
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="Jersey #"
                style={{ maxWidth: "6rem" }}
                value={jerseys[request.id] ?? ""}
                onChange={(e) => setJerseys((j) => ({ ...j, [request.id]: e.target.value }))}
                disabled={processingId === request.id}
              />
              <button
                className="submit-button"
                type="button"
                style={{ width: "auto" }}
                onClick={() => handleApprove(request)}
                disabled={processingId === request.id}
              >
                <span>{processingId === request.id ? "Working…" : "Approve"}</span>
              </button>
              <button
                className="link-button"
                type="button"
                onClick={() => handleReject(request)}
                disabled={processingId === request.id}
              >
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
              <button
                className="link-button"
                type="button"
                onClick={() => handleRemove(player.id)}
                disabled={processingId === player.id}
              >
                {processingId === player.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

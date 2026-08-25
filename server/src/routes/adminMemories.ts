import {
  listAdminMemories,
  approveMemory,
  rejectMemory,
  revokeApprovedMemory,
  deleteMemoryAdmin,
} from "../services/adminMemories";

export const adminMemoriesRoutes = {
  // GET /admin/memories -> Web Dashboard UI
  "/admin/memories": () => {
    const html = getAdminDashboardHtml();
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },

  // GET /api/admin/memories -> JSON API
  "/api/admin/memories": async (req: Request) => {
    try {
      const url = new URL(req.url);
      const moderationStatus = url.searchParams.get("status") ?? "all";
      const poiId = url.searchParams.get("poiId") ?? undefined;
      const search = url.searchParams.get("search") ?? undefined;
      const limit = Number(url.searchParams.get("limit") ?? 30);
      const offset = Number(url.searchParams.get("offset") ?? 0);

      const result = await listAdminMemories({
        moderationStatus,
        poiId,
        search,
        limit,
        offset,
      });

      return Response.json(result);
    } catch (err: any) {
      return Response.json({ error: err.message || "Failed to list admin memories" }, { status: 500 });
    }
  },

  // POST /api/admin/memories/:id/approve
  "/api/admin/memories/:id/approve": async (req: Request & { params: { id: string } }) => {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    try {
      await approveMemory(req.params.id);
      return Response.json({ ok: true, id: req.params.id, moderation_status: "approved" });
    } catch (err: any) {
      return Response.json({ error: err.message || "Failed to approve memory" }, { status: 400 });
    }
  },

  // POST /api/admin/memories/:id/reject
  "/api/admin/memories/:id/reject": async (req: Request & { params: { id: string } }) => {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    try {
      const body = (await req.json().catch(() => ({}))) as any;
      await rejectMemory(req.params.id, body.reason);
      return Response.json({ ok: true, id: req.params.id, moderation_status: "rejected" });
    } catch (err: any) {
      return Response.json({ error: err.message || "Failed to reject memory" }, { status: 400 });
    }
  },

  // POST /api/admin/memories/:id/revoke
  "/api/admin/memories/:id/revoke": async (req: Request & { params: { id: string } }) => {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    try {
      await revokeApprovedMemory(req.params.id);
      return Response.json({ ok: true, id: req.params.id, moderation_status: "rejected" });
    } catch (err: any) {
      return Response.json({ error: err.message || "Failed to revoke memory" }, { status: 400 });
    }
  },

  // DELETE /api/admin/memories/:id
  "/api/admin/memories/:id": async (req: Request & { params: { id: string } }) => {
    if (req.method !== "DELETE") return new Response("Method not allowed", { status: 405 });
    try {
      const ok = await deleteMemoryAdmin(req.params.id);
      if (!ok) return Response.json({ error: "Memory not found" }, { status: 404 });
      return Response.json({ ok: true });
    } catch (err: any) {
      return Response.json({ error: err.message || "Failed to delete memory" }, { status: 400 });
    }
  },
};

function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Musafir - Public Memories Moderation Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0C0D11;
      --card-bg: #15171E;
      --card-border: #232733;
      --accent: #EA6C1E;
      --accent-glow: rgba(234, 108, 30, 0.25);
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
      --green: #10B981;
      --red: #EF4444;
      --yellow: #F59E0B;
      --radius: 16px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px 24px 100px; min-height: 100vh; }
    header { max-width: 1400px; margin: 0 auto 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--card-border); padding-bottom: 20px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .badge-logo { width: 40px; height: 40px; border-radius: 12px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; font-size: 20px; box-shadow: 0 4px 14px var(--accent-glow); }
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }

    .stats-bar { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: var(--text-muted); }
    .stat-pill { background: var(--card-bg); padding: 8px 16px; border-radius: 20px; border: 1px solid var(--card-border); display: flex; gap: 8px; align-items: center; cursor: pointer; transition: all 0.2s; }
    .stat-pill.active { border-color: var(--accent); background: #1F191D; }
    .stat-pill b { color: #fff; font-weight: 800; }
    .stat-pill.pending b { color: var(--yellow); }
    .stat-pill.approved b { color: var(--green); }
    .stat-pill.rejected b { color: var(--red); }

    .controls { max-width: 1400px; margin: 0 auto 20px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .search-box { flex: 1; min-width: 280px; }
    .search-box input { width: 100%; padding: 12px 18px; border-radius: 14px; background: var(--card-bg); border: 1px solid var(--card-border); color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .search-box input:focus { border-color: var(--accent); }
    select { padding: 12px 18px; border-radius: 14px; background: var(--card-bg); border: 1px solid var(--card-border); color: #fff; font-size: 14px; outline: none; cursor: pointer; }

    .memory-grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
    @media(max-width: 600px) { .memory-grid { grid-template-columns: 1fr; } }

    .memory-card { background: var(--card-bg); border: 1.5px solid var(--card-border); border-radius: var(--radius); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s; position: relative; }
    .memory-card:hover { transform: translateY(-2px); border-color: #374151; }
    .memory-card.status-approved { border-left: 4px solid var(--green); }
    .memory-card.status-rejected { border-left: 4px solid var(--red); opacity: 0.75; }
    .memory-card.status-pending { border-left: 4px solid var(--yellow); }

    .image-wrap { width: 100%; height: 260px; position: relative; background: #000; cursor: pointer; }
    .image-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .zoom-hint { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: #fff; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 700; pointer-events: none; }
    .mod-badge { position: absolute; top: 10px; left: 10px; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-approved { background: rgba(16, 185, 129, 0.9); color: #fff; }
    .badge-rejected { background: rgba(239, 68, 68, 0.9); color: #fff; }
    .badge-pending { background: rgba(245, 158, 11, 0.9); color: #000; }

    .card-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
    .poi-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .poi-name { font-size: 16px; font-weight: 800; color: #fff; }
    .poi-cat { font-size: 10.5px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; background: #232733; color: var(--accent); }
    .poi-loc { font-size: 12px; color: var(--text-muted); }

    .caption-box { background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #E5E7EB; line-height: 18px; border: 1px solid rgba(255,255,255,0.05); }
    .no-caption { color: var(--text-muted); font-style: italic; }

    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11.5px; background: #111319; padding: 10px; border-radius: 10px; border: 1px solid var(--card-border); }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 10px; }
    .meta-val { color: #F3F4F6; font-weight: 700; }

    .user-row { display: flex; align-items: center; gap: 10px; padding-top: 8px; border-top: 1px solid var(--card-border); }
    .user-avatar { width: 32px; height: 32px; border-radius: 16px; background: #232733; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: var(--accent); }
    .user-info { display: flex; flex-direction: column; gap: 1px; }
    .user-name { font-size: 12.5px; font-weight: 700; color: #fff; }
    .user-email { font-size: 11px; color: var(--text-muted); }

    .card-actions { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--card-border); }
    .btn { flex: 1; padding: 10px; border-radius: 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
    .btn-approve { background: var(--green); color: #fff; }
    .btn-approve:hover { background: #059669; }
    .btn-reject { background: #3E1616; color: #FCA5A5; border: 1px solid #7F1D1D; }
    .btn-reject:hover { background: #DC2626; color: #fff; }
    .btn-revoke { background: #451A03; color: #FDBA74; border: 1px solid #9A3412; }
    .btn-revoke:hover { background: #EA580C; color: #fff; }
    .btn-delete { background: #232733; color: #9CA3AF; max-width: 44px; }
    .btn-delete:hover { background: #DC2626; color: #fff; }

    /* Lightbox Modal */
    .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 1000; display: none; align-items: center; justify-content: center; padding: 20px; }
    .lightbox.active { display: flex; }
    .lightbox-img { max-width: 90vw; max-height: 85vh; border-radius: 12px; object-fit: contain; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
    .lightbox-close { position: absolute; top: 20px; right: 24px; font-size: 32px; color: #fff; cursor: pointer; font-weight: 800; }

    .toast { position: fixed; bottom: 24px; right: 24px; background: var(--green); color: #fff; padding: 14px 24px; border-radius: 12px; font-weight: 700; box-shadow: 0 10px 25px rgba(0,0,0,0.5); transform: translateY(100px); opacity: 0; transition: all 0.3s; z-index: 1100; }
    .toast.show { transform: translateY(0); opacity: 1; }
    .empty-state { grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: var(--text-muted); font-size: 15px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="badge-logo">M</div>
      <div>
        <h1>Musafir Memory Studio</h1>
        <p style="font-size: 12px; color: var(--text-muted)">Public Traveler Memories Moderation & Curation Console</p>
      </div>
    </div>
    <div class="stats-bar">
      <div class="stat-pill approved active" id="stat-pill-all" onclick="filterByStatus('all')">Live Memories: <b id="stat-total">0</b></div>
      <div class="stat-pill rejected" id="stat-pill-rejected" onclick="filterByStatus('rejected')">Takedown / Removed: <b id="stat-rejected">0</b></div>
    </div>
  </header>

  <div class="controls">
    <div class="search-box">
      <input type="text" id="search-input" placeholder="Search POI name, caption, user email, or traveler name..." oninput="debounceFetch()">
    </div>
    <select id="status-select" onchange="filterByStatus(this.value)">
      <option value="all">All Live Memories</option>
      <option value="rejected">Takedown / Rejected Only</option>
    </select>
  </div>

  <div class="memory-grid" id="memory-grid">
    <div class="empty-state">Loading public traveler memories...</div>
  </div>

  <!-- Lightbox Modal -->
  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <span class="lightbox-close">&times;</span>
    <img id="lightbox-img" class="lightbox-img" src="" alt="Full Memory Preview">
  </div>

  <div class="toast" id="toast">Action updated successfully!</div>

  <script>
    let currentMemories = [];
    let currentStatus = "all";
    let debounceTimer = null;

    function debounceFetch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchMemories, 300);
    }

    function filterByStatus(status) {
      currentStatus = status;
      document.getElementById('status-select').value = status;
      document.querySelectorAll('.stat-pill').forEach(p => p.classList.remove('active'));
      const activePill = document.getElementById('stat-pill-' + status);
      if (activePill) activePill.classList.add('active');
      fetchMemories();
    }

    async function fetchMemories() {
      const search = document.getElementById('search-input').value;
      const grid = document.getElementById('memory-grid');
      grid.innerHTML = '<div class="empty-state">Loading memories...</div>';

      try {
        const res = await fetch(\`/api/admin/memories?status=\${currentStatus}&search=\${encodeURIComponent(search)}\`);
        const data = await res.json();
        currentMemories = data.items || [];

        // Update stats
        if (data.stats) {
          document.getElementById('stat-total').innerText = (data.stats.totalPublic - data.stats.totalRejected);
          document.getElementById('stat-rejected').innerText = data.stats.totalRejected;
        }

        renderGrid();
      } catch (err) {
        grid.innerHTML = \`<div class="empty-state" style="color:var(--red)">Error fetching memories: \${err.message}</div>\`;
      }
    }

    function renderGrid() {
      const grid = document.getElementById('memory-grid');
      if (currentMemories.length === 0) {
        grid.innerHTML = '<div class="empty-state">No memories found matching this filter.</div>';
        return;
      }

      grid.innerHTML = currentMemories.map(m => {
        const isRejected = m.moderation_status === 'rejected';
        const statusClass = isRejected ? 'status-rejected' : 'status-approved';
        const badgeClass = isRejected ? 'badge-rejected' : 'badge-approved';
        const badgeLabel = isRejected ? 'Removed' : 'Live on Place';
        const formattedDate = new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const dimensions = m.width && m.height ? \`\${m.width} × \${m.height}\` : 'Original size';
        const fileSizeMb = m.file_size ? \`\${(m.file_size / (1024 * 1024)).toFixed(2)} MB\` : 'N/A';
        const coords = m.lat && m.lon ? \`\${m.lat.toFixed(4)}, \${m.lon.toFixed(4)}\` : 'N/A';
        const userInitial = (m.user?.full_name || m.user?.username || m.user?.email || 'U')[0].toUpperCase();

        return \`
          <div class="memory-card \${statusClass}" id="card-\${m.id}">
            <div class="image-wrap" onclick="openLightbox('\${m.photo_url}')">
              <img src="\${m.thumbnail_url || m.photo_url}" alt="Memory photo" loading="lazy">
              <span class="mod-badge \${badgeClass}">\${badgeLabel}</span>
              <span class="zoom-hint">🔍 Tap to Zoom</span>
            </div>

            <div class="card-body">
              <div class="poi-title-row">
                <div>
                  <div class="poi-name">\${m.poi?.name || 'Unlinked Location'}</div>
                  <div class="poi-loc">\${m.poi?.state ? \`\${m.poi.district ? m.poi.district + ', ' : ''}\${m.poi.state}\` : (m.poi?.address || 'India')}</div>
                </div>
                \${m.poi?.category ? \`<span class="poi-cat">\${m.poi.category}</span>\` : ''}
              </div>

              <div class="caption-box \${!m.caption ? 'no-caption' : ''}">
                \${m.caption ? \`"\${m.caption}"\` : 'No caption provided'}
              </div>

              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Uploaded</span>
                  <span class="meta-val">\${formattedDate}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Dimensions</span>
                  <span class="meta-val">\${dimensions}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">File Size</span>
                  <span class="meta-val">\${fileSizeMb}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Coordinates</span>
                  <span class="meta-val">\${coords}</span>
                </div>
              </div>

              <div class="user-row">
                <div class="user-avatar">\${userInitial}</div>
                <div class="user-info">
                  <div class="user-name">\${m.user?.full_name || m.user?.username || 'Explorer'}</div>
                  <div class="user-email">\${m.user?.email || m.user_id}</div>
                </div>
              </div>

              <div class="card-actions">
                \${!isRejected ? \`
                  <button class="btn btn-reject" onclick="rejectMemory('\${m.id}')">✕ Remove from Place</button>
                \` : \`
                  <button class="btn btn-approve" onclick="approveMemory('\${m.id}')">✓ Restore to Place</button>
                \`}
                <button class="btn btn-delete" title="Permanently Delete from S3 & DB" onclick="deleteMemory('\${m.id}')">🗑️</button>
              </div>
            </div>
          </div>
        \`;
    }

    async function approveMemory(id) {
      try {
        const res = await fetch(\`/api/admin/memories/\${id}/approve\`, { method: 'POST' });
        if (res.ok) {
          showToast('Memory Approved and published to POI!');
          fetchMemories();
        }
      } catch (err) {
        alert('Error approving memory: ' + err.message);
      }
    }

    async function rejectMemory(id) {
      try {
        const res = await fetch(\`/api/admin/memories/\${id}/reject\`, { method: 'POST' });
        if (res.ok) {
          showToast('Memory Rejected and hidden from public.');
          fetchMemories();
        }
      } catch (err) {
        alert('Error rejecting memory: ' + err.message);
      }
    }

    async function revokeMemory(id) {
      if (!confirm('Are you sure you want to revoke this approved memory? It will be removed from the public place.')) return;
      try {
        const res = await fetch(\`/api/admin/memories/\${id}/revoke\`, { method: 'POST' });
        if (res.ok) {
          showToast('Memory Revoked.');
          fetchMemories();
        }
      } catch (err) {
        alert('Error revoking memory: ' + err.message);
      }
    }

    async function deleteMemory(id) {
      if (!confirm('Permanently delete this memory and remove its image from S3?')) return;
      try {
        const res = await fetch(\`/api/admin/memories/\${id}\`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Memory deleted permanently.');
          fetchMemories();
        }
      } catch (err) {
        alert('Error deleting memory: ' + err.message);
      }
    }

    function openLightbox(url) {
      document.getElementById('lightbox-img').src = url;
      document.getElementById('lightbox').classList.add('active');
    }

    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // Initial load
    fetchMemories();
  </script>
</body>
</html>`;
}

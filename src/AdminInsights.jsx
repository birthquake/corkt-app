// Admin insights: Activity (are testers using it?), People (who is who, with
// post counts and reports) and Health (data problems that usually mean a bug).
// Everything here is read from data the admin account can already see:
// photos and reports come in from AdminPanel; people and follows load here.
// Unlocks are private to each viewer (rules), so they are not shown.
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

const DAY = 24 * 60 * 60 * 1000;
const toDate = (t) => {
  if (!t) return null;
  try { return t.toDate ? t.toDate() : new Date(t); } catch { return null; }
};
const dayKey = (d) => d.toISOString().slice(0, 10);
const fmtDate = (d) => (d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const ago = (d) => {
  if (!d) return 'never';
  const days = Math.floor((Date.now() - d.getTime()) / DAY);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return fmtDate(d);
};
const nameOf = (u) => {
  if (!u) return 'Unknown user';
  const n = u.username || u.screenName || u.displayName;
  return n ? '@' + String(n).replace(/^@/, '') : 'Unnamed account';
};
const VALID_PRIVACY = new Set(['public', 'friends', 'vault', 'invited', 'tagged']);

const card = { backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' };
const muted = { color: '#6c757d', fontSize: '13px' };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: '12px', color: '#6c757d', borderBottom: '1px solid #dee2e6', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid #f1f3f5', verticalAlign: 'top' };

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ ...card, minWidth: '150px', flex: '1' }}>
      <div style={{ fontSize: '26px', fontWeight: '700', color: color || '#343a40' }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#343a40', marginTop: '2px' }}>{label}</div>
      {sub ? <div style={{ ...muted, marginTop: '2px' }}>{sub}</div> : null}
    </div>
  );
}

// Simple bar strip for "per day" counts: no chart library needed.
function DayBars({ series, label }) {
  const max = Math.max(1, ...series.map(s => s.count));
  return (
    <div style={card}>
      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '90px' }}>
        {series.map(s => (
          <div key={s.key} title={`${s.key}: ${s.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ fontSize: '10px', color: '#6c757d', marginBottom: '2px' }}>{s.count || ''}</div>
            <div style={{ width: '100%', height: `${Math.max(2, (s.count / max) * 70)}px`, backgroundColor: s.count ? '#17a2b8' : '#e9ecef', borderRadius: '3px 3px 0 0' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...muted, marginTop: '6px' }}>
        <span>{series[0]?.key.slice(5)}</span><span>today</span>
      </div>
    </div>
  );
}

export default function AdminInsights({ tab, photos, flags, onViewPosts }) {
  const [users, setUsers] = useState([]);
  const [follows, setFollows] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('lastPost');

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'users'),
      snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => setError('Could not load people: ' + e.message));
    const u2 = onSnapshot(collection(db, 'follows'),
      snap => setFollows(snap.docs.map(d => d.data())),
      () => {});
    return () => { u1(); u2(); };
  }, []);

  const photoDates = useMemo(() => photos.map(p => ({ ...p, _date: toDate(p.timestamp) })), [photos]);

  const perDay = (items, getDate, days = 14) => {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      out.push({ key: dayKey(d), count: 0 });
    }
    const index = Object.fromEntries(out.map((o, i) => [o.key, i]));
    items.forEach(it => {
      const d = getDate(it);
      if (!d) return;
      const k = dayKey(d);
      if (k in index) out[index[k]].count++;
    });
    return out;
  };

  const activity = useMemo(() => {
    const since = (n) => Date.now() - n * DAY;
    const posters = (n) => new Set(photoDates.filter(p => p._date && p._date.getTime() > since(n)).map(p => p.uid)).size;
    const postsIn = (n) => photoDates.filter(p => p._date && p._date.getTime() > since(n)).length;
    const signupsIn = (n) => users.filter(u => { const d = toDate(u.createdAt); return d && d.getTime() > since(n); }).length;
    const mix = { public: 0, friends: 0, vault: 0, other: 0 };
    photos.forEach(p => {
      const k = p.privacy === 'public' || !p.privacy ? 'public' : p.privacy === 'friends' ? 'friends' : (p.privacy === 'vault' || p.privacy === 'invited' || p.privacy === 'tagged') ? 'vault' : 'other';
      mix[k]++;
    });
    return {
      users: users.length, signups7: signupsIn(7), signups30: signupsIn(30),
      posts7: postsIn(7), posts30: postsIn(30), posters7: posters(7), posters30: posters(30),
      pendingReports: flags.filter(f => f.flagStatus === 'pending').length,
      mix,
      postsPerDay: perDay(photoDates, p => p._date),
      signupsPerDay: perDay(users, u => toDate(u.createdAt)),
    };
  }, [photoDates, users, flags, photos]);

  const people = useMemo(() => {
    const byUid = {};
    users.forEach(u => { byUid[u.id] = { user: u, posts: 0, lastPost: null, reports: 0, followers: 0, following: 0 }; });
    photoDates.forEach(p => {
      if (!p.uid) return;
      if (!byUid[p.uid]) byUid[p.uid] = { user: null, posts: 0, lastPost: null, reports: 0, followers: 0, following: 0, missingProfile: true };
      const r = byUid[p.uid];
      r.posts++;
      if (p._date && (!r.lastPost || p._date > r.lastPost)) r.lastPost = p._date;
    });
    flags.forEach(f => {
      const target = f.reportedUserId || f.photoOwnerId;
      if (target && byUid[target]) byUid[target].reports++;
    });
    follows.forEach(f => {
      if (byUid[f.followerId]) byUid[f.followerId].following++;
      if (byUid[f.followingId]) byUid[f.followingId].followers++;
    });
    const q = search.trim().toLowerCase();
    let rows = Object.entries(byUid).map(([uid, r]) => ({ uid, ...r, name: nameOf(r.user), joined: toDate(r.user?.createdAt) }));
    if (q) rows = rows.filter(r =>
      r.uid.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) ||
      String(r.user?.displayName || '').toLowerCase().includes(q) || String(r.user?.screenName || '').toLowerCase().includes(q));
    const t = (d) => (d ? d.getTime() : 0);
    rows.sort((a, b) =>
      sortBy === 'posts' ? b.posts - a.posts :
      sortBy === 'reports' ? b.reports - a.reports :
      sortBy === 'joined' ? t(b.joined) - t(a.joined) :
      t(b.lastPost) - t(a.lastPost));
    return rows;
  }, [users, photoDates, flags, follows, search, sortBy]);

  const health = useMemo(() => {
    const userIds = new Set(users.map(u => u.id));
    const checks = [
      { label: 'Posts with no image', why: 'The upload failed part way; the post shows as a blank card.', items: photos.filter(p => !p.imageUrl) },
      { label: 'Posts with no location', why: 'Cannot be unlocked or shown on the map.', items: photos.filter(p => !(p.latitude && p.longitude)) },
      { label: 'Posts with an unknown privacy value', why: 'Only public, friends and vault are expected.', items: photos.filter(p => p.privacy && !VALID_PRIVACY.has(p.privacy)) },
      { label: 'Posts whose author has no profile record', why: 'Sign-up may have failed after the account was created; their name will show as "Corkt user".', items: photos.filter(p => p.uid && users.length > 0 && !userIds.has(p.uid)) },
      { label: 'Accounts with no username', why: 'They appear as "Unnamed account" and cannot be searched in the app.', items: users.filter(u => !(u.username || u.screenName || u.displayName)) },
      { label: 'Posts with no thumbnail (older than Nov 2026 is expected)', why: 'Feeds fall back to the full-size image, which is slower.', items: photos.filter(p => p.imageUrl && !p.thumbnailUrl) },
      { label: 'Vault posts missing the taggedUserIds list', why: 'Tagged people cannot open them.', items: photos.filter(p => (p.privacy === 'vault' || p.privacy === 'invited' || p.privacy === 'tagged') && !(Array.isArray(p.taggedUserIds) && p.taggedUserIds.length)) },
    ];
    return checks;
  }, [photos, users]);

  const wrap = { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' };

  if (tab === 'activity') {
    const a = activity;
    return (
      <div style={wrap}>
        {error && <div style={{ ...card, color: '#b91c1c' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Stat label="Accounts" value={a.users} sub={`${a.signups7} new this week · ${a.signups30} this month`} />
          <Stat label="Posts this week" value={a.posts7} sub={`${a.posts30} in the last 30 days`} color="#17a2b8" />
          <Stat label="People who posted this week" value={a.posters7} sub={`${a.posters30} in the last 30 days`} color="#28a745" />
          <Stat label="Reports waiting" value={a.pendingReports} color={a.pendingReports ? '#dc3545' : '#343a40'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
          <DayBars series={a.postsPerDay} label="Posts per day, last 14 days" />
          <DayBars series={a.signupsPerDay} label="Sign-ups per day, last 14 days" />
        </div>
        <div style={card}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>All posts by privacy</div>
          <div style={muted}>
            Public {a.mix.public} · Friends {a.mix.friends} · Vault {a.mix.vault}{a.mix.other ? ` · Unknown ${a.mix.other}` : ''}
          </div>
          <div style={{ ...muted, marginTop: '10px' }}>
            "Active" here means posted. Opening the app and unlocking are not visible to the admin
            (unlock records are private to each person), so quiet testers do not show up yet.
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'people') {
    return (
      <div style={wrap}>
        {error && <div style={{ ...card, color: '#b91c1c' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text" placeholder="Search by name or user ID…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px', flex: 1, minWidth: '220px' }}
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' }}>
            <option value="lastPost">Most recent post</option>
            <option value="posts">Most posts</option>
            <option value="reports">Most reports</option>
            <option value="joined">Newest accounts</option>
          </select>
          <span style={muted}>{people.length} people</span>
        </div>
        <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Person</th><th style={th}>Posts</th><th style={th}>Last post</th>
              <th style={th}>Joined</th><th style={th}>Followers</th><th style={th}>Following</th><th style={th}>Reports</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {people.map(r => (
                <tr key={r.uid}>
                  <td style={td}>
                    <div style={{ fontWeight: '600' }}>{r.name}{r.missingProfile ? <span style={{ color: '#dc3545', fontSize: '11px', marginLeft: '6px' }}>no profile</span> : null}</div>
                    {r.user?.displayName && r.user.displayName !== r.user.username ? <div style={muted}>{r.user.displayName}</div> : null}
                    <div style={{ ...muted, fontSize: '11px' }}>{r.uid}</div>
                  </td>
                  <td style={td}>{r.posts}</td>
                  <td style={td}>{ago(r.lastPost)}</td>
                  <td style={td}>{fmtDate(r.joined)}</td>
                  <td style={td}>{r.followers}</td>
                  <td style={td}>{r.following}</td>
                  <td style={{ ...td, color: r.reports ? '#dc3545' : undefined, fontWeight: r.reports ? '600' : undefined }}>{r.reports}</td>
                  <td style={td}>
                    {r.posts > 0 && (
                      <button onClick={() => onViewPosts?.(r.uid)}
                        style={{ padding: '4px 10px', border: '1px solid #ced4da', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px' }}>
                        View posts
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {people.length === 0 && <tr><td style={td} colSpan={8}>No one matches.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // health
  return (
    <div style={wrap}>
      <div style={muted}>Each check lists records that usually mean a bug or a failed upload. Empty is good.</div>
      {health.map(c => (
        <div key={c.label} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{c.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: c.items.length ? '#dc3545' : '#28a745' }}>{c.items.length}</div>
          </div>
          <div style={muted}>{c.why}</div>
          {c.items.length > 0 && (
            <div style={{ marginTop: '8px', maxHeight: '160px', overflowY: 'auto', ...muted, fontSize: '12px' }}>
              {c.items.slice(0, 50).map(it => (
                <div key={it.id}>
                  {it.id}{it.uid ? ` · by ${it.uid}` : ''}{it.caption ? ` · "${String(it.caption).slice(0, 40)}"` : ''}
                  {it.uid && onViewPosts ? <button onClick={() => onViewPosts(it.uid)} style={{ marginLeft: '8px', fontSize: '11px', cursor: 'pointer', border: 'none', background: 'none', color: '#17a2b8' }}>view</button> : null}
                </div>
              ))}
              {c.items.length > 50 && <div>…and {c.items.length - 50} more</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

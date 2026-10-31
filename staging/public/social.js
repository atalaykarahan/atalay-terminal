'use strict';

// Friends, requests, statuses and messages, shared by the dashboard (main menu, badges) and the message box.
// In the app, calls go through Swift (the "cloud" handler adds the device token) and live events come from its
// WebSocket; in staging the server does both (POST /api/cloud/social, SSE "social" events).
window.Social = (() => {
  const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.cloud;
  const api = (method, path, body) =>
    (h
      ? h.postMessage({ type: 'social', method, path, body })
      : fetch('/api/cloud/social', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-radar': '1' },
          body: JSON.stringify({ method, path, body }),
        }).then((r) => r.json())
    ).catch(() => ({ error: 'offline' }));

  // What friends see, and what each status means (like Discord's).
  const PRESENCE = {
    online: { label: 'online', hint: 'friends see you online' },
    idle: { label: 'away', hint: 'also on by itself after 10 min without input' },
    dnd: { label: 'do not disturb', hint: 'no message sounds or pop-ups' },
    invisible: { label: 'invisible', hint: 'you look offline, chat still works' },
    offline: { label: 'offline', hint: '' },
  };
  const dot = (p) => `<i class="pdot p-${p || 'offline'}" title="${PRESENCE[p || 'offline'].label}"></i>`;
  const handle = (p) => `${p.name}#${String(p.tag).padStart(4, '0')}`;

  let S = null; // { me: {id, name, tag, status}, friends, incoming, outgoing }
  const subs = new Set();
  const emit = (ev) =>
    subs.forEach((f) => {
      try {
        f(ev, S);
      } catch (e) {
        console.error(e);
      }
    });

  let loading = null;
  function load() {
    loading =
      loading ||
      api('GET', 'v1/social').then((r) => {
        loading = null;
        if (r && !r.error) {
          S = r;
          emit({ type: 'snapshot' });
        }
        return r;
      });
    return loading;
  }

  const friend = (id) => (S ? S.friends.find((f) => f.id === id) : null);
  const drop = (list, id) => list.filter((r) => r.id !== id);

  // A live event updates the snapshot in place, then every view re-renders from it.
  function event(ev) {
    if (!ev || !ev.type) return;
    // (Re)connected: anything that happened while the line was down is in a fresh snapshot.
    if (ev.type === 'hello' || !S) {
      load().then(() => emit(ev));
      return;
    }
    switch (ev.type) {
      case 'request':
        if (!S.incoming.some((r) => r.id === ev.request.id)) S.incoming.unshift(ev.request);
        break;
      case 'outgoing':
        if (!S.outgoing.some((r) => r.id === ev.request.id)) S.outgoing.unshift(ev.request);
        break;
      case 'request_gone':
        S.incoming = drop(S.incoming, ev.id);
        S.outgoing = drop(S.outgoing, ev.id);
        break;
      case 'friend':
        S.incoming = drop(S.incoming, ev.requestId);
        S.outgoing = drop(S.outgoing, ev.requestId);
        if (!friend(ev.friend.id)) S.friends.unshift({ ...ev.friend, unread: 0, last: null });
        break;
      case 'unfriended':
        S.friends = drop(S.friends, ev.id);
        break;
      case 'presence': {
        const f = friend(ev.id);
        if (!f) break;
        ev.was = f.presence || 'offline'; // so a view can tell a friend coming online from a status change
        f.presence = ev.presence;
        break;
      }
      case 'status':
        S.me.status = ev.status;
        break;
      case 'message': {
        const f = friend(ev.with);
        if (!f) break;
        f.last = { body: ev.message.body, at: ev.message.at, mine: ev.message.mine };
        if (!ev.message.mine) f.unread = (f.unread || 0) + 1;
        S.friends = [f, ...S.friends.filter((x) => x !== f)];
        break;
      }
      case 'read': {
        const f = friend(ev.with);
        if (f) f.unread = 0;
        break;
      }
      // A friend's new level, sent quietly (no notice): whatever shows them updates.
      case 'friend_xp': {
        const f = friend(ev.id);
        if (f) f.xp = { ...(f.xp || {}), level: ev.level, rank: ev.rank };
        break;
      }
    }
    emit(ev);
  }

  return {
    PRESENCE,
    dot,
    handle,
    load,
    event,
    on: (f) => (subs.add(f), () => subs.delete(f)),
    state: () => S,
    friend,
    unread: () => (S ? S.friends.reduce((n, f) => n + (f.unread || 0), 0) : 0),
    requests: () => (S ? S.incoming.length : 0),
    dnd: () => !!(S && S.me.status === 'dnd'),
    // The chat window lives on this page (staging, or the app's chat panel); anywhere else in the app (dashboard,
    // notices) Swift opens its chat panel.
    openChat(id) {
      if (window.Messages && window.Messages.canChat) return window.Messages.open(id);
      if (h) h.postMessage({ type: 'openChat', id });
    },
    // Your own actions show at once from their answers; the live echo of the same change then finds nothing to do.
    request: (text) =>
      api('POST', 'v1/friends/requests', { handle: text }).then((r) => {
        if (r.request) event({ type: 'outgoing', request: r.request });
        if (r.friend) event({ type: 'friend', requestId: null, friend: r.friend, accepted: false });
        return r;
      }),
    accept: (id) =>
      api('POST', `v1/friends/requests/${id}/accept`, {}).then((r) => {
        if (r.friend) event({ type: 'friend', requestId: id, friend: r.friend, accepted: false });
        return r;
      }),
    dismiss: (id) =>
      api('DELETE', `v1/friends/requests/${id}`).then((r) => {
        if (!r.error) event({ type: 'request_gone', id });
        return r;
      }),
    unfriend: (id) =>
      api('DELETE', `v1/friends/${id}`).then((r) => {
        if (!r.error) event({ type: 'unfriended', id });
        return r;
      }),
    history: (id, before) => api('GET', `v1/messages/${id}${before ? `?before=${before}` : ''}`),
    send: (to, body) => api('POST', 'v1/messages', { to, body }),
    read: (id) => api('POST', 'v1/messages/read', { with: id }),
    // Whether friends see your active time (today, this week, in total); your level shows either way.
    setActivity: (show) => api('PATCH', 'v1/me/activity', { show }),
    // Everyone with XP, by the last 7 days ('week') or ever ('all'); and whether you're listed there.
    leaderboard: (by) => api('GET', `v1/leaderboard?by=${by === 'all' ? 'all' : 'week'}`),
    setBoard: (show) => api('PATCH', 'v1/me/leaderboard', { show }),
    // Settings → Feedback: straight to the developer, with who sent it and when.
    feedback: (body) => api('POST', 'v1/feedback', { body }),
    setStatus: (status) =>
      api('PATCH', 'v1/me/status', { status }).then((r) => {
        if (!r.error) event({ type: 'status', status: r.status });
        return r;
      }),
  };
})();

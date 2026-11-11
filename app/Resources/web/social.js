'use strict';

// Friends, requests, statuses and messages, shared by the dashboard (main menu, badges) and the message box.
// Calls go through Swift (the "cloud" handler adds the device token) and live events come from its WebSocket.
window.Social = (() => {
  const h = window.webkit.messageHandlers.cloud;
  const api = (method, path, body) => h.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));

  // What friends see, and what each status means (like Discord's).
  const PRESENCE = {
    online: { label: 'online', hint: 'friends see you online' },
    idle: { label: 'away', hint: 'also on by itself after 10 min without input' },
    dnd: { label: 'do not disturb', hint: 'no message sounds or pop-ups' },
    invisible: { label: 'invisible', hint: 'you look offline, chat still works' },
    offline: { label: 'offline', hint: '' },
  };
  const dot = (p) => `<i class="pdot p-${p || 'offline'}" title="${PRESENCE[p || 'offline'].label}"></i>`;
  // The app's own id for a message (a random UUID): its row in the chat, and a message sent twice counts once.
  const uuid = () => {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
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

  // Notifications from the developer (the admin page): the newest 100 and how many are unread. Loaded when the line
  // (re)connects and kept up by live events.
  let N = null;
  function loadNotes() {
    return api('GET', 'v1/notifications').then((r) => {
      if (r && !r.error) {
        N = { list: r.notifications, unread: r.unread };
        emit({ type: 'notes' });
      }
      return r;
    });
  }

  const friend = (id) => (S ? S.friends.find((f) => f.id === id) : null);
  const drop = (list, id) => list.filter((r) => r.id !== id);

  // A live event updates the snapshot in place, then every view re-renders from it.
  function event(ev) {
    if (!ev || !ev.type) return;
    // (Re)connected: anything that happened while the line was down is in a fresh snapshot.
    if (ev.type === 'hello') loadNotes();
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
        f.last = { body: ev.message.body, at: ev.message.at, mine: ev.message.mine, enc: ev.message.enc };
        if (!ev.message.mine) f.unread = (f.unread || 0) + 1;
        S.friends = [f, ...S.friends.filter((x) => x !== f)];
        break;
      }
      case 'read': {
        const f = friend(ev.with);
        if (f) f.unread = 0;
        break;
      }
      case 'notification':
        if (N && !N.list.some((n) => n.id === ev.notification.id)) {
          N.list.unshift(ev.notification);
          N.unread++;
        }
        break;
      case 'notification_gone':
        if (N) {
          const gone = N.list.find((n) => n.id === ev.id);
          N.list = N.list.filter((n) => n.id !== ev.id);
          if (gone && !gone.read) N.unread--;
        }
        break;
      // A friend's new level, sent quietly (no notice): whatever shows them updates.
      // A nickname set or taken off (here or on another of your computers).
      case 'nickname': {
        const f = friend(ev.id);
        if (f) f.nick = ev.nick || null;
        break;
      }
      // End-to-end encryption (E2EE.swift): this computer's keys, friends' security codes; a friend got a key.
      case 'e2ee_state': {
        const { type, ...st } = ev;
        S.me.e2ee = st;
        for (const f of S.friends) f.sc = st.friends[f.id] || null;
        break;
      }
      case 'e2ee_keys': {
        const f = friend(ev.id);
        if (f) f.e2ee = true;
        break;
      }
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
    notes: () => N,
    loadNotes,
    unreadNotes: () => (N ? N.unread : 0),
    // All of yours read (the notifications view is open).
    readNotes: () =>
      api('POST', 'v1/notifications/read', {}).then((r) => {
        if (!r.error && N) {
          N.list.forEach((n) => (n.read = true));
          N.unread = 0;
          emit({ type: 'notes' });
        }
        return r;
      }),
    friend,
    // What you call a friend: the nickname you gave them (as on Steam), else their name#tag.
    label: (p) => (p && friend(p.id)?.nick) || handle(p),
    nick: (id) => friend(id)?.nick || null,
    setNick: (id, nick) =>
      api('PUT', `v1/friends/${id}/nickname`, { nick }).then((r) => {
        if (!r.error) event({ type: 'nickname', id, nick: r.nick });
        return r;
      }),
    unread: () => (S ? S.friends.reduce((n, f) => n + (f.unread || 0), 0) : 0),
    requests: () => (S ? S.incoming.length : 0),
    dnd: () => !!(S && S.me.status === 'dnd'),
    // In a chat panel the chat opens right there; anywhere else (dashboard, notices) Swift opens its chat panel.
    openChat(id) {
      if (window.Messages && window.Messages.canChat) return window.Messages.open(id);
      h.postMessage({ type: 'openChat', id });
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
    // `extra`: { uuid, reply: { uuid, mine, text } }. Swift seals it on the way (E2EE.swift).
    send: (to, body, extra) => api('POST', 'v1/messages', { to, body, uuid: (extra && extra.uuid) || uuid(), ...(extra && extra.reply ? { reply: extra.reply } : {}) }),
    uuid,
    // This computer's end-to-end keys as Swift last said (phase ready · locked · starting · off, approvals, recovery key).
    e2ee: () => (S && S.me && S.me.e2ee) || null,
    // Asks E2EE.swift: state, recovery, newRecovery, recover, startOver, approve, confirm, code, verify, seen.
    keys: (action, extra) => h.postMessage({ type: 'e2ee', action, ...(extra || {}) }).catch(() => ({ error: 'offline' })),
    // A message in one line, for previews: code says so, a sealed one that didn't open says that.
    preview: (m) => {
      if (!m) return '';
      if (m.enc === 'locked') return '🔒 encrypted message';
      if (m.enc === 'bad') return "⚠ a message that didn't open";
      const body = m.body || '';
      const text = body.replace(/```[\s\S]*?(```|$)/g, ' ').replace(/^> .*$/gm, '').replace(/\s+/g, ' ').trim();
      return text || (body.includes('```') ? '</> code' : '');
    },
    read: (id) => api('POST', 'v1/messages/read', { with: id }),
    // Whether friends see your active time (today, this week, in total); your level shows either way.
    setActivity: (show) => api('PATCH', 'v1/me/activity', { show }),
    // Everyone with XP, by this week since Monday ('week'), ever ('all') or this week among your friends ('friends');
    // and whether you're listed there.
    leaderboard: (by) => api('GET', `v1/leaderboard?by=${['all', 'friends'].includes(by) ? by : 'week'}`),
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

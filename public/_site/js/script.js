(function () {
  'use strict';

  var navbar = document.getElementById('navbar');
  var hamburger = document.getElementById('hamburger');
  var nav = document.getElementById('navbarNav');
  var navLinks = document.querySelectorAll('.navbar__link');
  var contactForm = document.getElementById('contactForm');
  var toast = document.getElementById('toast');
  var backToTop = document.getElementById('backToTop');

  var ticking = false;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('toast--visible');
    setTimeout(function () {
      toast.classList.remove('toast--visible');
    }, 3000);
  }

  /* ---- Scroll handler ---- */
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        var scrollY = window.scrollY || window.pageYOffset;

        if (scrollY > 60) {
          navbar.classList.add('navbar--scrolled');
        } else {
          navbar.classList.remove('navbar--scrolled');
        }

        if (scrollY > 400) {
          backToTop.classList.add('back-to-top--visible');
        } else {
          backToTop.classList.remove('back-to-top--visible');
        }

        updateActiveLink();
        ticking = false;
      });
      ticking = true;
    }
  });

  /* ---- Navigation ---- */
  hamburger.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('navbar__nav--open');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('navbar__nav--open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  /* ---- Active nav link ---- */
  var sections = document.querySelectorAll('.section[id], .hero[id]');

  function updateActiveLink() {
    var scrollPos = window.scrollY + 100;
    var currentId = '';

    sections.forEach(function (section) {
      var top = section.offsetTop;
      var height = section.offsetHeight;
      var id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = id;
      }
    });

    navLinks.forEach(function (link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + currentId) {
        link.classList.add('active');
      }
    });
  }

  /* ---- Smooth scroll for nav links ---- */
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var targetId = this.getAttribute('href').slice(1);
      var target = document.getElementById(targetId);
      if (target) {
        window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
      }
    });
  });

  /* ---- Back to top ---- */
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---- Contact form ---- */
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('name').value.trim();
    var email = document.getElementById('email').value.trim();
    var message = document.getElementById('message').value.trim();

    if (!name) { showToast('Please enter your name.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address.');
      return;
    }
    if (!message) { showToast('Please write a message.'); return; }

    var btn = contactForm.querySelector('button[type="submit"]');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<span>Sending...</span>';
    btn.disabled = true;

    setTimeout(function () {
      showToast('Message sent successfully! I\'ll get back to you soon.');
      contactForm.reset();
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 1200);
  });

  /* ---- Intersection observer for scroll reveals ---- */
  var observerOptions = { threshold: 0.1, rootMargin: '0px 0px -60px 0px' };

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObserver.observe(el);
  });

  document.querySelectorAll('.course-card, .achievement-card, .philosophy__point').forEach(function (el, i) {
    el.style.transitionDelay = (i * 0.08) + 's';
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  document.querySelectorAll('.stat').forEach(function (el, i) {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.1) + 's';
    revealObserver.observe(el);
  });

  /* ---- Hero parallax on mouse move ---- */
  var heroAvatar = document.querySelector('.hero__avatar');
  var heroRings = document.querySelectorAll('.hero__ring');

  if (heroAvatar && window.innerWidth > 768) {
    document.querySelector('.hero').addEventListener('mousemove', function (e) {
      var rect = this.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;

      heroAvatar.style.transform = 'translate(' + (x * 12) + 'px, ' + (y * 12) + 'px)';

      heroRings.forEach(function (ring, i) {
        var factor = (i + 1) * 8;
        ring.style.transform = 'translate(' + (x * factor) + 'px, ' + (y * factor) + 'px)';
      });
    });

    document.querySelector('.hero').addEventListener('mouseleave', function () {
      heroAvatar.style.transform = '';
      heroRings.forEach(function (ring) { ring.style.transform = ''; });
    });
  }

})();

(function() {
  'use strict';

  // ════════════════════════════════════════════════
  //  DOM refs
  // ════════════════════════════════════════════════
  var teacherId = document.getElementById('chatWidget')?.getAttribute('data-teacher-id') || '0';
  var siteUrl = document.getElementById('chatWidget')?.getAttribute('data-site-url') || '/site-preview';
  var toggle = document.getElementById('chatToggle');
  var panel = document.getElementById('chatPanel');
  var msgsEl = document.getElementById('chatMessages');
  var input = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSendBtn');
  var closeBtn = document.getElementById('chatCloseBtn');
  var modeBtn = document.getElementById('chatModeBtn');
  var widget = document.getElementById('chatWidget');
  var audioCallBtn = document.getElementById('audioCallBtn');
  var videoCallBtn = document.getElementById('videoCallBtn');
  var callOverlay = document.getElementById('chatCallOverlay');
  var callEndBtn = document.getElementById('callEndBtn');
  var callMuteBtn = document.getElementById('callMuteBtn');
  var callVideoToggleBtn = document.getElementById('callVideoToggleBtn');
  var userVideo = document.getElementById('userVideo');
  var aiAvatar = document.getElementById('aiAvatar');
  var aiTranscript = document.getElementById('aiTranscript');
  var userTranscript = document.getElementById('userTranscript');
  var callStatusText = document.getElementById('callStatusText');
  var callTimer = document.getElementById('callTimer');
  var callStatusDot = document.getElementById('callStatusDot');

  // ════════════════════════════════════════════════
  //  State
  // ════════════════════════════════════════════════
  var isAdmin = false;
  var chatOpen = false;
  var inCall = false;
  var callStartTime = null;
  var callTimerInterval = null;
  var isMuted = false;
  var isVideoOn = false;
  var isVideoCall = false;
  var mediaStream = null;
  var signalingWs = null;
  var peerConn = null;
  var currentRoom = null;

  var SIGNAL_URL = 'ws://127.0.0.1:8765/ws/signal';

  if (!toggle) return;

  // ════════════════════════════════════════════════
  //  Auth check
  // ════════════════════════════════════════════════
  fetch('/api/auth', { credentials: 'include' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.user) {
        isAdmin = true;
        if (modeBtn) {
          modeBtn.classList.add('chat-widget__mode-btn--active');
          modeBtn.title = 'Online — receiving calls';
          var badge = document.createElement('span');
          badge.className = 'chat-widget__admin-badge';
          badge.textContent = 'Online';
          document.querySelector('.chat-widget__title')?.appendChild(badge);
        }
        connectSignaling('teacher');
      }
    })
    .catch(function() {});

  // ════════════════════════════════════════════════
  //  Chat panel toggle
  // ════════════════════════════════════════════════
  function toggleChat() {
    chatOpen = !chatOpen;
    widget.classList.toggle('chat-widget--open', chatOpen);
    if (chatOpen) input.focus();
  }

  toggle.addEventListener('click', toggleChat);
  if (closeBtn) closeBtn.addEventListener('click', toggleChat);

  function addMsg(text, role) {
    var div = document.createElement('div');
    div.className = 'chat-widget__msg chat-widget__msg--' + role;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // ════════════════════════════════════════════════
  //  Signaling Server — WebSocket
  // ════════════════════════════════════════════════
  function connectSignaling(role) {
    try {
      signalingWs = new WebSocket(SIGNAL_URL);
    } catch(e) { return; }

    signalingWs.onopen = function() {
      signalingWs.send(JSON.stringify({ type: 'join', role: role }));
    };

    signalingWs.onmessage = function(event) {
      try {
        var msg = JSON.parse(event.data);
        handleSignalingMessage(msg);
      } catch(e) {}
    };

    signalingWs.onclose = function() {
      // Reconnect after a delay if admin
      if (isAdmin) setTimeout(function() { connectSignaling('teacher'); }, 3000);
    };
  }

  function handleSignalingMessage(msg) {
    if (msg.type === 'joined') {
      currentRoom = msg.room;
      if (isAdmin) {
        // Teacher is now waiting in a room
        addMsg('You are online. Visitors can call you now.', 'bot');
      }
    }
    else if (msg.type === 'incoming_call') {
      // Teacher receives notification of a visitor wanting to call
      addMsg('A visitor wants to call you! Open the call panel to connect.', 'bot');
      // Auto-answer for now (could add accept/decline UI)
      startWebRTCCall(false);
    }
    else if (msg.type === 'visitor_ready') {
      // Visitor joined the teacher's room — teacher initiates call
      startWebRTCCall(false);
    }
    else if (msg.type === 'offer') {
      if (peerConn) peerConn.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }));
      peerConn.createAnswer().then(function(answer) {
        peerConn.setLocalDescription(answer);
        if (signalingWs) signalingWs.send(JSON.stringify({ type: 'answer', sdp: answer.sdp, room: currentRoom }));
      });
    }
    else if (msg.type === 'answer') {
      if (peerConn) peerConn.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
    }
    else if (msg.type === 'ice_candidate') {
      if (peerConn && msg.candidate) {
        peerConn.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
    }
    else if (msg.type === 'peer_disconnected') {
      endCall();
      addMsg('The other person left the call.', 'bot');
    }
    else if (msg.type === 'text_message') {
      addMsg(msg.text, 'bot');
      streaming = false;
      sendBtn.disabled = false;
    }
  }

  // ════════════════════════════════════════════════
  //  Text Chat (direct messaging, no AI)
  // ════════════════════════════════════════════════
  var streaming = false;

  function doSend() {
    var text = input.value.trim();
    if (!text || streaming) return;
    input.value = '';
    addMsg(text, 'user');
    streaming = true;
    sendBtn.disabled = true;

    // If connected via signaling, send directly to teacher
    if (signalingWs && signalingWs.readyState === WebSocket.OPEN && currentRoom) {
      signalingWs.send(JSON.stringify({ type: 'text_message', text: text, room: currentRoom }));
      // Expect teacher to reply (no AI auto-reply)
      addMsg('Message sent. Waiting for reply...', 'bot');
      streaming = false;
      sendBtn.disabled = false;
    } else {
      // Teacher offline — store message
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: teacherId, text: text, from: 'visitor' }),
      })
      .then(function() {
        addMsg('Your message has been sent. The teacher will see it when they log in.', 'bot');
        streaming = false;
        sendBtn.disabled = false;
      })
      .catch(function() {
        addMsg('Failed to send. Please try again.', 'bot');
        streaming = false;
        sendBtn.disabled = false;
      });
    }
  }

  if (sendBtn) sendBtn.addEventListener('click', doSend);
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
  }

  // ════════════════════════════════════════════════
  //  Audio / Video Call — WebRTC Peer-to-Peer
  // ════════════════════════════════════════════════
  var ICE_SERVERS = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]};

  function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function setCallStatus(text, active) {
    callStatusText.textContent = text;
    callStatusDot.className = 'chat-call__status-dot' + (active ? '' : ' chat-call__status-dot--inactive');
    if (!active) callStatusDot.style.animation = 'none';
    else callStatusDot.style.animation = '';
  }

  function updateTranscript(aiText, userText) {
    if (aiText !== undefined) aiTranscript.textContent = aiText;
    if (userText !== undefined) userTranscript.textContent = userText;
  }

  function startWebRTCCall(video) {
    if (!signalingWs || signalingWs.readyState !== WebSocket.OPEN) {
      setCallStatus('Signaling server unavailable', false);
      updateTranscript('', 'Could not connect to signaling server. Make sure the Python server is running.');
      return;
    }

    peerConn = new RTCPeerConnection(ICE_SERVERS);

    peerConn.onicecandidate = function(event) {
      if (event.candidate && signalingWs) {
        signalingWs.send(JSON.stringify({ type: 'ice_candidate', candidate: event.candidate, room: currentRoom }));
      }
    };

    peerConn.ontrack = function(event) {
      // Remote stream — show it
      if (event.streams && event.streams[0]) {
        var remoteAudio = document.createElement('audio');
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.autoplay = true;
        remoteAudio.style.display = 'none';
        document.body.appendChild(remoteAudio);

        if (event.track.kind === 'video') {
          // Show remote video in the main area
          var remoteVideo = document.createElement('video');
          remoteVideo.srcObject = event.streams[0];
          remoteVideo.autoplay = true;
          remoteVideo.playsInline = true;
          remoteVideo.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:20px;';
          var videoArea = document.getElementById('callVideoArea');
          if (videoArea) {
            videoArea.innerHTML = '';
            videoArea.appendChild(remoteVideo);
            // Put user video back on top
            userVideo.classList.add('chat-call__user-video--active');
            videoArea.appendChild(userVideo);
          }
        }
      }
    };

    peerConn.oniceconnectionstatechange = function() {
      if (peerConn.iceConnectionState === 'disconnected' || peerConn.iceConnectionState === 'failed') {
        endCall();
        addMsg('Call disconnected.', 'bot');
      }
    };

    // Add local tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(function(track) {
        peerConn.addTrack(track, mediaStream);
      });
    }

    // If visitor, create offer
    if (!isAdmin) {
      peerConn.createOffer().then(function(offer) {
        peerConn.setLocalDescription(offer);
        if (signalingWs) signalingWs.send(JSON.stringify({ type: 'offer', sdp: offer.sdp, room: currentRoom }));
      });
    }

    callStartTime = Date.now();
    callTimerInterval = setInterval(function() {
      var secs = (Date.now() - callStartTime) / 1000;
      callTimer.textContent = formatTime(secs);
    }, 500);
    setCallStatus('Connected', true);
    updateTranscript('Call connected — talk directly with each other.', '');
  }

  function startCall(video) {
    inCall = true;
    isVideoCall = video;
    isMuted = false;
    isVideoOn = video;
    callOverlay.className = 'chat-call chat-call--active';
    widget.classList.remove('chat-widget--open');
    chatOpen = false;
    updateTranscript('Connecting...', '');
    setCallStatus('Connecting...', true);
    aiAvatar.style.display = 'flex';

    if (!signalingWs || signalingWs.readyState !== WebSocket.OPEN) {
      if (isAdmin) {
        // Teacher starts signaling
        connectSignaling('teacher');
        setTimeout(function() { startCall(video); }, 1000);
        return;
      }
      setCallStatus('Teacher is offline', false);
      updateTranscript('', 'The teacher is not available right now. Send them a message instead.');
      inCall = false;
      callOverlay.className = 'chat-call';
      return;
    }

    var constraints = video ? { video: true, audio: true } : { audio: true };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        mediaStream = stream;
        if (video) {
          userVideo.srcObject = stream;
          userVideo.classList.add('chat-call__user-video--active');
          isVideoOn = true;
        }
        startWebRTCCall(video);
      })
      .catch(function() {
        setCallStatus('Microphone access denied', false);
        updateTranscript('', 'Please allow microphone access to call.');
      });
  }

  function endCall() {
    inCall = false;
    isVideoCall = false;
    callOverlay.className = 'chat-call';
    if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    if (peerConn) { peerConn.close(); peerConn = null; }
    if (signalingWs && currentRoom) {
      try { signalingWs.send(JSON.stringify({ type: 'end_call', room: currentRoom })); } catch(e) {}
    }
    if (mediaStream) { mediaStream.getTracks().forEach(function(t) { t.stop(); }); mediaStream = null; }
    userVideo.srcObject = null;
    userVideo.classList.remove('chat-call__user-video--active');
    isVideoOn = false;
    // Restore avatar view
    var videoArea = document.getElementById('callVideoArea');
    if (videoArea) {
      videoArea.innerHTML = '';
      videoArea.appendChild(aiAvatar);
      videoArea.appendChild(userVideo);
    }
    aiAvatar.style.display = 'flex';
    // Re-connect signaling if teacher
    if (isAdmin) {
      connectSignaling('teacher');
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (mediaStream) mediaStream.getAudioTracks().forEach(function(t) { t.enabled = !isMuted; });
    callMuteBtn.className = 'chat-call__ctrl chat-call__ctrl--mute' + (isMuted ? ' chat-call__ctrl--off' : '');
  }

  function toggleVideo() {
    if (!isVideoCall) return;
    isVideoOn = !isVideoOn;
    if (mediaStream) mediaStream.getVideoTracks().forEach(function(t) { t.enabled = isVideoOn; });
    userVideo.classList.toggle('chat-call__user-video--active', isVideoOn);
    callVideoToggleBtn.className = 'chat-call__ctrl chat-call__ctrl--video' + (isVideoOn ? '' : ' chat-call__ctrl--off');
  }

  // ── Call event listeners ──
  if (audioCallBtn) audioCallBtn.addEventListener('click', function() { startCall(false); });
  if (videoCallBtn) videoCallBtn.addEventListener('click', function() { startCall(true); });
  if (callEndBtn) callEndBtn.addEventListener('click', endCall);
  if (callMuteBtn) callMuteBtn.addEventListener('click', toggleMute);
  if (callVideoToggleBtn) callVideoToggleBtn.addEventListener('click', toggleVideo);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && inCall) endCall(); });
})();

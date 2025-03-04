const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const localAudio = document.getElementById('localAudio');
const remoteAudio = document.getElementById('remoteAudio');
let localStream;
let peerConnection;
let ws;
let roomId;

function connectWebSocket() {
  ws = new WebSocket('ws://localhost:8080');
  
  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    
    switch(message.type) {
      case 'room-created':
        roomId = message.roomId;
        history.replaceState({}, '', `/?room=${roomId}`);
        showInviteLink();
        break;
        
      case 'room-joined':
        roomId = message.roomId;
        break;
        
      default:
        handleSignalingMessage(message);
    }
  };
}

async function startCapture() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localAudio.srcObject = localStream;
  } catch (err) {
    console.error('Erro ao acessar microfone:', err);
  }
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(configuration);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) {
      ws.send(JSON.stringify({
        type: 'candidate',
        candidate: candidate.toJSON()
      }));
    }
  };

  peerConnection.ontrack = ({ streams }) => {
    remoteAudio.srcObject = streams[0];
  };
}

async function startCall() {
  await startCapture();
  createPeerConnection();
  
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  
  ws.send(JSON.stringify({
    type: 'create-room'
  }));
}

async function joinCall() {
  await startCapture();
  createPeerConnection();
  
  ws.send(JSON.stringify({
    type: 'join-room',
    roomId: getRoomIdFromURL()
  }));
}

function handleSignalingMessage(message) {
  if (message.offer) {
    handleOffer(message.offer);
  } else if (message.answer) {
    handleAnswer(message.answer);
  } else if (message.candidate) {
    handleCandidate(message.candidate);
  }
}

async function handleOffer(offer) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  ws.send(JSON.stringify({
    type: 'answer',
    answer: answer
  }));
}

async function handleAnswer(answer) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

function handleCandidate(candidate) {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function getRoomIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('room');
}

function showInviteLink() {
  const link = `${window.location.origin}?room=${roomId}`;
  const inviteDiv = document.createElement('div');
  inviteDiv.innerHTML = `
    <p>Link para convidar: <input type="text" value="${link}" readonly>
    <button onclick="copyLink()">Copiar</button></p>
  `;
  document.body.appendChild(inviteDiv);
}

function copyLink() {
  const input = document.querySelector('input');
  input.select();
  document.execCommand('copy');
}

connectWebSocket();

if (getRoomIdFromURL()) {
  document.getElementById('start').style.display = 'none';
  document.getElementById('join').click();
} else {
  document.getElementById('start').addEventListener('click', startCall);
  document.getElementById('join').addEventListener('click', joinCall);
}
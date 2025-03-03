const configuration = {
    iceServers: [{
      urls: "stun:stun.l.google.com:19302"
    }]
  };
  const localAudio = document.getElementById('localAudio');
  const remoteAudio = document.getElementById('remoteAudio');
  
  let localStream;
  let peerConnection;
  
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
  
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        console.log('Novo candidato ICE:', JSON.stringify(event.candidate));
      }
    };
  
    peerConnection.ontrack = event => {
      remoteAudio.srcObject = event.streams[0];
    };
  }
  
  async function startCall() {
    await startCapture();
    createPeerConnection();
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    console.log('Offer:', JSON.stringify(offer));
  }
  
  async function joinCall(offer) {
    await startCapture();
    createPeerConnection();
    
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    console.log('Answer:', JSON.stringify(answer));
  }
  
  document.getElementById('start').addEventListener('click', startCall);
  document.getElementById('join').addEventListener('click', () => {
    const offer = prompt('Cole o Offer aqui:');
    joinCall(JSON.parse(offer));
  });
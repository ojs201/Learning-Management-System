const socket = io.connect("https://www.studydoctor.shop",{path: "/socket.io", transports: ['polling']});

const sendButton = document.querySelector(".interaction__chat__input__button");
const chatInput = document.querySelector(".chatting-input");
const chatList = document.querySelector(".chatting-list");
const displayContainer = document.querySelector(".interaction");

const nickname = document.querySelector("#nickname");
const nicknameButton = document.querySelector(".nickname-button");
const room = document.querySelector("#room");
const roomButton = document.querySelector(".room-button");

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

let roomName;
let myStream;
let muted = false;
let cameraOff = false;
let myPeerConnection;
let myDataChannel;

nicknameButton.disabled = true;
sendButton.disabled = true;

function addMessage(name, message){
    const li = document.createElement("li");
    li.classList.add(nickname.value === name ? "sent" : "received");
    const dom =`<span class="user">${name}</span>
    <span class="message">${message}</span>`;
    li.innerHTML = dom;
    chatList.appendChild(li);
}

function handleMessageSubmit(event){
    event.preventDefault();
    const value = chatInput.value;
    if(chatInput.value !== ""){
        socket.emit("new_message", chatInput.value, roomName, () =>{
            addMessage(nickname.value, value);
        });
    }
    chatInput.value = "";
}

function handleNicknameSubmit(event){
    event.preventDefault();
    sendButton.disabled = false;
    socket.emit("nickname", nickname.value);
}

function showRoom(){
    chatInput.addEventListener("keypress", (event) =>{
        if(event.keyCode === 13){
            handleMessageSubmit(event);
        }
    })
    sendButton.addEventListener("click", handleMessageSubmit);
    nicknameButton.addEventListener("click", handleNicknameSubmit);
}

async function initCall(){
    await getMedia();
    makeConnection();
}

async function handleRoomSubmit(event){
    event.preventDefault();
    await initCall();
    socket.emit("enter_room", room.value, showRoom);
    roomName = room.value;
    nicknameButton.disabled = false;
}

roomButton.addEventListener("click", handleRoomSubmit);

socket.on("new_message", (nickname, message) =>{
    addMessage(nickname, message);
});

async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera =>{
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label === camera.label){
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        })
    }catch(e){
        console.log(e);
    }
}

async function getMedia(deviceId){
    const initialConstrains = {
        audio: true,
        video: { facingMode: "user" }
    };
    const cameraConstrains = {
        audio: true,
        video: { deviceId: { exact: deviceId } }
    };
    try{
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstrains : initialConstrains
        );
        myFace.srcObject = myStream;
        if (!deviceId){
            await getCameras();
        }
    } catch(e){
        console.log(e);
    }
}

function handleMuteClick() {
    myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled)
    if(!muted){
        muteBtn.innerText = "Unmute";
        muted = true;
    }else{
        muteBtn.innerText = "Mute";
        muted = false;
    }
}
function handleCameraClick() {
    myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled)
    if(cameraOff){
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    }else{
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }
}

async function handleCameraChange(){
    await getMedia(camerasSelect.value);
    myStream.getAudioTracks().forEach(track => track.enabled = !muted)
    if(myPeerConnection){
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection.getSenders().find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);


//RTC Code

function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                    "stun:stun01.sipphone.com",
                    "stun:stun.ekiga.net",
                    "stun:stun.fwdnet.net",
                    "stun:stun.ideasip.com",
                    "stun:stun.iptel.org",
                    "stun:stun.rixtelecom.se",
                    "stun:stun.schlund.de"
                ]
            }
        ]
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data){
    console.log("sent the candidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data){
    const peersFace = document.getElementById("peersFace")
    peersFace.srcObject = data.stream;
}

//Socket Code
//Data Channel(myDataChannel.send("hello"))

socket.on("welcome", async (nick) => {
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (event) => {console.log(event.data)});
    console.log("made data channel");
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer", offer, roomName);
})

socket.on("offer", async (offer) => {
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel =event.channel;
        myDataChannel.addEventListener("message", (event) => console.log(event.data));
    });
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer()
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("sent the answer");
})

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
})

socket.on("ice", (ice) => {
    console.log("received the candidate");
    myPeerConnection.addIceCandidate(ice);
})
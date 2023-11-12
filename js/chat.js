const socket = io.connect("https://www.studydoctor.shop",{path: "/socket.io", transports: ['polling']});

const sendButton = document.querySelector(".send-button");
const chatInput = document.querySelector(".chatting-input");
const chatList = document.querySelector(".chatting-list");
const displayContainer = document.querySelector(".chat-content");

const nickname = document.querySelector("#nickname");
const nicknameButton = document.querySelector(".nickname-button");
const room = document.querySelector("#room");
const roomButton = document.querySelector(".room-button");

let roomName;

nicknameButton.disabled = true;
sendButton.disabled = true;

function addMessage(message){
    const li = document.createElement("li");
    li.innerText = message;
    chatList.appendChild(li);
}

function handleMessageSubmit(event){
    event.preventDefault();
    const value = chatInput.value;
    socket.emit("new_message", chatInput.value, roomName, () =>{
        addMessage(`You: ${value}`);
    });
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

function handleRoomSubmit(event){
    event.preventDefault();
    socket.emit("enter_room", room.value, showRoom);
    roomName = room.value;
    nicknameButton.disabled = false;
}

roomButton.addEventListener("click", handleRoomSubmit);

socket.on("bye", (left) => {
    addMessage(`${left} left ㅠㅠ`);
})


socket.on("new_message", addMessage);

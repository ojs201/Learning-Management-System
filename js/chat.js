"use strict"
const socket = io('https://www.studydoctor.shop');

const sendButton = document.querySelector(".send-button");
const chatInput = document.querySelector(".chatting-input");
const chatList = document.querySelector(".chatting-list");
const displayContainer = document.querySelector(".chat-content");

const nickname = document.querySelector("#nickname");
const receiver = document.querySelector("#receiver");
const completeButton = document.querySelector(".complete-button");

chatInput.addEventListener("keypress", (event)=>{
    if(event.keyCode === 13){
        send();
    }
})

function send(){
    const param = {
            name: nickname.value,
            msg: chatInput.value,
            rec: receiver.value
        }
    socket.emit("chatting", param);
    chatInput.value = ""
}

sendButton.addEventListener("click", send)
completeButton.addEventListener("click", socketOn)

function socketOn(){
    socket.on(nickname.value, (data)=>{
        console.log(data)
        const { name, msg, time } = data;
        const item = new LiModel(name, msg, time);
        item.makeLi()
        displayContainer.scrollTo(0, displayContainer.scrollHeight)
    })
    console.log("받을 준비완료")
}


function LiModel(name, msg, time) {
    this.name = name;
    this.msg = msg;
    this.time = time;

    this.makeLi = () => {
        const li = document.createElement("li");
        li.classList.add(nickname.value === this.name ? "sent" : "received")
        const dom = `<span class="profile">
            <span class="user">${this.name}</span>
            <img src="https://source.unsplash.com/random/50x50" alt="any">
        </span>
        <span class="message">${this.msg}</span>
        <span class="time">${this.time}</span>`;
        li.innerHTML = dom;
        chatList.appendChild(li)
    }
}
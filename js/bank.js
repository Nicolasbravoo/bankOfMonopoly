import { db } from "./firebase.js";
import { ref, update, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const params = new URLSearchParams(window.location.search);
const room = params.get("room");

document.getElementById("room").innerText = `Sala: ${room}`;

document.getElementById("sendMoney").onclick = async () => {
  const playerId = document.getElementById("playerId").value;
  const amount = Number(document.getElementById("amount").value);

  await update(ref(db, `rooms/${room}/players/${playerId}`), {
    money: amount
  });

  await push(ref(db, `rooms/${room}/transactions`), {
    from: "bank",
    to: playerId,
    amount,
    type: "bank-transfer",
    date: Date.now()
  });
};

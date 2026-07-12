import { io } from "socket.io-client";

const socket = io("https://13.232.195.174/"); // replace with your backend URL
export default socket;

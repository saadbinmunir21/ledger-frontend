import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // change to your deployed backend URL later
});

export default api;

//https://ledger-backend-yn93.onrender.com/api

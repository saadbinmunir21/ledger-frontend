import axios from "axios";

const api = axios.create({
  baseURL: "https://ledger-backend-yn93.onrender.com/api", // change to your deployed backend URL later
});

export default api;

//

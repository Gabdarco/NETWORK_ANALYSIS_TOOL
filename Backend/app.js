// app.js
const express = require("express");

const routes = require("./routes");

const app = express();
app.use(express.json());

//cors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use("/", routes);

module.exports = app;

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3999;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Define a route to handle /REPRINT
app.get('print/print_na/REPRINT', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Catch-all handler to serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
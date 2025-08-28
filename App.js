import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import ShortenPage from "./pages/ShortenPage";
import StatisticsPage from "./pages/StatisticsPage";
import { AppBar, Toolbar, Button } from "@mui/material";

function App() {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" component={Link} to="/">Shorten</Button>
          <Button color="inherit" component={Link} to="/statistics">Statistics</Button>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<ShortenPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
      </Routes>
    </Router>
  );
}

export default App;

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./Pages/LandingPage/LandingPage";
import LoginPage from "./Pages/LoginPage/LoginPage";
import SignupPage from "./Pages/SignupPage/SignupPage";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route shows the landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Login route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Fallback: send unknown routes back to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

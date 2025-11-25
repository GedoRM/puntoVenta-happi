import React, { useState, useEffect } from "react";
import axios from "axios";
import "../login.css";

function Login({ onLogin }) {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Simula pantalla de carga inicial
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:4000/api/login", { email, password });

      if (res.data.token) {
        // Enviamos un objeto con nombre y token a App.js
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("usuario", JSON.stringify({ nombre: res.data.nombre, id: res.data.id }));
        onLogin({ nombre: res.data.nombre, token: res.data.token });
      } else {
        setError(res.data.error || "Usuario o contraseña incorrectos");
      }
    } catch (err) {
      console.error(err);
      setError("Error al conectar con el servidor");
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        Cargando...
      </div>
    );
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Iniciar Sesión</h2>

        {error && <div className="login-error">{error}</div>}

        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Ingresar</button>
      </form>
    </div>
  );
}

export default Login;
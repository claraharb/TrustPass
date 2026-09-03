import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { getHealth } from "../services/api";

function Landing() {
    return <h1>TrustPass</h1>;
}

function Login() {
    return <h1>Login</h1>;
}

function Register() {
    return <h1>Register</h1>;
}

function Dashboard() {
    const [message, setMessage] = useState("Connecting...");

    useEffect(() => {
        getHealth()
            .then((data) => {
                setMessage(data.message);
            })
            .catch(() => {
                setMessage("Backend connection failed");
            });
    }, []);

    return (
        <div>
            <h1>Dashboard</h1>
            <p>{message}</p>
        </div>
    );
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
    );
}
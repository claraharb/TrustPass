const API_URL = import.meta.env.VITE_API_URL;

export async function getHealth() {
    const response = await fetch(`${API_URL}/health`);

    if (!response.ok) {
        throw new Error("Failed to connect to TrustPass backend");
    }

    return response.json();
}
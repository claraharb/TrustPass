import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT);

server.on("listening", () => {
  console.log(`TrustPass backend running on port ${PORT}`);
});

server.on("error", (error) => {
  console.error(`TrustPass backend could not bind to port ${PORT}:`, error);
  process.exitCode = 1;
});

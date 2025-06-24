import mongoose from "mongoose";
import { Server } from "http";
import app from "./app";
import config from "./config/config";

const port = config.port;

process.on("uncaughtException", error => {
  console.error(error);
  process.exit(1);
});
let server: Server;

async function main() {
  try {
    // const uri = `mongodb://127.0.0.1:27017/travel-buddy`;
    const uri = config.database_url;
    await mongoose.connect(`${uri}`);
    console.log(`🛢 Database Connected Successfully`);

    server = app.listen(port, () => {
      console.log(`Server is running on  http://localhost:${port}`);
    });
  } finally {
    //
  }

  process.on("unhandledRejection", error => {
    console.error(error);
    if (server) {
      server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

main().catch(error => console.error(error.message));

process.on("SIGTERM", () => {
  console.error("SIGTERM Detected. Closing Server...");
  if (server) {
    server.close();
  }
});

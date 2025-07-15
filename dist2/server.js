"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config/config"));
const port = config_1.default.port;
process.on("uncaughtException", error => {
    console.error(error);
    process.exit(1);
});
let server;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // const uri = `mongodb://127.0.0.1:27017/travel-buddy`;
            const uri = config_1.default.database_url;
            yield mongoose_1.default.connect(`${uri}`);
            console.log(`🛢 Database Connected Successfully`);
            server = app_1.default.listen(port, () => {
                console.log(`Server is running on  http://localhost:${port}`);
            });
        }
        finally {
            //
        }
        process.on("unhandledRejection", error => {
            console.error(error);
            if (server) {
                server.close(() => {
                    process.exit(1);
                });
            }
            else {
                process.exit(1);
            }
        });
    });
}
main().catch(error => console.error(error.message));
process.on("SIGTERM", () => {
    console.error("SIGTERM Detected. Closing Server...");
    if (server) {
        server.close();
    }
});

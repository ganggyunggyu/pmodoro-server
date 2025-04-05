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
exports.mongoConnect = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoConnect = () => __awaiter(void 0, void 0, void 0, function* () {
    const { MONGO_URI } = process.env;
    if (mongoose_1.default.connection.readyState === 1) {
        console.log('🔁 Already connected to MongoDB');
        return;
    }
    try {
        yield mongoose_1.default.connect(MONGO_URI);
        console.log('MONGO DB 연결');
    }
    catch (error) {
        console.error('❌ MongoDB 연결 실패:', error);
        process.exit(1);
    }
});
exports.mongoConnect = mongoConnect;

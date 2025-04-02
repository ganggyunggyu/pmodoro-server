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
const mongoConnect = () => __awaiter(void 0, void 0, void 0, function* () {
    const MONGO_URI = process.env.MONGO_URI;
    console.log(MONGO_URI);
    if (mongoose_1.default.connection.readyState === 1) {
        console.log('🔁 Already connected to MongoDB');
        return;
    }
    try {
        // await mongoose.connect(MONGO_URI as string);
        yield mongoose_1.default.connect('mongodb+srv://kkk819:12qwaszx@cluster0.uw5n95x.mongodb.net/pmodoro');
        console.log('✅ MongoDB 연결 완료!');
    }
    catch (error) {
        console.error('❌ MongoDB 연결 실패:', error);
        process.exit(1);
    }
});
exports.mongoConnect = mongoConnect;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageModel = exports.ChatRoomModel = exports.ProjectModel = exports.UserModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const MessageSchema = new mongoose_1.default.Schema({
    senderId: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    roomId: { type: String, required: true },
}, { timestamps: true });
// KakaoAuthInfo 서브스키마 정의
const KakaoAuthInfoSchema = new mongoose_1.Schema({
    kakaoId: { type: String, required: true },
    profileImg: { type: String, required: false },
    auth_time: { type: Number, required: true },
    exp: { type: Number, required: true },
    iat: { type: Number, required: true },
    iss: { type: String, required: true },
    sub: { type: String, required: true },
    aud: { type: String, required: true },
    access_token: { type: String, required: true },
    token_type: { type: String, required: true },
    refresh_token: { type: String, required: true },
    expires_in: { type: Number, required: true },
    scope: { type: String, required: true },
    refresh_token_expires_in: { type: Number, required: true },
});
// UserSchema 정의
const UserSchema = new mongoose_1.Schema({
    displayName: { type: String, required: true },
    position: { type: String, required: true },
    skills: { type: [String], required: true },
    career: { type: String, required: true },
    isOnline: { type: Boolean, required: true },
    description: { type: String, required: true },
    email: { type: String },
    password: { type: String },
    firstArea: { type: String },
    secondArea: { type: String },
    phoneNumber: { type: String },
    kakaoAuthInfo: { type: KakaoAuthInfoSchema, required: false },
}, { timestamps: true });
const ProjectSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    position: { type: String, required: true },
    duration: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
    },
    description: { type: String, required: true },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId, // ObjectId로 참조
        ref: 'User', // 'User' 모델을 참조
        required: true,
    },
}, {
    timestamps: true,
});
const ChatRoomSchema = new mongoose_1.default.Schema({
    roomId: { type: String, required: true, unique: true },
    members: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User', // User 모델을 참조
        },
    ],
    messages: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Message', // 메시지 모델을 참조
        },
    ],
}, {
    timestamps: true,
});
exports.UserModel = mongoose_1.default.model('User', UserSchema);
exports.ProjectModel = mongoose_1.default.model('Project', ProjectSchema);
exports.ChatRoomModel = mongoose_1.default.model('ChatRoom', ChatRoomSchema);
exports.MessageModel = mongoose_1.default.model('Message', MessageSchema);

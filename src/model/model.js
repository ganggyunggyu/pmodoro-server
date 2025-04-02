"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageModel = exports.ChatRoomModel = exports.ProjectModel = exports.UserModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const MessageSchema = new mongoose_1.default.Schema({
    senderId: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    roomId: { type: String, required: true },
}, { timestamps: true });
const UserSchema = new mongoose_1.default.Schema({
    userId: { type: String, required: true },
    displayName: { type: String, required: true },
    phoneNumber: { type: String },
    firstArea: { type: String },
    secondArea: { type: String },
    position: { type: String },
    detailPositionList: { type: [String] },
    career: { type: String },
    job: { type: String },
    email: { type: String },
    password: { type: String },
    techStacks: { type: [String], default: [] },
    kakaoId: { type: Number },
    isKakao: { type: Boolean },
    profileImg: { type: String },
    auth_time: { type: Number },
    exp: { type: Number },
    iat: { type: Number },
    iss: { type: String },
    sub: { type: String },
    aud: { type: String },
}, { timestamps: true });
const projectSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    startYear: { type: String, required: true },
    startMonth: { type: String, required: true },
    endYear: { type: String, required: true },
    endMonth: { type: String, required: true },
    description: { type: String, required: true },
}, {
    timestamps: true,
});
const ChatRoomSchema = new mongoose_1.default.Schema({
    roomId: { type: String, required: true, unique: true },
    members: [{ type: String, required: true }],
    otherUser: { type: Object },
}, {
    timestamps: true,
});
exports.UserModel = mongoose_1.default.model('User', UserSchema);
exports.ProjectModel = mongoose_1.default.model('Project', projectSchema);
exports.ChatRoomModel = mongoose_1.default.model('ChatRoom', ChatRoomSchema);
exports.MessageModel = mongoose_1.default.model('Message', MessageSchema);

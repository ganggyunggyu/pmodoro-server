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
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const decode_jwt_1 = require("./shared/lib/decode-jwt");
const mongoConnect_1 = require("./db/mongoConnect");
const uuid_1 = require("uuid");
const model_1 = require("./model/model");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        credentials: true,
    },
});
const PORT = 3000;
io.on('connection', (socket) => {
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
    });
    socket.on('sendMessage', (data) => __awaiter(void 0, void 0, void 0, function* () {
        const { roomId, senderId, content } = data;
        if (!roomId || !senderId || !content)
            return;
        const newMessage = new model_1.MessageModel({ roomId, senderId, content });
        yield newMessage.save();
        io.to(roomId).emit('receiveMessage', {
            senderId,
            content,
            timestamp: newMessage.timestamp,
        });
    }));
    socket.on('disconnect', () => { });
});
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json());
app.get('/auth/kakao-callback', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const code = req.query.code;
    if (!code)
        res.status(400).json({ error: '인증 코드가 없습니다.' });
    const requestKakaoToken = {
        grant_type: 'authorization_code',
        client_id: '592b7c49df0845263bf62a37723069f2',
        redirect_uri: 'https://localhost:5173/auth/kakao-callback',
        code,
    };
    try {
        const result = yield axios_1.default.post('https://kauth.kakao.com/oauth/token', new URLSearchParams(requestKakaoToken), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
        });
        const idToken = result.data.id_token;
        if (!idToken)
            res.status(400).json({ error: 'id_token이 없습니다.' });
        const userInfo = (0, decode_jwt_1.decodeJwt)(idToken);
        userInfo.displayName = userInfo.nickname;
        const { userId } = userInfo;
        if (!userId)
            res.status(400).json({ error: '사용자 ID가 없습니다.' });
        let user = yield model_1.UserModel.findOne({ userId });
        if (user) {
            res.json({ userInfo: user, isUser: true });
        }
        else {
            const newUser = new model_1.UserModel(userInfo);
            res.json({ userInfo: newUser, isUser: false, isKakao: true });
        }
    }
    catch (error) {
        console.error('카카오 토큰 요청 실패:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
        res
            .status(400)
            .json({ error: '카카오 토큰 요청 실패', details: (_b = error.response) === null || _b === void 0 ? void 0 : _b.data });
    }
}));
// 회원가입 라우트
app.post('/user/join', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const signupData = req.body;
    // 만약 카카오 아이디가 있으면 그대로 쓰고, 없으면 UUID 생성해서 넣기
    const userId = signupData.userId || (0, uuid_1.v4)();
    const displayName = signupData.name;
    const newUser = new model_1.UserModel(Object.assign(Object.assign({}, signupData), { userId,
        displayName }));
    yield newUser.save();
    res.json({ userInfo: newUser });
}));
app.get('/chat/rooms', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'userId is required' });
        return;
    }
    try {
        const rooms = yield model_1.ChatRoomModel.find({
            members: { $in: [userId] },
        });
        res.json(rooms);
    }
    catch (error) {
        console.error('❌ 채팅방 목록 조회 오류:', error);
        res.status(500).json({ error: '서버 오류 발생' });
    }
}));
app.post('/chat/room', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, otherUserId } = req.body;
    if (!userId || !otherUserId) {
        res.status(400).json({ error: 'userId와 otherUserId가 필요합니다.' });
        return;
    }
    const sortedIds = [userId, otherUserId].sort();
    const roomId = sortedIds.join('_');
    const otherUser = yield model_1.UserModel.findById(otherUserId);
    try {
        let room = yield model_1.ChatRoomModel.findOne({ roomId });
        if (!room) {
            room = new model_1.ChatRoomModel({
                roomId,
                members: sortedIds,
                otherUser,
            });
            yield room.save();
        }
        res.status(200).json({ roomId: room.roomId, members: room.members });
    }
    catch (error) {
        console.error('채팅방 생성 실패:', error);
        res.status(500).json({ error: '채팅방 생성 중 오류 발생' });
    }
}));
app.get('/users', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield model_1.UserModel.find();
    res.json(users);
}));
app.get('/chat/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { roomId } = req.query;
    if (!roomId) {
        res.status(400).json({ error: 'roomId is required' });
    }
    try {
        const messages = yield model_1.MessageModel.find({ roomId }).sort({ createdAt: 1 });
        res.json(messages);
    }
    catch (error) {
        console.error('메시지 조회 실패:', error);
        res.status(500).json({ error: '메시지 조회 중 오류 발생' });
    }
}));
app.post('/user/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield model_1.UserModel.findOne({
        email: req.body.email,
        password: req.body.password,
    });
    if (user)
        res.json(user);
    if (!user)
        res.status(500).json('로그인 실패');
}));
app.get('/user/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield model_1.UserModel.findById(req.params.userId);
    res.json(user);
}));
(0, mongoConnect_1.mongoConnect)()
    .then(() => {
    app.listen(PORT, () => { });
    server.listen(3001, () => { });
})
    .catch((error) => {
    console.error(error);
});

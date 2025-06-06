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
const mongoose_1 = __importDefault(require("mongoose"));
const https_1 = require("https");
const socket_io_1 = require("socket.io");
const decode_jwt_1 = require("./shared/lib/decode-jwt");
const mongoConnect_1 = require("./db/mongoConnect");
const model_1 = require("./model/model");
const { PORT, SOCKET_PORT, KAKAO_GRANT_TYPE, KAKAO_CLIENT_ID, KAKAO_REDIRECT_URI, } = process.env;
const app = (0, express_1.default)();
const server = (0, https_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
    },
});
//서버 셋팅
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
//라우트 정의
//Auth
app.get('/auth/kakao-callback', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log(req.query.redirect_uri);
    const code = req.query.code;
    if (!code)
        res.status(400).json({ error: '인증 코드가 없습니다.' });
    const requestKakaoToken = {
        grant_type: KAKAO_GRANT_TYPE,
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: KAKAO_REDIRECT_URI,
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
        const kakaoAuthInfo = (0, decode_jwt_1.decodeJwt)(idToken);
        const displayName = kakaoAuthInfo.nickname;
        const { kakaoId } = kakaoAuthInfo;
        if (!kakaoId)
            res.status(400).json({ error: '사용자 ID가 없습니다.' });
        const user = yield model_1.UserModel.findOne({ 'kakaoAuthInfo.kakaoId': kakaoId });
        if (user) {
            res.json({ userInfo: user, isUser: true });
        }
        else {
            res.json({ displayName, kakaoAuthInfo, isUser: false });
        }
    }
    catch (error) {
        console.error('카카오 토큰 요청 실패:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
        res
            .status(400)
            .json({ error: '카카오 토큰 요청 실패', details: (_b = error.response) === null || _b === void 0 ? void 0 : _b.data });
    }
}));
app.get('/auth/login-check/kakao', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // const LOGIN_EXPIRE_TIME = 3600;
    // const authTime = parseInt(req.query.auth_time as string, 10);
    const userId = req.query.userId;
    // const isSessionValid = (authTime: number): boolean => {
    //   const currentTime = Math.floor(Date.now() / 1000);
    //   return currentTime - authTime < LOGIN_EXPIRE_TIME;
    // };
    const user = yield model_1.UserModel.findById(userId);
    res.status(200).send(user);
    // if (isSessionValid(authTime)) {
    // } else {
    //
    //   res.status(401).send('로그인 만료됨');
    // }
}));
//User
app.get('/users', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield model_1.UserModel.find();
    res.json(users);
}));
app.get('/users/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.query;
    const searchConditions = {};
    if (query.position && query.position !== '전체') {
        searchConditions.position = query.position; // '전체'가 아닌 경우에만 position 추가
    }
    if (query.skills && query.skills.length > 0) {
        searchConditions.skills = { $in: query.skills };
    }
    if (query.carrear) {
        searchConditions.carrear = query.carrear;
    }
    if (query.isOnline !== undefined) {
        searchConditions.isOnline = query.isOnline === 'true'; // 문자열을 불리언으로 변환
    }
    if (query.firstArea) {
        searchConditions.firstArea = query.firstArea;
    }
    if (query.secondArea) {
        searchConditions.secondArea = query.secondArea;
    }
    if (query.q) {
        searchConditions.$or = [
            { name: { $regex: query.q, $options: 'i' } },
            { email: { $regex: query.q, $options: 'i' } },
        ];
    }
    try {
        const users = yield model_1.UserModel.find(searchConditions);
        res.json(users);
    }
    catch (error) {
        console.error(error);
        res.status(500).send('서버 에러');
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
app.post('/user/join', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const signupData = req.body;
    const newUser = new model_1.UserModel(Object.assign({}, signupData));
    yield newUser.save();
    res.json({ userInfo: newUser });
}));
//Chat
app.get('/chat/rooms', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'userId is required' });
        return;
    }
    try {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const rooms = yield model_1.ChatRoomModel.find({
            members: { $in: [userObjectId] },
        }).exec();
        const roomsWithUserInfo = yield Promise.all(rooms.map((room) => __awaiter(void 0, void 0, void 0, function* () {
            const otherMembers = room.members.filter((member) => member.toString() !== userObjectId.toString());
            const otherUserInfos = yield model_1.UserModel.find({
                _id: { $in: otherMembers },
            })
                .select('displayName profileImg')
                .exec();
            const messages = yield model_1.MessageModel.find({
                roomId: room.roomId,
            });
            const lastMessage = messages[messages.length - 1];
            return Object.assign(Object.assign({}, room.toObject()), { otherUser: otherUserInfos, lastMessage });
        })));
        res.json(roomsWithUserInfo);
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
    try {
        let room = yield model_1.ChatRoomModel.findOne({ roomId });
        if (!room) {
            room = new model_1.ChatRoomModel({
                roomId,
                members: sortedIds,
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
// Project
app.get('/project/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const params = req.params;
    const { userId } = params;
    const projectList = yield model_1.ProjectModel.find({
        userId: userId,
    });
    res.status(200).json(projectList);
}));
app.post('/project', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const project = req.body;
    try {
        const createProject = yield model_1.ProjectModel.create(project);
        res.status(200).json(createProject);
    }
    catch (error) {
        console.error(error);
    }
}));
app.delete('/project/:projectId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    try {
        // 프로젝트 삭제
        const deletedProject = yield model_1.ProjectModel.findByIdAndDelete(projectId);
        if (!deletedProject) {
            res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        res.status(200).json({ message: '프로젝트가 삭제되었습니다.' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: '프로젝트 삭제 중 오류가 발생했습니다.' });
    }
}));
app.patch('/project/:projectId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const updatedFields = req.body;
    try {
        const project = yield model_1.ProjectModel.findByIdAndUpdate(projectId, updatedFields, { new: true });
        if (!project) {
            res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        res.status(200).json(project);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: '프로젝트 수정 중 오류가 발생했습니다.' });
    }
}));
(0, mongoConnect_1.mongoConnect)()
    .then(() => {
    server.listen(PORT, () => {
        console.log(`${PORT} 포트에서 실행`);
    });
})
    .catch((error) => {
    console.error(error);
});

import express from 'express';
import axios from 'axios';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { decodeJwt } from './shared/lib/decode-jwt';
import { mongoConnect } from './db/mongoConnect';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true,
  },
});

const PORT = 3000;

const MessageSchema = new mongoose.Schema({
  senderId: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  roomId: String,
});

const UserSchema = new mongoose.Schema(
  {
    userId: { type: String },
    displayName: { type: String },
    phoneNumber: { type: String },
    firstArea: { type: String },
    secondArea: { type: String },
    position: { type: String },
    skils: { type: [String], default: [] },
    career: { type: String },
    job: { type: String },

    //로컬 회원가입에 해당
    email: { type: String },
    password: { type: String },

    //개발자에만 해당
    techStacks: { type: [String], default: [] },

    // 카카오 관련 필드는 선택값
    kakaoId: { type: Number },
    isKakao: { type: Boolean },
    profileImg: { type: String },
    auth_time: { type: Number },
    exp: { type: Number },
    iat: { type: Number },
    iss: { type: String },
    sub: { type: String },
    aud: { type: String },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model('User', UserSchema);

const ChatRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    members: [{ type: String, required: true }],
    otherUser: { type: Object },
  },
  {
    timestamps: true,
  },
);
export const ChatRoomModel = mongoose.model('ChatRoom', ChatRoomSchema);

const MessageModel = mongoose.model('Message', MessageSchema);

type ChatMessage = {
  roomId: string;
  senderId: string;
  content: string;
};

io.on('connection', (socket) => {
  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
  });

  socket.on('sendMessage', async (data: ChatMessage) => {
    const { roomId, senderId, content } = data;

    if (!roomId || !senderId || !content) return;

    const newMessage = new MessageModel({ roomId, senderId, content });
    await newMessage.save();

    io.to(roomId).emit('receiveMessage', {
      senderId,
      content,
      timestamp: newMessage.timestamp,
    });
  });

  socket.on('disconnect', () => {});
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.get('/auth/kakao-callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) res.status(400).json({ error: '인증 코드가 없습니다.' });

  const requestKakaoToken = {
    grant_type: 'authorization_code',
    client_id: '592b7c49df0845263bf62a37723069f2',
    redirect_uri: 'https://localhost:5173/auth/kakao-callback',
    code,
  };

  try {
    const result = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      new URLSearchParams(requestKakaoToken),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      },
    );

    const idToken = result.data.id_token;
    if (!idToken) res.status(400).json({ error: 'id_token이 없습니다.' });

    const userInfo = decodeJwt(idToken);
    userInfo.displayName = userInfo.nickname;

    const { userId } = userInfo;
    if (!userId) res.status(400).json({ error: '사용자 ID가 없습니다.' });

    let user = await UserModel.findOne({ userId });

    if (user) {
      res.json({ userInfo: user, isUser: true });
    } else {
      const newUser = new UserModel(userInfo);

      res.json({ userInfo: newUser, isUser: false, isKakao: true });
    }
  } catch (error: any) {
    console.error('카카오 토큰 요청 실패:', error.response?.data);
    res
      .status(400)
      .json({ error: '카카오 토큰 요청 실패', details: error.response?.data });
  }
});

// 회원가입 라우트
app.post('/user/join', async (req, res) => {
  const signupData = req.body;

  // 만약 카카오 아이디가 있으면 그대로 쓰고, 없으면 UUID 생성해서 넣기
  const userId = signupData.userId || uuidv4();
  const displayName = signupData.name;

  const newUser = new UserModel({
    ...signupData,
    userId,
    displayName,
  });

  await newUser.save();

  res.json({ userInfo: newUser });
});

app.get('/api/chat/rooms', async (req, res) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const rooms = await ChatRoomModel.find({
      members: { $in: [userId] },
    });

    res.json(rooms);
  } catch (error) {
    console.error('❌ 채팅방 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류 발생' });
  }
});

app.post('/chat/room', async (req, res) => {
  const { userId, otherUserId } = req.body;

  if (!userId || !otherUserId) {
    res.status(400).json({ error: 'userId와 otherUserId가 필요합니다.' });
    return;
  }

  const sortedIds = [userId, otherUserId].sort();
  const roomId = sortedIds.join('_');
  const otherUser = await UserModel.findById(otherUserId);

  try {
    let room = await ChatRoomModel.findOne({ roomId });

    if (!room) {
      room = new ChatRoomModel({
        roomId,
        members: sortedIds,
        otherUser,
      });

      await room.save();
    }

    res.status(200).json({ roomId: room.roomId, members: room.members });
  } catch (error) {
    console.error('채팅방 생성 실패:', error);
    res.status(500).json({ error: '채팅방 생성 중 오류 발생' });
  }
});

app.get('/users', async (_, res) => {
  const users = await UserModel.find();

  res.json(users);
});

app.get('/api/chat/messages', async (req, res) => {
  const { roomId } = req.query;

  if (!roomId) {
    res.status(400).json({ error: 'roomId is required' });
  }

  try {
    const messages = await MessageModel.find({ roomId }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('메시지 조회 실패:', error);
    res.status(500).json({ error: '메시지 조회 중 오류 발생' });
  }
});

app.post('/login', async (req, res) => {
  const user = await UserModel.findOne({
    email: req.body.email,
    password: req.body.password,
  });

  if (user) res.json(user);

  if (!user) res.status(500).json('로그인 실패');
});

mongoConnect()
  .then(() => {
    app.listen(PORT, () => {});

    server.listen(3001, () => {});
  })
  .catch((error) => {
    console.error(error);
  });

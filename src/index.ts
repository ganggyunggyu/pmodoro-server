import express from 'express';
import axios from 'axios';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { decodeJwt } from './shared/lib/decode-jwt';
import { mongoConnect } from './db/mongoConnect';

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

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  kakaoId: Number,
  displayName: String,
  profileImg: String,
  auth_time: Number,
  exp: Number,
  iat: Number,
  iss: String,
  sub: String,
  aud: String,
});

const ChatRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    members: [{ type: String, required: true }],
  },
  {
    timestamps: true,
  },
);
export const ChatRoomModel = mongoose.model('ChatRoom', ChatRoomSchema);

const MessageModel = mongoose.model('Message', MessageSchema);
const UserModel = mongoose.model('User', userSchema);

type User = {
  aud: string;
  auth_time: number;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  displayName: string;
  picture: string;
  userId: string;
};

type ChatMessage = {
  roomId: string;
  senderId: string;
  content: string;
};

io.on('connection', (socket) => {
  console.log('✅ 유저 접속:', socket.id);

  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    console.log(`📥 ${socket.id}님이 ${roomId} 방에 입장했습니다`);
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

    console.log(`💬 [${roomId}] ${senderId}: ${content}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ 유저 퇴장:', socket.id);
  });
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
      console.log('🟢 로그인 유저:', userId);
      res.json({ userInfo: user, isUser: true });
    } else {
      console.log('🟡 신규 유저:', userId);
      const newUser = new UserModel(userInfo);
      await newUser.save();
      res.json({ userInfo: newUser, isUser: false });
    }
  } catch (error: any) {
    console.error('카카오 토큰 요청 실패:', error.response?.data);
    res
      .status(400)
      .json({ error: '카카오 토큰 요청 실패', details: error.response?.data });
  }
});

app.get('/api/chat/rooms', async (req, res) => {
  const { userId } = req.query;

  if (!userId) res.status(400).json({ error: 'userId is required' });

  const rooms = await ChatRoomModel.find({ members: userId });
  res.json(rooms);
});

app.post('/chat/room', async (req, res) => {
  const { userId, otherUserId } = req.body;

  console.log(req);

  if (!userId || !otherUserId) {
    res.status(400).json({ error: 'userId와 otherUserId가 필요합니다.' });
    return;
  }

  const roomId = [userId, otherUserId].sort().join('_');

  try {
    let room = await ChatRoomModel.findOne({ roomId });

    if (!room) {
      room = new ChatRoomModel({
        roomId,
        members: [userId, otherUserId],
      });

      await room.save();
    }

    res.status(200).json({ roomId: room.roomId, members: room.members });
  } catch (error) {
    console.error('채팅방 생성 실패:', error);
    res.status(500).json({ error: '채팅방 생성 중 오류 발생' });
  }
});

mongoConnect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Express 서버 ON 👉 http://localhost:${PORT}`);
    });

    server.listen(3001, () => {
      console.log('🚀 Socket 서버 ON 👉 http://localhost:3001');
    });
  })
  .catch((error) => {
    console.error(error);
  });

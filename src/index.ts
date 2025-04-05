import express from 'express';
import axios from 'axios';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { decodeJwt } from './shared/lib/decode-jwt';
import { mongoConnect } from './db/mongoConnect';
import { ChatRoomModel, Message, MessageModel, UserModel } from './model/model';

const {
  PORT,
  SOCKET_PORT,
  KAKAO_GRANT_TYPE,
  KAKAO_CLIENT_ID,
  KAKAO_REDIRECT_URI,
} = process.env;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true,
  },
});
//서버 셋팅
io.on('connection', (socket) => {
  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
  });

  socket.on('sendMessage', async (data: Message) => {
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

//라우트 정의

//Auth

app.get('/auth/kakao-callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) res.status(400).json({ error: '인증 코드가 없습니다.' });

  const requestKakaoToken = {
    grant_type: KAKAO_GRANT_TYPE as string,
    client_id: KAKAO_CLIENT_ID as string,
    redirect_uri: KAKAO_REDIRECT_URI as string,
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

    const kakaoAuthInfo = decodeJwt(idToken);

    const displayName = kakaoAuthInfo.nickname;

    const { kakaoId } = kakaoAuthInfo;
    if (!kakaoId) res.status(400).json({ error: '사용자 ID가 없습니다.' });

    const user = await UserModel.findOne({ 'kakaoAuthInfo.kakaoId': kakaoId });

    if (user) {
      res.json({ userInfo: user, isUser: true });
    } else {
      res.json({ displayName, kakaoAuthInfo, isUser: false });
    }
  } catch (error: any) {
    console.error('카카오 토큰 요청 실패:', error.response?.data);
    res
      .status(400)
      .json({ error: '카카오 토큰 요청 실패', details: error.response?.data });
  }
});

//User

app.get('/users', async (_, res) => {
  const users = await UserModel.find();

  res.json(users);
});

app.post('/user/login', async (req, res) => {
  const user = await UserModel.findOne({
    email: req.body.email,
    password: req.body.password,
  });

  if (user) res.json(user);

  if (!user) res.status(500).json('로그인 실패');
});

app.get('/user/:userId', async (req, res) => {
  const user = await UserModel.findById(req.params.userId);

  res.json(user);
});

app.post('/user/join', async (req, res) => {
  const signupData = req.body;

  console.log(signupData);

  const newUser = new UserModel({
    ...signupData,
  });

  await newUser.save();

  res.json({ userInfo: newUser });
});

//Chat

app.get('/chat/rooms', async (req, res) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const rooms = await ChatRoomModel.find({
      members: { $in: [userObjectId] },
    }).exec();

    const roomsWithUserInfo = await Promise.all(
      rooms.map(async (room) => {
        const otherMembers = room.members.filter(
          (member) => member.toString() !== userObjectId.toString(),
        );

        const otherUserInfos = await UserModel.find({
          _id: { $in: otherMembers },
        })
          .select('displayName profileImg')
          .exec();

        const messages = await MessageModel.find({
          roomId: room.roomId,
        });

        console.log(messages.length);

        console.log(messages[messages.length - 1]);

        const lastMessage = messages[messages.length - 1];

        return {
          ...room.toObject(),
          otherUser: otherUserInfos,
          lastMessage,
        };
      }),
    );

    res.json(roomsWithUserInfo);
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

  try {
    let room = await ChatRoomModel.findOne({ roomId });

    if (!room) {
      room = new ChatRoomModel({
        roomId,
        members: sortedIds,
      });
      await room.save();
    }

    res.status(200).json({ roomId: room.roomId, members: room.members });
  } catch (error) {
    console.error('채팅방 생성 실패:', error);
    res.status(500).json({ error: '채팅방 생성 중 오류 발생' });
  }
});

app.get('/chat/messages', async (req, res) => {
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

mongoConnect()
  .then(() => {
    app.listen(PORT, () => {});
    console.log(`${PORT}포트 서버 연결`);

    server.listen(SOCKET_PORT, () => {});
    console.log(`${SOCKET_PORT}포트 소켓서버 연결`);
  })
  .catch((error) => {
    console.error(error);
  });

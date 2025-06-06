import express from 'express';
import axios from 'axios';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { decodeJwt } from './shared/lib/decode-jwt';
import { mongoConnect } from './db/mongoConnect';
import {
  ChatRoomModel,
  Message,
  MessageModel,
  ProjectModel,
  UserModel,
} from './model/model';

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

app.get('/test', async (_, res) => {
  res.json('서버 연동 완료');
  console.log('서버 연동 완료');
});

//Auth

app.get('/auth/kakao-callback', async (req, res) => {
  console.log(req.query.redirect_uri as string);
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

app.get('/auth/login-check/kakao', async (req, res) => {
  const userId = req.query.userId;

  const user = await UserModel.findById(userId);

  res.status(200).send(user);
});

//User

app.get('/users', async (_, res) => {
  const users = await UserModel.find();

  res.json(users);
});

type SearchQueryType = {
  position?: string;
  skills?: string[];
  carrear?: string;
  isOnline?: boolean | string;

  firstArea?: string;
  secondArea?: string;

  q?: string;
};

app.get('/users/search', async (req, res) => {
  const query = req.query as SearchQueryType;

  const searchConditions: any = {};

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
    const users = await UserModel.find(searchConditions);
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('서버 에러');
  }
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

  const newUser = new UserModel({
    ...signupData,
  });

  await newUser.save();

  res.json({ userInfo: newUser });
});

app.patch('/user/:userId', async (req, res) => {
  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.params.userId, // 유저 ID로 찾기
      req.body, // 요청된 body 값으로 부분 업데이트
      { new: true }, // 수정된 데이터를 반환
    );

    if (updatedUser) {
      res.json(updatedUser); // 수정된 유저 정보 반환
    } else {
      res.status(404).json({ message: '유저를 찾을 수 없습니다.' }); // 유저 없을 경우
    }
  } catch (err) {
    res.status(500).json({ message: '유저 정보 수정 실패', error: err });
  }
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

// Project

app.get('/project/:userId', async (req, res) => {
  const params = req.params;
  const { userId } = params;
  const projectList = await ProjectModel.find({
    userId: userId,
  });
  res.status(200).json(projectList);
});

app.post('/project', async (req, res) => {
  const project = req.body;
  try {
    const createProject = await ProjectModel.create(project);

    res.status(200).json(createProject);
  } catch (error) {
    console.error(error);
  }
});

app.delete('/project/:projectId', async (req, res) => {
  const { projectId } = req.params;

  try {
    // 프로젝트 삭제
    const deletedProject = await ProjectModel.findByIdAndDelete(projectId);

    if (!deletedProject) {
      res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
    }

    res.status(200).json({ message: '프로젝트가 삭제되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '프로젝트 삭제 중 오류가 발생했습니다.' });
  }
});

app.patch('/project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const updatedFields = req.body;

  try {
    const project = await ProjectModel.findByIdAndUpdate(
      projectId,
      updatedFields,
      { new: true },
    );

    if (!project) {
      res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '프로젝트 수정 중 오류가 발생했습니다.' });
  }
});

mongoConnect()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`${PORT} 포트에서 실행`);
    });
  })
  .catch((error) => {
    console.error(error);
  });

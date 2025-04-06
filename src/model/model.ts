import mongoose, { Schema } from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    roomId: { type: String, required: true },
  },
  { timestamps: true },
);

type KakaoAuthInfo = {
  kakaoId: string;
  profileImg: string;
  auth_time: number;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  aud: string;

  access_token: string;
  token_type: string;
  refresh_token: string;

  expires_in: number;
  scope: string;
  refresh_token_expires_in: number;
};

export type Message = {
  roomId: string;
  senderId: string;
  content: string;
};

// KakaoAuthInfo 서브스키마 정의
const KakaoAuthInfoSchema = new Schema<KakaoAuthInfo>({
  kakaoId: { type: String, required: false },
  profileImg: { type: String, required: false },
  auth_time: { type: Number, required: false },
  exp: { type: Number, required: false },
  iat: { type: Number, required: false },
  iss: { type: String, required: false },
  sub: { type: String, required: false },
  aud: { type: String, required: false },

  access_token: { type: String, required: false },
  token_type: { type: String, required: false },
  refresh_token: { type: String, required: false },
  expires_in: { type: Number, required: false },
  scope: { type: String, required: false },
  refresh_token_expires_in: { type: Number, required: false },
});

// UserSchema 정의
const UserSchema = new Schema(
  {
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
  },
  { timestamps: true },
);

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    position: { type: String, required: true },
    duration: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    description: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId, // ObjectId로 참조
      ref: 'User', // 'User' 모델을 참조
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const ChatRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // User 모델을 참조
      },
    ],
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message', // 메시지 모델을 참조
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const UserModel = mongoose.model('User', UserSchema);
export const ProjectModel = mongoose.model('Project', ProjectSchema);
export const ChatRoomModel = mongoose.model('ChatRoom', ChatRoomSchema);
export const MessageModel = mongoose.model('Message', MessageSchema);

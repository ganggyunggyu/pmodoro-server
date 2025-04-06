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

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startYear: { type: String, required: true },
    startMonth: { type: String, required: true },
    endYear: { type: String, required: true },
    endMonth: { type: String, required: true },
    description: { type: String, required: true },
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
export const ProjectModel = mongoose.model('Project', projectSchema);
export const ChatRoomModel = mongoose.model('ChatRoom', ChatRoomSchema);
export const MessageModel = mongoose.model('Message', MessageSchema);

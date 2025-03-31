import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    roomId: { type: String, required: true },
  },
  { timestamps: true },
);

const UserSchema = new mongoose.Schema(
  {
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
    members: [{ type: String, required: true }],
    otherUser: { type: Object },
  },
  {
    timestamps: true,
  },
);

export const UserModel = mongoose.model('User', UserSchema);
export const ProjectModel = mongoose.model('Project', projectSchema);
export const ChatRoomModel = mongoose.model('ChatRoom', ChatRoomSchema);
export const MessageModel = mongoose.model('Message', MessageSchema);

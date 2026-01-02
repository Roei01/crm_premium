import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
  senderId: string;
  senderName: string;
  receiverId?: string;
  roomId?: string;
  content: string;
  tenantId: string;
  readAt?: Date;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    receiverId: { type: String },
    roomId: { type: String },
    content: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    readAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "messages",
    toJSON: {
      transform(doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
    toObject: {
      transform(doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

MessageSchema.index({ tenantId: 1, senderId: 1, createdAt: -1 });
MessageSchema.index({ tenantId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ tenantId: 1, roomId: 1, createdAt: -1 });

export default mongoose.model<IMessage>("Message", MessageSchema);

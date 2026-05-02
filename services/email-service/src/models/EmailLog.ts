import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailLog extends Document {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  tenantId: string;
  sentBy: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  createdAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    to: { type: String, required: true },
    toName: { type: String },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    sentBy: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export default mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);

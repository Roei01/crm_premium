import mongoose, { Document, Schema } from 'mongoose';

export interface IMeeting extends Document {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  customerId?: string;
  customerName?: string;
  tenantId: string;
  createdBy: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true },
    description: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    location: { type: String },
    attendees: [{ type: String }],
    customerId: { type: String },
    customerName: { type: String },
    tenantId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
    },
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

export default mongoose.model<IMeeting>('Meeting', MeetingSchema);

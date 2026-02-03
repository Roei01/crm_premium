import mongoose, { Schema, Document } from "mongoose";

export interface IActionLog extends Document {
  tenantId: string;
  performedBy: string; // UserId
  action: string; // CREATE_USER, DELETE_USER, RESTORE_USER, etc.
  targetId?: string; // The ID of the affected object
  targetType: string; // USER, TASK, etc.
  details?: any; // JSON object with details
  createdAt: Date;
}

const ActionLogSchema: Schema = new Schema({
  tenantId: { type: String, required: true, index: true },
  performedBy: { type: String, required: true },
  action: { type: String, required: true },
  targetId: { type: String },
  targetType: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model<IActionLog>("ActionLog", ActionLogSchema);


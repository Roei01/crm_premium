import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  tenantId: string;
  assignedTo?: string;
  createdBy: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    company: { type: String },
    status: {
      type: String,
      enum: ["LEAD", "ACTIVE", "INACTIVE"],
      default: "LEAD",
    },
    tenantId: { type: String, required: true, index: true },
    assignedTo: { type: String },
    createdBy: { type: String, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

CustomerSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export default mongoose.model<ICustomer>("Customer", CustomerSchema);

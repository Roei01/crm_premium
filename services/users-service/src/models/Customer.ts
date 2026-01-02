import mongoose, { Document, Schema } from "mongoose";

export interface ICustomer extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: "LEAD" | "PROSPECT" | "CUSTOMER" | "CHURNED";
  tenantId: string;
  assignedTo?: string; // User ID
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true }, // Scoped unique by tenant?
    phone: { type: String },
    company: { type: String },
    status: {
      type: String,
      enum: ["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"],
      default: "LEAD",
    },
    tenantId: { type: String, required: true, index: true },
    assignedTo: { type: String },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Ensure email is unique per tenant
CustomerSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export default mongoose.model<ICustomer>("Customer", CustomerSchema);

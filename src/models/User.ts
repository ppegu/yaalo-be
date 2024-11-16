import mongoose, { Schema, Document } from "mongoose";
import { object, string } from "yup";

interface IUser extends Document {
  name: string;
  email?: string;
  deviceName?: string;
  deviceOS?: string;
  deviceToken?: string;
  mobileNumber?: string;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    deviceName: { type: String },
    deviceOS: { type: String },
    deviceToken: { type: String },
    mobileNumber: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", UserSchema);

export default User;

export const userValidationSchema = object({
  name: string().required(),
  email: string().email().nullable(),
  deviceName: string().nullable(),
  deviceOS: string().nullable(),
  deviceToken: string().nullable(),
  mobileNumber: string().nullable(),
});

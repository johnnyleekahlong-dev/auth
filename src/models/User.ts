import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  role: string;
  email: string;
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  lastLogin: Date;
  isVerified: boolean;
  resetPasswordTokenHash: string | undefined;
  resetPasswordExpiresAt: Date | undefined;
  verificationTokenHash: string | undefined;
  verificationTokenExpiresAt: Date | undefined;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: String,

    password: String,
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordTokenHash: String,
    resetPasswordExpiresAt: Date,
    verificationTokenHash: String,
    verificationTokenExpiresAt: Date,
  },
  {
    timestamps: true,
  },
);

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;

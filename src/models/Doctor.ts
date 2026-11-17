import { Schema, model, Document, Model } from "mongoose";

export interface IDoctor {
  name: string;
  nameLower: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDoctorDocument extends IDoctor, Document {}

const doctorSchema = new Schema<IDoctorDocument>(
  {
    name: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
      set(val: string): string {
        if (typeof val === "string") {
          this.nameLower = val.toLowerCase().trim();
        }
        return val;
      },
    },
    nameLower: {
      type: String,
      lowercase: true,
      trim: true,
      default: function (this: IDoctorDocument): string {
        return this.name ? this.name.toLowerCase().trim() : "";
      },
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
    },
    hospital: {
      type: String,
      required: [true, "Hospital is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Doctor email is required"],
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * Pre-validate hook:
 * Automatically synchronizes nameLower with lowercase name to guarantee
 * anchored regex searches will consistently match.
 */
doctorSchema.pre("validate", function () {
  if (this.name) {
    this.nameLower = this.name.toLowerCase().trim();
  }
});

// --- INDEXES (with operational rationale) ---

/**
 * 1. Prefix regex search on doctor name.
 * Storing nameLower allows an anchored regex (`^prefix`) query to utilize an IXSCAN
 * without falling back to a full collection scan (COLLSCAN).
 */
doctorSchema.index({ nameLower: 1 }, { name: "idx_doctors_nameLower" });

/**
 * 2. Specialty filtering + chronological sort.
 * Compound index optimizing queries filtering by medical specialization and
 * sorting by newest first ({ specialization: "Cardiology" }).sort({ createdAt: -1 })
 * without requiring an in-memory SORT stage.
 */
doctorSchema.index({ specialization: 1, createdAt: -1 }, { name: "idx_doctors_specialization_createdAt" });

/**
 * 3. Hospital filter.
 * Accelerates filtering the doctor roster by affiliated hospital facility.
 */
doctorSchema.index({ hospital: 1 }, { name: "idx_doctors_hospital" });

/**
 * 4. Default sorting.
 * Optimizes the default paginated listing of doctors sorted chronologically ({ createdAt: -1 }).
 */
doctorSchema.index({ createdAt: -1 }, { name: "idx_doctors_createdAt" });

/**
 * 5. Unique email constraint.
 * Enforces global email uniqueness across all doctor profiles and provides fast exact-match lookups.
 */
doctorSchema.index({ email: 1 }, { unique: true, name: "idx_doctors_email_unique" });

export const Doctor: Model<IDoctorDocument> = model<IDoctorDocument>("Doctor", doctorSchema);

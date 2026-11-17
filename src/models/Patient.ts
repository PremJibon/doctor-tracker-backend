import { Schema, model, Document, Model, Types } from "mongoose";

export interface IPatient {
  name: string;
  nameLower: string;
  age: number;
  gender: string;
  phone: string;
  condition: string;
  doctorId: Types.ObjectId;
  admittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPatientDocument extends IPatient, Document {}

const patientSchema = new Schema<IPatientDocument>(
  {
    name: {
      type: String,
      required: [true, "Patient name is required"],
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
      default: function (this: IPatientDocument): string {
        return this.name ? this.name.toLowerCase().trim() : "";
      },
    },
    age: {
      type: Number,
      required: [true, "Patient age is required"],
      min: [0, "Age cannot be negative"],
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    condition: {
      type: String,
      required: [true, "Medical condition is required"],
      trim: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Assigned doctor reference is required"],
    },
    admittedAt: {
      type: Date,
      required: [true, "Admission date is required"],
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * Pre-validate hook:
 * Keeps nameLower synchronized with lowercase patient name for anchored regex searches.
 */
patientSchema.pre("validate", function () {
  if (this.name) {
    this.nameLower = this.name.toLowerCase().trim();
  }
});

// --- INDEXES (with operational rationale) ---

/**
 * 1. Doctor's patients list + chronological sorting.
 * Compound index optimizing the high-frequency query `{ doctorId: ... }` sorted by `{ createdAt: -1 }`.
 * Avoids in-memory sorting and enables fast index-bound paging for doctor-specific rosters.
 */
patientSchema.index({ doctorId: 1, createdAt: -1 }, { name: "idx_patients_doctorId_createdAt" });

/**
 * 2. Condition filtering + chronological sort.
 * Compound index supporting patient listings filtered by diagnosis condition ({ condition: ... })
 * ordered by recent records first.
 */
patientSchema.index({ condition: 1, createdAt: -1 }, { name: "idx_patients_condition_createdAt" });

/**
 * 3. Prefix regex search on patient name.
 * Storing nameLower allows an anchored regex (`^prefix`) search to utilize an IXSCAN
 * without triggering a full collection scan (COLLSCAN).
 */
patientSchema.index({ nameLower: 1 }, { name: "idx_patients_nameLower" });

/**
 * 4. Admission date filtering and analytics.
 * Optimizes temporal queries filtering by admission date range (`from` & `to`) and supports
 * time-series dashboard aggregations (`patients-over-time`) bucketed by date.
 */
patientSchema.index({ admittedAt: -1 }, { name: "idx_patients_admittedAt" });

export const Patient: Model<IPatientDocument> = model<IPatientDocument>("Patient", patientSchema);

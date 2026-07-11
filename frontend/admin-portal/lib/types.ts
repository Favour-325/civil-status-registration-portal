export type ApplicationType = "birth" | "marriage";
export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

/** An item exactly as `GET /birth` and `GET /marriage` return it. */
export interface ApplicationRecord {
  citizenId: string;
  applicationId: string;
  type: ApplicationType;
  status: ApplicationStatus;
  createdAt: string;
  reason?: string;
  /** S3 object key of the supporting document. Birth applications always have one. */
  documentKey?: string;
  /** The raw wizard form fields; keys differ between birth and marriage. */
  data: Record<string, string>;
}

/** The flattened shape the dashboard renders, regardless of application type. */
export interface ApplicationSummary {
  citizenId: string;
  applicationId: string;
  type: ApplicationType;
  status: ApplicationStatus;
  submittedDate: string;
  /** Child's name, or both spouses' names. */
  subjectName: string;
  subjectDate: string;
  subjectPlace: string;
  reason?: string;
  documentKey?: string;
  data: Record<string, string>;
}

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ").trim();

/**
 * Normalise a record into the dashboard's shape. Birth and marriage forms use
 * entirely different field names, so the mapping lives here rather than being
 * re-derived in each component.
 */
export function toSummary(record: ApplicationRecord): ApplicationSummary {
  const d = record.data ?? {};

  let subjectName: string;
  if (record.type === "birth") {
    subjectName = join(d.childFirstName) || "Unnamed child";
  } else {
    const spouses = [
      join(d.spouse1FirstName, d.spouse1LastName),
      join(d.spouse2FirstName, d.spouse2LastName),
    ].filter(Boolean);
    subjectName = spouses.length ? spouses.join(" & ") : "Unnamed spouses";
  }

  return {
    citizenId: record.citizenId,
    applicationId: record.applicationId,
    type: record.type,
    status: record.status,
    submittedDate: record.createdAt,
    subjectName,
    subjectDate: record.type === "birth" ? d.childDateOfBirth : d.marriageDate,
    subjectPlace: record.type === "birth" ? d.placeOfBirth : d.marriagePlace,
    reason: record.reason,
    documentKey: record.documentKey,
    data: d,
  };
}

/** Human labels for the raw wizard field keys shown in the detail view. */
export const FIELD_LABELS: Record<string, string> = {
  childFirstName: "Child first name",
  childDateOfBirth: "Child date of birth",
  childGender: "Child gender",
  placeOfBirth: "Place of birth",
  fatherFirstName: "Father first name",
  fatherLastName: "Father last name",
  fatherDateOfBirth: "Father date of birth",
  fatherPlaceOfBirth: "Father place of birth",
  fatherResidence: "Father residence",
  fatherOccupation: "Father occupation",
  fatherNationality: "Father nationality",
  fatherPhone: "Father phone",
  fatherEmail: "Father email",
  motherFirstName: "Mother first name",
  motherLastName: "Mother last name",
  motherDateOfBirth: "Mother date of birth",
  motherPlaceOfBirth: "Mother place of birth",
  motherResidence: "Mother residence",
  motherOccupation: "Mother occupation",
  motherNationality: "Mother nationality",
  motherPhone: "Mother phone",
  motherEmail: "Mother email",
  spouse1FirstName: "First spouse first name",
  spouse1LastName: "First spouse last name",
  spouse1DOB: "First spouse date of birth",
  spouse1Email: "First spouse email",
  spouse2FirstName: "Second spouse first name",
  spouse2LastName: "Second spouse last name",
  spouse2DOB: "Second spouse date of birth",
  spouse2Email: "Second spouse email",
  marriageDate: "Date of marriage",
  marriagePlace: "Place of marriage",
  officiantType: "Officiant type",
};

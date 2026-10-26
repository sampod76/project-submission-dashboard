export enum tagTypes {
  session = "session",
  profile = "profile",
  user = "user",
  admin = "admin",
  mentor = "mentor",
  student = "student",
  submission = "submission",
  submissionStatistics = "submissionStatistics",
  review = "review",
  auditLog = "auditLog",
}

export const tagTypesList = Object.values(tagTypes);

import type {
  ApiResponse,
  DateTime,
  PaginatedResponse,
  ReviewDecision,
  Role,
  SubmissionStatus,
  UUID,
} from "./common.types";

export interface ReviewerName {
  firstName: string;
  lastName: string;
}

export interface Reviewer {
  id: UUID;
  email: string;
  role: Role;
  admin: ReviewerName | null;
  mentor: ReviewerName | null;
}

export interface ReviewRecord {
  id: UUID;
  submissionId: UUID;
  reviewerUserId: UUID;
  previousStatus: SubmissionStatus;
  status: SubmissionStatus;
  feedback: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
  reviewer: Reviewer;
}

export interface CreatedReview extends ReviewRecord {
  previousStatus: "PENDING";
  status: ReviewDecision;
}

export type CreateReviewParams = {
  id: UUID;
};

export interface CreateReviewBody {
  status: ReviewDecision;
  feedback?: string | null;
}

export type CreateReviewResponse = ApiResponse<CreatedReview>;

export type ListReviewsParams = {
  id: UUID;
};

export interface ListReviewsQuery {
  page?: number | `${number}`;
  limit?: number | `${number}`;
}

export type ListReviewsResponse = PaginatedResponse<ReviewRecord>;

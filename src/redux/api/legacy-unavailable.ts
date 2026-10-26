export const legacyUnavailable = () => ({
  error: {
    status: "CUSTOM_ERROR" as const,
    error: "This legacy feature requires the Project Submission UI migration.",
    data: { message: "This legacy feature requires the Project Submission UI migration." },
  },
});

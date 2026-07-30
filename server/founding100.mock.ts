import type { z } from "zod";
import type { founding100LeadSchema } from "./founding100.schema";

type Founding100Submission = z.infer<typeof founding100LeadSchema>;

type MockLead = {
  id: number;
  submittedAt: Date;
  submission: Founding100Submission;
};

const mockLeads = new Map<string, MockLead>();
let nextId = 1;

export function saveMockFounding100Lead(
  submission: Founding100Submission
): number {
  const email = submission.email.toLowerCase();
  const existing = mockLeads.get(email);
  const id = existing?.id ?? nextId++;

  mockLeads.set(email, {
    id,
    submittedAt: new Date(),
    submission: structuredClone(submission),
  });

  return id;
}

export function resetMockFounding100Leads(): void {
  mockLeads.clear();
  nextId = 1;
}

export function getMockFounding100LeadCount(): number {
  return mockLeads.size;
}

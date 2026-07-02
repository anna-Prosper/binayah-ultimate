import { getRecipients, type RecipientContext, type WorkspaceLike } from "@/lib/notifyRecipients";

const workspace: WorkspaceLike = {
  id: "ws",
  captains: ["anna"],
  members: ["anna", "agent"],
  pipelineIds: ["pipe"],
};

function ctx(overrides: Partial<RecipientContext>): RecipientContext {
  return {
    eventType: "claimed",
    workspaceId: "ws",
    actorId: "agent",
    claimers: [],
    assignees: [],
    mentioned: [],
    ...overrides,
  };
}

describe("notifyRecipients", () => {
  it("does not notify the user who owns a claimed task", () => {
    const plan = getRecipients(
      ctx({ actorId: "anna", claimers: ["agent"] }),
      [workspace],
      ["anna", "agent"],
    );

    expect(plan.immediate).not.toContain("agent");
    expect(plan.digest).not.toContain("agent");
  });

  it("still allows direct assignment emails to the assigned user", () => {
    const plan = getRecipients(
      ctx({
        eventType: "assigned",
        actorId: "anna",
        assignees: ["agent"],
        newlyAssigned: ["agent"],
      }),
      [workspace],
      ["anna", "agent"],
    );

    expect(plan.immediate).toContain("agent");
  });

  it("routes new task assignments for WhatsApp-mapped users immediately", () => {
    const teamWorkspace: WorkspaceLike = {
      id: "team",
      captains: ["anna"],
      members: ["anna", "prajeesh", "ahsan", "shyam"],
      pipelineIds: ["pipe"],
    };

    const plan = getRecipients(
      ctx({
        eventType: "assigned",
        workspaceId: "team",
        actorId: "anna",
        assignees: ["prajeesh", "ahsan", "shyam"],
        newlyAssigned: ["prajeesh", "ahsan", "shyam"],
      }),
      [teamWorkspace],
      ["anna", "prajeesh", "ahsan", "shyam"],
    );

    expect(plan.immediate).toEqual(expect.arrayContaining(["prajeesh", "ahsan", "shyam"]));
  });
});

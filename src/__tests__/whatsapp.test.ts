import {
  getConfiguredWhatsAppRecipientForUser,
  getWhatsAppRecipientForUser,
  isWhatsAppGroupRecipient,
} from "@/lib/whatsapp";

const originalEnv = process.env;

describe("whatsapp recipient routing", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.WHATSAPP_USER_NUMBERS;
    delete process.env.WHATSAPP_USER_ANNA;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("does not return group JIDs for personal user notifications", () => {
    process.env.WHATSAPP_USER_NUMBERS = JSON.stringify({
      anna: "120363405843566613@g.us",
    });

    expect(getConfiguredWhatsAppRecipientForUser("anna")).toBe("120363405843566613@g.us");
    expect(getWhatsAppRecipientForUser("anna")).toBeUndefined();
  });

  it("returns sanitized phone recipients for personal notifications", () => {
    process.env.WHATSAPP_USER_ANNA = "+971 50 123 4567";

    expect(getWhatsAppRecipientForUser("anna")).toBe("971501234567");
  });

  it("uses checked-in user numbers when env mappings are absent", () => {
    expect(getWhatsAppRecipientForUser("prajeesh")).toBe("917510608234");
    expect(getWhatsAppRecipientForUser("ahsan")).toBe("971505281668");
    expect(getWhatsAppRecipientForUser("shyam")).toBe("919727015745");
  });

  it("allows env mappings to override checked-in user numbers", () => {
    process.env.WHATSAPP_USER_PRAJEESH = "+91 00000 00000";

    expect(getWhatsAppRecipientForUser("prajeesh")).toBe("910000000000");
  });

  it("detects WhatsApp group recipients", () => {
    expect(isWhatsAppGroupRecipient("120363405843566613@g.us")).toBe(true);
    expect(isWhatsAppGroupRecipient("971501234567")).toBe(false);
  });
});

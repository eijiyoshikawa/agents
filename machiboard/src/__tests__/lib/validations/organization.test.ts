import { describe, it, expect } from "vitest";
import {
  createOrganizationSchema,
  joinOrganizationSchema,
} from "@/lib/validations/organization";

describe("createOrganizationSchema", () => {
  it("validates a valid organization", () => {
    const result = createOrganizationSchema.safeParse({
      name: "桜ヶ丘自治会",
      type: "自治会",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createOrganizationSchema.safeParse({
      name: "",
      type: "自治会",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid types", () => {
    const types = ["自治会", "町内会", "管理組合", "その他"] as const;
    for (const type of types) {
      const result = createOrganizationSchema.safeParse({
        name: "テスト",
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid type", () => {
    const result = createOrganizationSchema.safeParse({
      name: "テスト",
      type: "無効",
    });
    expect(result.success).toBe(false);
  });

  it("validates postal code format", () => {
    expect(
      createOrganizationSchema.safeParse({
        name: "テスト",
        type: "自治会",
        postal_code: "123-4567",
      }).success
    ).toBe(true);

    expect(
      createOrganizationSchema.safeParse({
        name: "テスト",
        type: "自治会",
        postal_code: "1234567",
      }).success
    ).toBe(true);

    expect(
      createOrganizationSchema.safeParse({
        name: "テスト",
        type: "自治会",
        postal_code: "abc",
      }).success
    ).toBe(false);
  });
});

describe("joinOrganizationSchema", () => {
  it("validates a valid invite code", () => {
    const result = joinOrganizationSchema.safeParse({
      invite_code: "ab12cd34",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty invite code", () => {
    const result = joinOrganizationSchema.safeParse({
      invite_code: "",
    });
    expect(result.success).toBe(false);
  });
});

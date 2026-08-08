import { afterEach, describe, expect, it } from "vitest";
import { getDataMode, isLocalUserAuthEnabled } from "../src/lib/data-mode";

const originalEnvironment = {
  nodeEnvironment: process.env.NODE_ENV,
  mode: process.env.OTOPASS_DATA_MODE,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  localAuth: process.env.OTOPASS_ENABLE_LOCAL_AUTH,
};

afterEach(() => {
  setEnvironment("NODE_ENV", originalEnvironment.nodeEnvironment);
  setEnvironment("OTOPASS_DATA_MODE", originalEnvironment.mode);
  setEnvironment("NEXT_PUBLIC_SUPABASE_URL", originalEnvironment.url);
  setEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY", originalEnvironment.anon);
  setEnvironment("SUPABASE_SERVICE_ROLE_KEY", originalEnvironment.service);
  setEnvironment("OTOPASS_ENABLE_LOCAL_AUTH", originalEnvironment.localAuth);
});

function setEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe.sequential("data mode", () => {
  it("defaults to local when Supabase credentials are incomplete", () => {
    delete process.env.OTOPASS_DATA_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(getDataMode()).toBe("local");
  });

  it("uses Supabase automatically when every required credential exists", () => {
    delete process.env.OTOPASS_DATA_MODE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    expect(getDataMode()).toBe("supabase");
  });

  it("honors an explicit mode override", () => {
    process.env.OTOPASS_DATA_MODE = "local";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    expect(getDataMode()).toBe("local");
  });

  it("keeps local user authentication disabled by default", () => {
    process.env.OTOPASS_DATA_MODE = "local";
    delete process.env.OTOPASS_ENABLE_LOCAL_AUTH;
    expect(isLocalUserAuthEnabled()).toBe(false);
  });

  it("requires an explicit local-only opt in for local user authentication", () => {
    setEnvironment("NODE_ENV", "test");
    process.env.OTOPASS_DATA_MODE = "local";
    process.env.OTOPASS_ENABLE_LOCAL_AUTH = "true";
    expect(isLocalUserAuthEnabled()).toBe(true);

    process.env.OTOPASS_DATA_MODE = "supabase";
    expect(isLocalUserAuthEnabled()).toBe(false);
  });

  it("never enables local user authentication in production", () => {
    setEnvironment("NODE_ENV", "production");
    process.env.OTOPASS_DATA_MODE = "local";
    process.env.OTOPASS_ENABLE_LOCAL_AUTH = "true";
    expect(isLocalUserAuthEnabled()).toBe(false);
  });
});

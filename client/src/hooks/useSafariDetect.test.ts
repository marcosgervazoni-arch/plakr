import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isSafariBrowser } from "./useSafariDetect";

describe("isSafariBrowser", () => {
  const originalNavigator = global.navigator;

  function mockUA(ua: string) {
    Object.defineProperty(global, "navigator", {
      value: { userAgent: ua },
      configurable: true,
    });
  }

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
  });

  it("detecta iPhone como Safari", () => {
    mockUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
    expect(isSafariBrowser()).toBe(true);
  });

  it("detecta iPad como Safari", () => {
    mockUA("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
    expect(isSafariBrowser()).toBe(true);
  });

  it("detecta Safari desktop como Safari", () => {
    mockUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15");
    expect(isSafariBrowser()).toBe(true);
  });

  it("não detecta Chrome como Safari", () => {
    mockUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    expect(isSafariBrowser()).toBe(false);
  });

  it("não detecta Firefox como Safari", () => {
    mockUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0");
    expect(isSafariBrowser()).toBe(false);
  });

  it("não detecta Edge como Safari", () => {
    mockUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0");
    expect(isSafariBrowser()).toBe(false);
  });

  it("não detecta Chrome no iOS (CriOS) como Safari desktop — mas detecta como iOS", () => {
    // Chrome no iOS ainda usa WebKit e é afetado pelas restrições de cookies
    mockUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.0.0 Mobile/15E148 Safari/604.1");
    // iPhone no UA → retorna true (todos os browsers iOS são afetados)
    expect(isSafariBrowser()).toBe(true);
  });

  it("não detecta Opera como Safari", () => {
    mockUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/110.0.0.0");
    expect(isSafariBrowser()).toBe(false);
  });

  it("retorna false quando navigator não está disponível", () => {
    Object.defineProperty(global, "navigator", {
      value: undefined,
      configurable: true,
    });
    expect(isSafariBrowser()).toBe(false);
  });
});

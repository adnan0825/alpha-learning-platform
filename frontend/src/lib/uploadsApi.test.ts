import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadsAPI } from "./api";

describe("uploadsAPI", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("adds the session bearer token when uploading a video", async () => {
    const setRequestHeader = vi.fn();
    const send = vi.fn(function (this: any) {
      this.onload?.();
    });

    sessionStorage.setItem("alpha_token", "session-jwt");

    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        upload = { onprogress: null as any };
        responseText = JSON.stringify({ url: "/api/uploads/video/test.mp4" });
        status = 200;
        open = vi.fn();
        setRequestHeader = setRequestHeader;
        send = send;
      },
    );

    const file = new File(["test"], "clip.mp4", { type: "video/mp4" });
    await uploadsAPI.uploadVideo(file, undefined, "public");

    expect(setRequestHeader).toHaveBeenCalledWith(
      "Authorization",
      "Bearer session-jwt",
    );
  });
});

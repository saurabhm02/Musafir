import { beforeEach, describe, expect, it, mock } from "bun:test";

type ResizeCall = { width?: number | null; height?: number | null };
type SaveCall = { compress?: number; format?: string };

const mockState = {
  manipulateCalls: [] as string[],
  resizeCalls: [] as ResizeCall[],
  saveCalls: [] as SaveCall[],
  legacyCalls: 0,
};

const mockContext = {
  resize(size: ResizeCall) {
    mockState.resizeCalls.push(size);
    return mockContext;
  },
  async renderAsync() {
    return {
      async saveAsync(options: SaveCall) {
        mockState.saveCalls.push(options);
        return { uri: "file:///compressed-image.jpg", width: 1080, height: 720 };
      },
    };
  },
};

mock.module("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
  ImageManipulator: {
    manipulate(source: string) {
      mockState.manipulateCalls.push(source);
      return mockContext;
    },
  },
  manipulateAsync: async () => {
    mockState.legacyCalls += 1;
    return { uri: "file:///legacy-manipulated.jpg", width: 1080, height: 720 };
  },
}));

mock.module("./supabase", () => ({
  ensureSession: async () => ({ access_token: "test-token" }),
}));

const { compressImage } = await import("./imageUpload");

describe("compressImage", () => {
  beforeEach(() => {
    mockState.manipulateCalls.length = 0;
    mockState.resizeCalls.length = 0;
    mockState.saveCalls.length = 0;
    mockState.legacyCalls = 0;
  });

  it("uses the current ImageManipulator API instead of deprecated manipulateAsync", async () => {
    const uri = await compressImage("file:///picked-photo.jpg");

    expect(uri).toBe("file:///compressed-image.jpg");
    expect(mockState.legacyCalls).toBe(0);
    expect(mockState.manipulateCalls).toEqual(["file:///picked-photo.jpg"]);
    expect(mockState.resizeCalls).toEqual([{ width: 1080 }]);
    expect(mockState.saveCalls).toEqual([{ compress: 0.7, format: "jpeg" }]);
  });
});

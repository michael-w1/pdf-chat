import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
    currentUser: vi.fn(),
    db: {
        user: { upsert: vi.fn() },
        file: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        message: { findMany: vi.fn() },
    },
    createUploadUrl: vi.fn(),
    deleteBlob: vi.fn(),
    deleteChunksForFile: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/prisma", () => ({ default: mocks.db }));
vi.mock("@/lib/azure/blob", () => ({
    MAX_FILE_BYTES: 4 * 1024 * 1024,
    buildBlobName: (userId: string, fileId: string) => `${userId}/${fileId}.pdf`,
    createUploadUrl: mocks.createUploadUrl,
    deleteBlob: mocks.deleteBlob,
}));
vi.mock("@/lib/azure/search", () => ({
    deleteChunksForFile: mocks.deleteChunksForFile,
}));

import { appRouter } from "@/trpc";

const USER = {
    id: "user_1",
    emailAddresses: [{ emailAddress: "someone@example.com" }],
};

const caller = appRouter.createCaller({});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue(USER);
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("auth middleware", () => {
    it("rejects unauthenticated callers", async () => {
        mocks.currentUser.mockResolvedValue(null);

        await expect(caller.getUserFiles()).rejects.toMatchObject({
            code: "UNAUTHORIZED",
        });
        expect(mocks.db.file.findMany).not.toHaveBeenCalled();
    });
});

describe("authCallback", () => {
    it("upserts the user so retries cannot race on create", async () => {
        mocks.db.user.upsert.mockResolvedValue({});

        const result = await caller.authCallback();

        expect(result).toEqual({ success: true });
        expect(mocks.db.user.upsert).toHaveBeenCalledWith({
            where: { id: "user_1" },
            create: { id: "user_1", email: "someone@example.com" },
            update: {},
        });
    });

    it("rejects a user with no email address", async () => {
        mocks.currentUser.mockResolvedValue({ id: "user_1", emailAddresses: [] });

        await expect(caller.authCallback()).rejects.toMatchObject({
            code: "UNAUTHORIZED",
        });
        expect(mocks.db.user.upsert).not.toHaveBeenCalled();
    });
});

describe("getUserFiles", () => {
    it("returns only the caller's files, newest first", async () => {
        mocks.db.file.findMany.mockResolvedValue([{ id: "f1" }]);

        const files = await caller.getUserFiles();

        expect(files).toEqual([{ id: "f1" }]);
        expect(mocks.db.file.findMany).toHaveBeenCalledWith({
            where: { userId: "user_1" },
            orderBy: { createdAt: "desc" },
        });
    });
});

describe("createUploadSlot", () => {
    beforeEach(() => {
        mocks.db.file.create.mockResolvedValue({ id: "f1" });
        mocks.db.file.update.mockResolvedValue({ id: "f1" });
        mocks.createUploadUrl.mockResolvedValue("https://blob/sas");
    });

    it("names the blob server-side and returns a signed upload URL", async () => {
        const result = await caller.createUploadSlot({ name: "notes.pdf", size: 1000 });

        expect(result).toEqual({ fileId: "f1", uploadUrl: "https://blob/sas" });
        // The path is derived from the session user, never from client input.
        expect(mocks.createUploadUrl).toHaveBeenCalledWith("user_1/f1.pdf");
        expect(mocks.db.file.update).toHaveBeenCalledWith({
            where: { id: "f1" },
            data: { blobName: "user_1/f1.pdf" },
        });
    });

    it("creates the row owned by the caller in PENDING state", async () => {
        await caller.createUploadSlot({ name: "notes.pdf", size: 1000 });

        expect(mocks.db.file.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    name: "notes.pdf",
                    userId: "user_1",
                    uploadStatus: "PENDING",
                }),
            })
        );
    });

    it("rejects a file larger than the size limit", async () => {
        await expect(
            caller.createUploadSlot({ name: "big.pdf", size: 5 * 1024 * 1024 })
        ).rejects.toThrow();

        expect(mocks.db.file.create).not.toHaveBeenCalled();
        expect(mocks.createUploadUrl).not.toHaveBeenCalled();
    });

    it("rejects an empty file name", async () => {
        await expect(caller.createUploadSlot({ name: "   ", size: 10 })).rejects.toThrow();
        expect(mocks.createUploadUrl).not.toHaveBeenCalled();
    });
});

describe("getFileMessages", () => {
    const makeMessages = (n: number) =>
        Array.from({ length: n }, (_, i) => ({
            id: `m${i}`,
            text: `message ${i}`,
            isUserMessage: i % 2 === 0,
            createdAt: new Date(),
            sourcePages: [],
        }));

    it("rejects access to a file the caller does not own", async () => {
        mocks.db.file.findFirst.mockResolvedValue(null);

        await expect(
            caller.getFileMessages({ fileId: "other", limit: 10 })
        ).rejects.toMatchObject({ code: "NOT_FOUND" });

        expect(mocks.db.file.findFirst).toHaveBeenCalledWith({
            where: { id: "other", userId: "user_1" },
        });
        expect(mocks.db.message.findMany).not.toHaveBeenCalled();
    });

    it("returns a nextCursor when there are more messages than the limit", async () => {
        mocks.db.file.findFirst.mockResolvedValue({ id: "f1" });
        mocks.db.message.findMany.mockResolvedValue(makeMessages(4));

        const result = await caller.getFileMessages({ fileId: "f1", limit: 3 });

        expect(result.messages).toHaveLength(3);
        expect(result.nextCursor).toBe("m3");
        expect(mocks.db.message.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 4, where: { fileId: "f1" } })
        );
    });

    it("returns no cursor on the final page", async () => {
        mocks.db.file.findFirst.mockResolvedValue({ id: "f1" });
        mocks.db.message.findMany.mockResolvedValue(makeMessages(2));

        const result = await caller.getFileMessages({ fileId: "f1", limit: 3 });

        expect(result.messages).toHaveLength(2);
        expect(result.nextCursor).toBeUndefined();
    });
});

describe("deleteFile", () => {
    const FILE = { id: "f1", blobName: "user_1/f1.pdf", userId: "user_1" };

    it("refuses to delete a file the caller does not own", async () => {
        mocks.db.file.findFirst.mockResolvedValue(null);

        await expect(caller.deleteFile({ id: "f1" })).rejects.toMatchObject({
            code: "NOT_FOUND",
        });

        expect(mocks.db.file.delete).not.toHaveBeenCalled();
        expect(mocks.deleteChunksForFile).not.toHaveBeenCalled();
        expect(mocks.deleteBlob).not.toHaveBeenCalled();
    });

    it("removes indexed chunks and the blob before deleting the row", async () => {
        mocks.db.file.findFirst.mockResolvedValue(FILE);
        mocks.db.file.delete.mockResolvedValue(FILE);

        const result = await caller.deleteFile({ id: "f1" });

        expect(result).toEqual(FILE);
        expect(mocks.deleteChunksForFile).toHaveBeenCalledWith("f1");
        expect(mocks.deleteBlob).toHaveBeenCalledWith("user_1/f1.pdf");
        expect(mocks.db.file.delete).toHaveBeenCalledWith({ where: { id: "f1" } });
    });

    it("still deletes the row when external cleanup fails", async () => {
        mocks.db.file.findFirst.mockResolvedValue(FILE);
        mocks.db.file.delete.mockResolvedValue(FILE);
        mocks.deleteChunksForFile.mockRejectedValue(new Error("index unreachable"));
        mocks.deleteBlob.mockRejectedValue(new Error("network"));

        await expect(caller.deleteFile({ id: "f1" })).resolves.toEqual(FILE);
        expect(mocks.db.file.delete).toHaveBeenCalledWith({ where: { id: "f1" } });
    });
});

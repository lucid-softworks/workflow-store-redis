import {
  serializeWorkflowCheckpointRecord,
  workflowCheckpointToRecord,
} from "@lucid-softworks/workflow-checkpoint-codec";
import {
  createWorkflowStoreFixture,
  verifyWorkflowCheckpointStore,
} from "@lucid-softworks/workflow-store-testkit";
import { describe, expect, it } from "vitest";

import {
  RedisWorkflowCheckpointStore,
  type RedisWorkflowClient,
} from "../src/index.js";

class MemoryRedisClient implements RedisWorkflowClient {
  readonly values = new Map<string, string>();
  readonly calls: readonly string[][] = [];

  async sendCommand(arguments_: readonly string[]): Promise<unknown> {
    (this.calls as string[][]).push([...arguments_]);
    const [command, key, value] = arguments_;
    if (command === "GET") return this.values.get(key as string);
    if (command === "SET") {
      this.values.set(key as string, value as string);
      return "OK";
    }
    if (command === "DEL") return this.values.delete(key as string) ? 1 : 0;
    return undefined;
  }
}

describe("RedisWorkflowCheckpointStore", () => {
  it("satisfies the shared checkpoint store contract", async () => {
    await expect(
      verifyWorkflowCheckpointStore(() => ({
        store: new RedisWorkflowCheckpointStore(new MemoryRedisClient()),
      })),
    ).resolves.toBeUndefined();
  });

  it("supports custom prefixes, binary replies, and absent replies", async () => {
    const checkpoint = createWorkflowStoreFixture("run");
    const source = serializeWorkflowCheckpointRecord(
      workflowCheckpointToRecord(checkpoint),
    );
    const responses: unknown[] = [
      new TextEncoder().encode(source),
      42,
      undefined,
    ];
    const client: RedisWorkflowClient = {
      sendCommand: () => Promise.resolve(responses.shift()),
    };
    expect(
      () => new RedisWorkflowCheckpointStore(client, { prefix: "" }),
    ).toThrow(TypeError);
    const store = new RedisWorkflowCheckpointStore(client, {
      prefix: "custom",
    });
    expect(await store.load("run")).toEqual(checkpoint);
    expect(await store.load("number")).toBeUndefined();
    expect(await store.load("missing")).toBeUndefined();
  });
});

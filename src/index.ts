import {
  type WorkflowCheckpoint,
  type WorkflowCheckpointStore,
} from "@lucid-softworks/workflow-checkpoint";
import {
  deserializeWorkflowCheckpointRecord,
  serializeWorkflowCheckpointRecord,
  workflowCheckpointFromRecord,
  workflowCheckpointToRecord,
} from "@lucid-softworks/workflow-checkpoint-codec";

export interface RedisWorkflowClient {
  sendCommand(arguments_: readonly string[]): PromiseLike<unknown>;
}

function text(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  return undefined;
}

/** Atomic checkpoint storage for node-redis compatible clients. */
export class RedisWorkflowCheckpointStore implements WorkflowCheckpointStore {
  readonly #checkpointPrefix: string;

  constructor(
    readonly client: RedisWorkflowClient,
    options: Readonly<{ prefix?: string }> = {},
  ) {
    const prefix = options.prefix ?? "lucid:workflow";
    if (prefix.length === 0)
      throw new TypeError("Redis workflow prefix cannot be empty");
    this.#checkpointPrefix = `${prefix}:checkpoint:`;
  }

  async load(executionId: string): Promise<WorkflowCheckpoint | undefined> {
    const source = text(
      await this.client.sendCommand(["GET", this.#key(executionId)]),
    );
    return source === undefined
      ? undefined
      : workflowCheckpointFromRecord(
          deserializeWorkflowCheckpointRecord(source),
        );
  }

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    await this.client.sendCommand([
      "SET",
      this.#key(checkpoint.executionId),
      serializeWorkflowCheckpointRecord(workflowCheckpointToRecord(checkpoint)),
    ]);
  }

  async delete(executionId: string): Promise<boolean> {
    const result = await this.client.sendCommand([
      "DEL",
      this.#key(executionId),
    ]);
    return Number(result) === 1;
  }

  #key(executionId: string): string {
    return `${this.#checkpointPrefix}${executionId}`;
  }
}

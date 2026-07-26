# `@lucid-softworks/workflow-store-redis`

Atomic `WorkflowCheckpointStore` persistence for Redis. The structural
`sendCommand` interface works with node-redis-compatible clients without adding
a mandatory Redis dependency.

```sh
npm install @lucid-softworks/workflow-store-redis redis
```

```ts
import { createClient } from "redis";
import { RedisWorkflowCheckpointStore } from "@lucid-softworks/workflow-store-redis";

const client = await createClient().connect();
const checkpoints = new RedisWorkflowCheckpointStore(client);
```

Each execution is stored as one lossless encoded value, so `SET` atomically
replaces the complete checkpoint. Use `prefix` to isolate applications.

/**
 * Merkle Root Computation for Event Stream Checkpoints
 * 
 * This module provides functionality to compute Merkle roots for event streams,
 * enabling verifiable checkpoints and immutable memory for governance events.
 * 
 * Events include:
 * - Policy changes
 * - Workflow updates
 * - Drift detections
 * - Automated fixes
 * - Manual interventions
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface GovernanceEvent {
  timestamp: string;
  type: string;
  repository: string;
  actor?: string;
  data: Record<string, unknown>;
  hash?: string;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: GovernanceEvent;
}

export interface MerkleCheckpoint {
  root_hash: string;
  timestamp: string;
  event_count: number;
  events: GovernanceEvent[];
}

/**
 * Compute SHA256 hash of data
 */
export function computeHash(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Hash a governance event
 */
export function hashEvent(event: GovernanceEvent): string {
  const eventCopy = { ...event };
  delete eventCopy.hash;
  const canonical = JSON.stringify(eventCopy, Object.keys(eventCopy).sort());
  return computeHash(canonical);
}

/**
 * Build Merkle tree from leaf nodes
 */
export function buildMerkleTree(events: GovernanceEvent[]): MerkleNode | null {
  if (events.length === 0) {
    return null;
  }

  // Create leaf nodes
  let nodes: MerkleNode[] = events.map((event) => ({
    hash: hashEvent(event),
    data: { ...event, hash: hashEvent(event) },
  }));

  // Build tree bottom-up
  while (nodes.length > 1) {
    const nextLevel: MerkleNode[] = [];

    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 < nodes.length) {
        // Pair exists
        const combined = nodes[i].hash + nodes[i + 1].hash;
        nextLevel.push({
          hash: computeHash(combined),
          left: nodes[i],
          right: nodes[i + 1],
        });
      } else {
        // Odd node, promote to next level
        nextLevel.push(nodes[i]);
      }
    }

    nodes = nextLevel;
  }

  return nodes[0];
}

/**
 * Compute Merkle root from events
 */
export function computeMerkleRoot(events: GovernanceEvent[]): string | null {
  const tree = buildMerkleTree(events);
  return tree?.hash ?? null;
}

/**
 * Create a checkpoint from events
 */
export function createCheckpoint(events: GovernanceEvent[]): MerkleCheckpoint {
  const eventsWithHashes = events.map((e) => ({
    ...e,
    hash: hashEvent(e),
  }));

  return {
    root_hash: computeMerkleRoot(eventsWithHashes) ?? "",
    timestamp: new Date().toISOString(),
    event_count: events.length,
    events: eventsWithHashes,
  };
}

/**
 * Verify a checkpoint
 */
export function verifyCheckpoint(checkpoint: MerkleCheckpoint): boolean {
  const computed = computeMerkleRoot(checkpoint.events);
  return computed === checkpoint.root_hash;
}

/**
 * Load events from file
 */
export function loadEvents(filePath: string): GovernanceEvent[] {
  if (!existsSync(filePath)) {
    return [];
  }
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content) as GovernanceEvent[];
}

/**
 * Save checkpoint to file
 */
export function saveCheckpoint(
  checkpoint: MerkleCheckpoint,
  filePath: string,
): void {
  writeFileSync(filePath, JSON.stringify(checkpoint, null, 2));
}

/**
 * CLI entry point
 */
export async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "compute") {
    const eventsFile = args[1] || ".github/governance/events.json";
    const checkpointFile = args[2] || ".github/governance/checkpoint.json";

    console.log(`Loading events from ${eventsFile}...`);
    const events = loadEvents(eventsFile);
    console.log(`Loaded ${events.length} events`);

    console.log("Computing Merkle root...");
    const checkpoint = createCheckpoint(events);
    console.log(`Merkle root: ${checkpoint.root_hash}`);

    console.log(`Saving checkpoint to ${checkpointFile}...`);
    saveCheckpoint(checkpoint, checkpointFile);
    console.log("✓ Checkpoint saved");
  } else if (command === "verify") {
    const checkpointFile = args[1] || ".github/governance/checkpoint.json";

    console.log(`Loading checkpoint from ${checkpointFile}...`);
    const checkpoint = JSON.parse(
      readFileSync(checkpointFile, "utf-8"),
    ) as MerkleCheckpoint;

    console.log("Verifying checkpoint...");
    const valid = verifyCheckpoint(checkpoint);

    if (valid) {
      console.log("✓ Checkpoint is valid");
      console.log(`  Root hash: ${checkpoint.root_hash}`);
      console.log(`  Event count: ${checkpoint.event_count}`);
      console.log(`  Timestamp: ${checkpoint.timestamp}`);
    } else {
      console.error("✗ Checkpoint verification failed");
      process.exit(1);
    }
  } else {
    console.log("Usage:");
    console.log("  bun scripts/compute-merkle.ts compute [events.json] [checkpoint.json]");
    console.log("  bun scripts/compute-merkle.ts verify [checkpoint.json]");
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

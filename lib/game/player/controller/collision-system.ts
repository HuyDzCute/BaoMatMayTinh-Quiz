/**
 * Collision System
 *
 * Gameplay Phase 1: Player Controller
 * Collision detection and response
 */

import type { Vector3D } from "../types";

/**
 * Axis-Aligned Bounding Box
 */
export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * Collision collider type
 */
export type ColliderType = "box" | "sphere" | "capsule";

/**
 * Base collider interface
 */
export interface ICollider {
  readonly type: ColliderType;
  readonly id: string;
  getAABB(): AABB;
  containsPoint(point: Vector3D): boolean;
}

/**
 * Box collider
 */
export class BoxCollider implements ICollider {
  readonly type = "box" as const;
  readonly id: string;

  constructor(
    id: string,
    private center: Vector3D,
    private size: Vector3D
  ) {
    this.id = id;
  }

  getAABB(): AABB {
    const halfSize = {
      x: this.size.x / 2,
      y: this.size.y / 2,
      z: this.size.z / 2,
    };

    return {
      minX: this.center.x - halfSize.x,
      maxX: this.center.x + halfSize.x,
      minY: this.center.y - halfSize.y,
      maxY: this.center.y + halfSize.y,
      minZ: this.center.z - halfSize.z,
      maxZ: this.center.z + halfSize.z,
    };
  }

  containsPoint(point: Vector3D): boolean {
    const aabb = this.getAABB();
    return (
      point.x >= aabb.minX &&
      point.x <= aabb.maxX &&
      point.y >= aabb.minY &&
      point.y <= aabb.maxY &&
      point.z >= aabb.minZ &&
      point.z <= aabb.maxZ
    );
  }

  /**
   * Check if player collides with this box
   */
  intersectsPlayer(playerPos: Vector3D, playerRadius: number): boolean {
    const aabb = this.getAABB();

    // Find closest point on AABB to player center
    const closestX = Math.max(aabb.minX, Math.min(playerPos.x, aabb.maxX));
    const closestY = Math.max(aabb.minY, Math.min(playerPos.y, aabb.maxY));
    const closestZ = Math.max(aabb.minZ, Math.min(playerPos.z, aabb.maxZ));

    // Calculate distance from closest point to player center
    const distanceX = playerPos.x - closestX;
    const distanceY = playerPos.y - closestY;
    const distanceZ = playerPos.z - closestZ;

    const distanceSquared = distanceX * distanceX + distanceY * distanceY + distanceZ * distanceZ;

    return distanceSquared < playerRadius * playerRadius;
  }
}

/**
 * Collision system for managing world collisions
 */
export class CollisionSystem {
  private colliders: Map<string, ICollider> = new Map();
  private staticColliders: ICollider[] = [];

  /**
   * Add a collider to the system
   */
  addCollider(collider: ICollider): void {
    this.colliders.set(collider.id, collider);
  }

  /**
   * Remove a collider from the system
   */
  removeCollider(id: string): void {
    this.colliders.delete(id);
  }

  /**
   * Clear all colliders
   */
  clear(): void {
    this.colliders.clear();
    this.staticColliders = [];
  }

  /**
   * Set static colliders (walls, floors)
   */
  setStaticColliders(colliders: ICollider[]): void {
    this.staticColliders = colliders;
  }

  /**
   * Check if a position collides with any static collider
   */
  checkCollision(position: Vector3D, radius: number): ICollider | null {
    // Check static colliders
    for (const collider of this.staticColliders) {
      if (collider.type === "box" && collider instanceof BoxCollider) {
        if (collider.intersectsPlayer(position, radius)) {
          return collider;
        }
      }
    }

    // Check dynamic colliders
    for (const collider of this.colliders.values()) {
      if (collider.type === "box" && collider instanceof BoxCollider) {
        if (collider.intersectsPlayer(position, radius)) {
          return collider;
        }
      }
    }

    return null;
  }

  /**
   * Resolve collision by pushing player out of collider
   */
  resolveCollision(position: Vector3D, radius: number): Vector3D {
    const collider = this.checkCollision(position, radius);
    if (!collider) return position;

    if (collider.type === "box" && collider instanceof BoxCollider) {
      return this.resolveBoxCollision(position, radius, collider);
    }

    return position;
  }

  /**
   * Resolve collision with box collider
   */
  private resolveBoxCollision(
    position: Vector3D,
    radius: number,
    box: BoxCollider
  ): Vector3D {
    const aabb = box.getAABB();

    // Find closest point on AABB
    const closestX = Math.max(aabb.minX, Math.min(position.x, aabb.maxX));
    const closestY = Math.max(aabb.minY, Math.min(position.y, aabb.maxY));
    const closestZ = Math.max(aabb.minZ, Math.min(position.z, aabb.maxZ));

    // Calculate push-out direction
    const dx = position.x - closestX;
    const dy = position.y - closestY;
    const dz = position.z - closestZ;

    const distX = Math.abs(dx);
    const distY = Math.abs(dy);
    const distZ = Math.abs(dz);

    // Push out along smallest axis
    if (distX <= distY && distX <= distZ) {
      return {
        x: dx > 0 ? aabb.maxX + radius : aabb.minX - radius,
        y: position.y,
        z: position.z,
      };
    } else if (distY <= distX && distY <= distZ) {
      return {
        x: position.x,
        y: dy > 0 ? aabb.maxY + radius : aabb.minY - radius,
        z: position.z,
      };
    } else {
      return {
        x: position.x,
        y: position.y,
        z: dz > 0 ? aabb.maxZ + radius : aabb.minZ - radius,
      };
    }
  }

  /**
   * Check if player is on ground (ray cast down)
   */
  checkGround(position: Vector3D, radius: number, groundY: number): boolean {
    // Simple ground check - player is grounded if within threshold of ground level
    return position.y - radius <= groundY + 0.01;
  }

  /**
   * Get all colliders
   */
  getColliders(): ICollider[] {
    return [...this.staticColliders, ...this.colliders.values()];
  }
}

// Singleton instance
let collisionSystemInstance: CollisionSystem | null = null;

/**
 * Get collision system singleton
 */
export function getCollisionSystem(): CollisionSystem {
  if (!collisionSystemInstance) {
    collisionSystemInstance = new CollisionSystem();
  }
  return collisionSystemInstance;
}

/**
 * Reset collision system singleton
 */
export function resetCollisionSystem(): void {
  if (collisionSystemInstance) {
    collisionSystemInstance.clear();
  }
}

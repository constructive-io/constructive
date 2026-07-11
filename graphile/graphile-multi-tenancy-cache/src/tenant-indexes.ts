export class TenantIndexes {
  private readonly svcKeyToBuildKey = new Map<string, string>();
  private readonly databaseIdToBuildKeys = new Map<string, Set<string>>();

  get svcKeyMappingCount(): number {
    return this.svcKeyToBuildKey.size;
  }

  get databaseIdMappingCount(): number {
    return this.databaseIdToBuildKeys.size;
  }

  getBuildKeyForSvcKey(svcKey: string): string | undefined {
    return this.svcKeyToBuildKey.get(svcKey);
  }

  getSvcKeysForBuildKey(buildKey: string): string[] {
    const result: string[] = [];
    for (const [svcKey, bk] of this.svcKeyToBuildKey) {
      if (bk === buildKey) result.push(svcKey);
    }
    return result;
  }

  getBuildKeysForDatabaseId(databaseId: string): string[] {
    const buildKeys = this.databaseIdToBuildKeys.get(databaseId);
    return buildKeys ? [...buildKeys] : [];
  }

  registerMapping(
    svcKey: string,
    buildKey: string,
    databaseId: string | undefined,
    evictOrphanedBuildKey: (buildKey: string) => void,
  ): void {
    const oldBuildKey = this.svcKeyToBuildKey.get(svcKey);

    if (oldBuildKey && oldBuildKey !== buildKey) {
      this.svcKeyToBuildKey.delete(svcKey);

      if (this.getSvcKeysForBuildKey(oldBuildKey).length === 0) {
        evictOrphanedBuildKey(oldBuildKey);
      }
    }

    this.svcKeyToBuildKey.set(svcKey, buildKey);
    if (databaseId) {
      let keys = this.databaseIdToBuildKeys.get(databaseId);
      if (!keys) {
        keys = new Set();
        this.databaseIdToBuildKeys.set(databaseId, keys);
      }
      keys.add(buildKey);
    }
  }

  removeBuildKey(buildKey: string): void {
    for (const svcKey of this.getSvcKeysForBuildKey(buildKey)) {
      this.svcKeyToBuildKey.delete(svcKey);
    }

    for (const [dbId, keys] of this.databaseIdToBuildKeys) {
      keys.delete(buildKey);
      if (keys.size === 0) this.databaseIdToBuildKeys.delete(dbId);
    }
  }

  deleteDatabaseId(databaseId: string): void {
    this.databaseIdToBuildKeys.delete(databaseId);
  }

  clear(): void {
    this.svcKeyToBuildKey.clear();
    this.databaseIdToBuildKeys.clear();
  }
}

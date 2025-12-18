import git from 'isomorphic-git';
import { SupabaseStorageFS } from '@/lib/storage';

// Git HTTP Smart Protocol implementation
export class GitHTTPBackend {
  private fs: any;
  private dir: string = '/';
  private storageFS: SupabaseStorageFS;

  constructor(storageFS: SupabaseStorageFS) {
    this.storageFS = storageFS;

    // Create fs adapter compatible with isomorphic-git
    // isomorphic-git expects fs.promises to contain async methods
    const createStat = (stat: { type: 'file' | 'dir'; size: number }) => ({
      type: stat.type === 'dir' ? 'dir' : 'file',
      mode: stat.type === 'dir' ? 0o40755 : 0o100644,
      size: stat.size,
      ino: 0,
      mtimeMs: Date.now(),
      ctimeMs: Date.now(),
      uid: 1,
      gid: 1,
      dev: 1,
      isFile: () => stat.type === 'file',
      isDirectory: () => stat.type === 'dir',
      isSymbolicLink: () => false,
    });

    const fsPromises = {
      readFile: async (path: string, options?: any) => {
        const data = await storageFS.readFile(path);
        if (options?.encoding === 'utf8') {
          return new TextDecoder().decode(data);
        }
        return Buffer.from(data);
      },
      writeFile: async (path: string, data: Uint8Array | string) => {
        await storageFS.writeFile(path, data);
      },
      unlink: async (path: string) => storageFS.unlink(path),
      readdir: async (path: string) => storageFS.readdir(path),
      mkdir: async (path: string, options?: any) => {
        await storageFS.mkdir(path);
      },
      rmdir: async (path: string) => storageFS.rmdir(path),
      stat: async (path: string) => {
        const stat = await storageFS.stat(path);
        return createStat(stat);
      },
      lstat: async (path: string) => {
        const stat = await storageFS.lstat(path);
        return createStat(stat);
      },
      rename: async (oldPath: string, newPath: string) => {
        const data = await storageFS.readFile(oldPath);
        await storageFS.writeFile(newPath, data);
        await storageFS.unlink(oldPath);
      },
      symlink: async () => { /* no-op, symlinks not supported */ },
      readlink: async () => { throw new Error('ENOENT: symlinks not supported'); },
      chmod: async () => { /* no-op */ },
    };

    // isomorphic-git needs fs.promises for async operations
    this.fs = { promises: fsPromises };
  }

  // Handle git-upload-pack (fetch/clone)
  async uploadPack(body: Uint8Array): Promise<Uint8Array> {
    // Parse the wants and haves from the request
    const request = parseGitRequest(body);

    console.log('Upload-pack: wants =', request.wants);
    console.log('Upload-pack: haves =', request.haves);

    // Collect all objects needed for the pack
    const objects: Array<{ type: number; data: Uint8Array }> = [];
    const visited = new Set<string>();

    // Walk the commit graph from wants, collecting all objects
    for (const oid of request.wants) {
      await this.collectObjects(oid, objects, visited, request.haves);
    }

    console.log(`Upload-pack: collected ${objects.length} objects`);

    // Create the pack file manually
    const pack = await this.buildPackFile(objects);

    return pack;
  }

  // Collect all objects reachable from the given OID
  private async collectObjects(
    oid: string,
    objects: Array<{ type: number; data: Uint8Array }>,
    visited: Set<string>,
    haves: string[]
  ): Promise<void> {
    if (visited.has(oid) || haves.includes(oid)) return;
    visited.add(oid);

    try {
      const { type, data } = await this.readObject(oid);
      objects.push({ type, data });
      console.log(`Collected object: ${oid.slice(0, 8)} (type ${type})`);

      // Recursively collect referenced objects
      if (type === 1) {
        // Commit - parse and follow tree and parents
        const text = new TextDecoder().decode(data);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('tree ')) {
            const treeOid = line.slice(5, 45);
            await this.collectObjects(treeOid, objects, visited, haves);
          } else if (line.startsWith('parent ')) {
            const parentOid = line.slice(7, 47);
            await this.collectObjects(parentOid, objects, visited, haves);
          } else if (line === '') {
            break; // End of headers
          }
        }
      } else if (type === 2) {
        // Tree - parse and follow blob/tree entries
        let offset = 0;
        while (offset < data.length) {
          // Find space separator (after mode)
          let spacePos = offset;
          while (data[spacePos] !== 0x20) spacePos++;
          // Find null separator (after name)
          let nullPos = spacePos + 1;
          while (data[nullPos] !== 0) nullPos++;
          // Read 20-byte SHA
          const entryOid = Array.from(data.slice(nullPos + 1, nullPos + 21))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          await this.collectObjects(entryOid, objects, visited, haves);
          offset = nullPos + 21;
        }
      }
      // Blobs (type 3) and tags (type 4) don't have references
    } catch (error) {
      console.error(`Failed to read object ${oid}:`, error);
    }
  }

  // Read a loose object from storage
  private async readObject(oid: string): Promise<{ type: number; data: Uint8Array }> {
    const path = `.git/objects/${oid.slice(0, 2)}/${oid.slice(2)}`;
    const compressed = await this.fs.promises.readFile(path);
    const pako = await import('pako');
    const decompressed = pako.inflate(compressed);

    // Parse the header: "type size\0data"
    let headerEnd = 0;
    while (decompressed[headerEnd] !== 0) headerEnd++;
    const header = new TextDecoder().decode(decompressed.slice(0, headerEnd));
    const [typeName] = header.split(' ');

    const typeMap: Record<string, number> = {
      commit: 1,
      tree: 2,
      blob: 3,
      tag: 4,
    };

    return {
      type: typeMap[typeName] || 0,
      data: decompressed.slice(headerEnd + 1),
    };
  }

  // Build a pack file from collected objects
  private async buildPackFile(objects: Array<{ type: number; data: Uint8Array }>): Promise<Uint8Array> {
    const pako = await import('pako');
    const parts: Uint8Array[] = [];

    // Pack header: "PACK" + version (2) + object count
    const header = new Uint8Array(12);
    header.set([0x50, 0x41, 0x43, 0x4b], 0); // "PACK"
    header[4] = 0; header[5] = 0; header[6] = 0; header[7] = 2; // Version 2
    const count = objects.length;
    header[8] = (count >> 24) & 0xff;
    header[9] = (count >> 16) & 0xff;
    header[10] = (count >> 8) & 0xff;
    header[11] = count & 0xff;
    parts.push(header);

    // Add each object
    for (const obj of objects) {
      // Object header: type (3 bits) + size (variable length)
      const type = obj.type;
      const size = obj.data.length;

      const headerBytes: number[] = [];
      let byte = (type << 4) | (size & 0x0f);
      let remaining = size >> 4;

      while (remaining > 0) {
        headerBytes.push(byte | 0x80);
        byte = remaining & 0x7f;
        remaining >>= 7;
      }
      headerBytes.push(byte);
      parts.push(new Uint8Array(headerBytes));

      // Compressed object data
      const compressed = pako.deflate(obj.data);
      parts.push(compressed);
    }

    // Calculate total size and combine
    let totalSize = parts.reduce((sum, p) => sum + p.length, 0);
    const packWithoutChecksum = new Uint8Array(totalSize);
    let offset = 0;
    for (const part of parts) {
      packWithoutChecksum.set(part, offset);
      offset += part.length;
    }

    // Add SHA-1 checksum
    const hashBuffer = await crypto.subtle.digest('SHA-1', packWithoutChecksum);
    const checksum = new Uint8Array(hashBuffer);

    const pack = new Uint8Array(totalSize + 20);
    pack.set(packWithoutChecksum, 0);
    pack.set(checksum, totalSize);

    console.log(`Built pack file: ${pack.length} bytes, ${objects.length} objects`);
    return pack;
  }

  // Handle git-receive-pack (push)
  async receivePack(body: Uint8Array): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Receive-pack: processing ${body.length} bytes`);

      // Parse the push request
      const { refs, packData } = parseReceivePackRequest(body);

      console.log(`Receive-pack: found ${refs.length} refs, pack size: ${packData.length}`);
      for (const ref of refs) {
        console.log(`  Ref: ${ref.name} ${ref.oldOid.substring(0, 8)}..${ref.newOid.substring(0, 8)}`);
      }

      // Apply the pack data first (contains the objects)
      if (packData && packData.length > 0) {
        await this.applyPackData(packData);
      }

      // Update refs after pack is applied
      for (const ref of refs) {
        console.log(`Updating ref: ${ref.name} to ${ref.newOid}`);
        await this.updateRef(ref.name, ref.newOid, ref.oldOid);
      }

      return { success: true, message: 'ok' };
    } catch (error) {
      console.error('Receive-pack error:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  // Get refs advertisement for info/refs endpoint
  async getInfoRefs(service: 'git-upload-pack' | 'git-receive-pack'): Promise<string> {
    const refs = await this.getAllRefs();
    const HEAD = await this.getHEAD();

    let response = '';

    // Add service advertisement
    const serviceLine = `# service=${service}\n`;
    response += pktLine(serviceLine);
    response += '0000'; // Flush

    // Add capabilities
    const capabilities = [
      'multi_ack',
      'thin-pack',
      'side-band',
      'side-band-64k',
      'ofs-delta',
      'shallow',
      'deepen-since',
      'deepen-not',
      'deepen-relative',
      'no-progress',
      'include-tag',
      'multi_ack_detailed',
      'no-done',
      'symref=HEAD:refs/heads/main',
      'object-format=sha1',
      'agent=gitforge/1.0',
    ];

    if (refs.length === 0) {
      // Empty repository
      const emptyLine = `0000000000000000000000000000000000000000 capabilities^{}\0${capabilities.join(' ')}\n`;
      response += pktLine(emptyLine);
    } else {
      // Add HEAD first if it exists
      if (HEAD) {
        const headLine = `${HEAD} HEAD\0${capabilities.join(' ')}\n`;
        response += pktLine(headLine);
      }

      // Add all refs
      for (const ref of refs) {
        const refLine = `${ref.oid} ${ref.name}\n`;
        response += pktLine(refLine);
      }
    }

    response += '0000'; // Final flush
    return response;
  }

  private async getAllRefs(): Promise<Array<{ name: string; oid: string }>> {
    const refs: Array<{ name: string; oid: string }> = [];

    try {
      // Get branches
      const branches = await git.listBranches({ fs: this.fs, dir: this.dir });
      for (const branch of branches) {
        try {
          const oid = await git.resolveRef({
            fs: this.fs,
            dir: this.dir,
            ref: `refs/heads/${branch}`,
          });
          refs.push({ name: `refs/heads/${branch}`, oid });
        } catch {
          // Skip unresolvable refs
        }
      }

      // Get tags
      const tags = await git.listTags({ fs: this.fs, dir: this.dir });
      for (const tag of tags) {
        try {
          const oid = await git.resolveRef({
            fs: this.fs,
            dir: this.dir,
            ref: `refs/tags/${tag}`,
          });
          refs.push({ name: `refs/tags/${tag}`, oid });
        } catch {
          // Skip unresolvable refs
        }
      }
    } catch {
      // Empty repository
    }

    return refs;
  }

  private async getHEAD(): Promise<string | null> {
    try {
      return await git.resolveRef({
        fs: this.fs,
        dir: this.dir,
        ref: 'HEAD',
      });
    } catch {
      return null;
    }
  }

  private async createPackFile(wants: string[], haves: string[]): Promise<Uint8Array> {
    try {
      const { packfile } = await git.packObjects({
        fs: this.fs,
        dir: this.dir,
        oids: wants,
      });
      return packfile ?? new Uint8Array();
    } catch (e) {
      console.error('Error creating pack file:', e);
      return new Uint8Array();
    }
  }

  private async applyPackData(packData: Uint8Array): Promise<void> {
    if (packData.length < 12) {
      console.log('Pack data too small, skipping');
      return;
    }

    // Verify PACK header
    const header = new TextDecoder().decode(packData.slice(0, 4));
    if (header !== 'PACK') {
      console.error('Invalid pack header:', header);
      throw new Error('Invalid pack file');
    }

    const version = (packData[4] << 24) | (packData[5] << 16) | (packData[6] << 8) | packData[7];
    const numObjects = (packData[8] << 24) | (packData[9] << 16) | (packData[10] << 8) | packData[11];
    console.log(`Pack version: ${version}, objects: ${numObjects}`);

    // Parse and extract objects from pack file
    const pako = await import('pako');
    let offset = 12; // Skip header

    for (let i = 0; i < numObjects; i++) {
      if (offset >= packData.length - 20) break; // 20 bytes for checksum

      // Read object header (variable length encoding)
      let byte = packData[offset++];
      const type = (byte >> 4) & 0x7;
      let size = byte & 0x0f;
      let shift = 4;

      while (byte & 0x80) {
        byte = packData[offset++];
        size |= (byte & 0x7f) << shift;
        shift += 7;
      }

      // Handle delta objects differently
      if (type === 6) { // OFS_DELTA
        // Skip base object offset
        byte = packData[offset++];
        while (byte & 0x80) {
          byte = packData[offset++];
        }
      } else if (type === 7) { // REF_DELTA
        // Skip 20-byte base object SHA
        offset += 20;
      }

      // Decompress the object data
      try {
        const inflator = new pako.Inflate() as pako.Inflate & { ended?: boolean; strm?: { next_in?: number } };
        let chunkStart = offset;
        let chunkSize = Math.min(1024, packData.length - offset);

        // Feed data in chunks until decompression is complete
        while (true) {
          const chunk = packData.slice(chunkStart, chunkStart + chunkSize);
          const done = inflator.push(chunk, false);

          if (inflator.err) {
            throw new Error(`Decompression error: ${inflator.msg}`);
          }

          if (inflator.ended) {
            // Update offset to where we stopped consuming input
            offset = chunkStart + (inflator.strm?.next_in || 0);
            break;
          }

          chunkStart += chunkSize;
          chunkSize = Math.min(1024, packData.length - chunkStart);
          if (chunkSize <= 0) break;
        }

        const objectData = inflator.result as Uint8Array;
        if (!objectData || objectData.length === 0) continue;

        // Get object type name
        const typeNames: Record<number, string> = {
          1: 'commit', 2: 'tree', 3: 'blob', 4: 'tag'
        };
        const typeName = typeNames[type];
        if (!typeName) {
          console.log(`Skipping unsupported object type: ${type}`);
          continue;
        }

        // Create object content with header
        const objectHeader = `${typeName} ${objectData.length}\0`;
        const fullContent = new Uint8Array(objectHeader.length + objectData.length);
        fullContent.set(new TextEncoder().encode(objectHeader), 0);
        fullContent.set(objectData, objectHeader.length);

        // Calculate SHA-1 hash
        const hashBuffer = await crypto.subtle.digest('SHA-1', fullContent);
        const hashArray = new Uint8Array(hashBuffer);
        const oid = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

        // Compress and write loose object
        const compressed = pako.deflate(fullContent);
        const objectDir = `.git/objects/${oid.slice(0, 2)}`;
        const objectPath = `${objectDir}/${oid.slice(2)}`;

        await this.fs.promises.writeFile(objectPath, compressed);
        console.log(`Wrote object: ${oid.slice(0, 8)} (${typeName})`);
      } catch (e) {
        // Try to find next object by scanning for next valid header
        console.log(`Error processing object ${i}, attempting to continue`);
        continue;
      }
    }

    console.log('Pack data processed');
  }

  private async updateRef(refName: string, newOid: string, oldOid: string): Promise<void> {
    if (newOid === '0000000000000000000000000000000000000000') {
      // Delete ref
      await git.deleteRef({
        fs: this.fs,
        dir: this.dir,
        ref: refName,
      });
    } else {
      // Create or update ref
      await git.writeRef({
        fs: this.fs,
        dir: this.dir,
        ref: refName,
        value: newOid,
        force: true,
      });
    }
  }
}

// Helper: Create a pkt-line
function pktLine(data: string): string {
  const length = data.length + 4;
  const hex = length.toString(16).padStart(4, '0');
  return hex + data;
}

// Helper: Parse git request body
function parseGitRequest(body: Uint8Array): { wants: string[]; haves: string[] } {
  const text = new TextDecoder().decode(body);
  const lines = text.split('\n').filter((line) => line.length > 4);

  const wants: string[] = [];
  const haves: string[] = [];

  for (const line of lines) {
    const content = line.substring(4); // Skip pkt-line length
    if (content.startsWith('want ')) {
      const oid = content.substring(5, 45);
      wants.push(oid);
    } else if (content.startsWith('have ')) {
      const oid = content.substring(5, 45);
      haves.push(oid);
    }
  }

  return { wants, haves };
}

// Helper: Parse receive-pack request
function parseReceivePackRequest(body: Uint8Array): {
  refs: Array<{ name: string; oldOid: string; newOid: string }>;
  packData: Uint8Array;
} {
  const refs: Array<{ name: string; oldOid: string; newOid: string }> = [];

  // Find the PACK header position
  let packStart = 0;
  for (let i = 0; i < body.length - 4; i++) {
    if (
      body[i] === 0x50 && // P
      body[i + 1] === 0x41 && // A
      body[i + 2] === 0x43 && // C
      body[i + 3] === 0x4b // K
    ) {
      packStart = i;
      break;
    }
  }

  // Parse refs from the command portion
  const commandPortion = body.slice(0, packStart);
  const commandText = new TextDecoder().decode(commandPortion);
  const lines = commandText.split('\n').filter((line) => line.length > 0);

  for (const line of lines) {
    // Skip pkt-line length prefix (4 hex chars)
    const content = line.length > 4 ? line.substring(4) : line;
    if (content.length < 85) continue; // Minimum: 40 + 1 + 40 + 1 + refname

    const oldOid = content.substring(0, 40);
    const newOid = content.substring(41, 81);
    const refNameEnd = content.indexOf('\0');
    const refName = refNameEnd > 82 ? content.substring(82, refNameEnd) : content.substring(82);

    if (refName && /^refs\//.test(refName)) {
      refs.push({ name: refName, oldOid, newOid });
    }
  }

  const packData = packStart > 0 ? body.slice(packStart) : new Uint8Array();

  return { refs, packData };
}

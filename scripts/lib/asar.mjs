// Minimal, dependency-free reader for Electron app.asar archives.
import fs from 'node:fs';

/** Open an asar archive and return its entry list plus a file reader. */
export function openAsar(archive) {
  const fd = fs.openSync(archive, 'r');
  const head = Buffer.alloc(16);
  fs.readSync(fd, head, 0, 16, 0);
  const pickleSize = head.readUInt32LE(4);
  const jsonLen = head.readUInt32LE(12);
  const headerBuf = Buffer.alloc(jsonLen);
  fs.readSync(fd, headerBuf, 0, jsonLen, 16);
  const header = JSON.parse(headerBuf.toString('utf8').replace(/\0+$/, ''));
  const dataStart = 8 + pickleSize;

  const walk = (node, base, out) => {
    for (const [name, entry] of Object.entries(node.files ?? {})) {
      const path = base ? `${base}/${name}` : name;
      if (entry.files) walk(entry, path, out);
      else out.push({ path, size: entry.size ?? 0, offset: Number(entry.offset ?? 0), unpacked: entry.unpacked === true });
    }
    return out;
  };

  const entries = walk(header, '', []);
  const unpackedRoot = `${archive}.unpacked`;

  return {
    entries,
    /** Read one entry as a Buffer. */
    read(entry) {
      if (entry.unpacked) return fs.readFileSync(`${unpackedRoot}/${entry.path}`);
      const buf = Buffer.alloc(entry.size);
      fs.readSync(fd, buf, 0, entry.size, dataStart + entry.offset);
      return buf;
    },
    readPath(path) {
      const entry = entries.find((e) => e.path === path);
      if (!entry) throw new Error(`not in archive: ${path}`);
      return this.read(entry);
    },
    close() {
      fs.closeSync(fd);
    },
  };
}

/** Locate the desktop installation's app.asar, or honour DSH_ASAR / --asar. */
export function resolveAsar(explicit) {
  const candidates = [
    explicit,
    process.env.DSH_ASAR,
    `${process.env.LOCALAPPDATA ?? ''}/Programs/DeepSeek Harness/resources/app.asar`,
    `${process.env.PROGRAMFILES ?? 'C:/Program Files'}/DeepSeek Harness/resources/app.asar`,
    '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar',
  ].filter(Boolean);
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  throw new Error('app.asar not found — pass --asar "<path to app.asar>" or set DSH_ASAR');
}

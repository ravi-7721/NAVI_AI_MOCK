import { createReadStream } from "fs";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const findLatestInstaller = async () => {
  const releaseDir = path.join(process.cwd(), "release");

  try {
    const files = await fs.readdir(releaseDir);
    const exeFiles = files.filter((file) => file.toLowerCase().endsWith(".exe"));
    const installerFiles = exeFiles.filter((file) =>
      file.toLowerCase().includes("setup"),
    );
    const candidateFiles = installerFiles.length > 0 ? installerFiles : exeFiles;

    if (candidateFiles.length === 0) {
      return null;
    }

    const withStats = await Promise.all(
      candidateFiles.map(async (file) => {
        const fullPath = path.join(releaseDir, file);
        const stat = await fs.stat(fullPath);
        return { file, fullPath, modifiedAt: stat.mtimeMs };
      }),
    );

    return withStats.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
  } catch {
    return null;
  }
};

export async function GET() {
  const installer = await findLatestInstaller();

  if (!installer) {
    return new Response(
      "Windows installer not found yet. Build it with `npm run dist:win` first.",
      { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const fileStat = await fs.stat(installer.fullPath);
  const fileStream = createReadStream(installer.fullPath);

  return new Response(fileStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "content-type": "application/vnd.microsoft.portable-executable",
      "content-disposition": `attachment; filename="${installer.file}"`,
      "content-length": String(fileStat.size),
      "cache-control": "no-store",
    },
  });
}

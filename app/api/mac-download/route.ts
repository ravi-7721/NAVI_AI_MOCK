import { createReadStream } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const findLatestMacInstaller = async () => {
  const releaseDir = path.join(process.cwd(), "release");

  try {
    const files = await fs.readdir(releaseDir);
    const macFiles = files.filter((file) => {
      const lower = file.toLowerCase();
      return (
        lower.endsWith(".dmg") ||
        lower.endsWith(".pkg") ||
        lower.endsWith(".zip")
      );
    });

    if (macFiles.length === 0) {
      return null;
    }

    const withStats = await Promise.all(
      macFiles.map(async (file) => {
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
  const hostedDownloadUrl = process.env.MAC_DOWNLOAD_URL;

  if (hostedDownloadUrl) {
    return NextResponse.redirect(hostedDownloadUrl);
  }

  const installer = await findLatestMacInstaller();

  if (!installer) {
    return new Response(
      "Mac installer not found yet. Set `MAC_DOWNLOAD_URL` or build a mac package first.",
      { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const fileStat = await fs.stat(installer.fullPath);
  const fileStream = createReadStream(installer.fullPath);

  return new Response(fileStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${installer.file}"`,
      "content-length": String(fileStat.size),
      "cache-control": "no-store",
    },
  });
}

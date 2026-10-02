import { NextResponse, type NextRequest } from "next/server";
import { serializeEnvelope } from "../../../../lib/backup";
import { buildFranchiseEnvelope } from "../../../../lib/backup-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const franchiseId = new URL(request.url).searchParams.get("franchiseId");
  if (!franchiseId) {
    return NextResponse.json({ error: "franchiseId is required" }, { status: 400 });
  }

  const result = await buildFranchiseEnvelope(franchiseId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 403 });
  }

  const safeName = result.data.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(serializeEnvelope(result.data.envelope), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="franchise-${safeName || "backup"}.json"`,
      "cache-control": "no-store",
    },
  });
}

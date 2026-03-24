import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchItemDetail } from "@/lib/inventory/queries";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchItemDetail(params.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch item detail:", error);
    return NextResponse.json({ error: "Failed to fetch item detail" }, { status: 500 });
  }
}

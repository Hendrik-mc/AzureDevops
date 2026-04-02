import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const configUpdateSchema = z.object({
  storeId: z.string().min(1),
  mcPartnerId: z.string().optional(),
  mcEnvironment: z.enum(["sandbox", "production"]).optional(),
  autoSync: z.boolean().optional(),
  syncIntervalMins: z.number().min(5).max(1440).optional(),
  defaultMarkup: z.number().min(0).max(500).optional(),
  regionId: z.string().nullable().optional(),
});

/**
 * GET /api/shopify/config?storeId=xxx
 * Get plugin configuration for a store.
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json(
      { error: "Missing storeId" },
      { status: 400 }
    );
  }

  try {
    const config = await prisma.shopifyPluginConfig.findUnique({
      where: { storeId },
      include: { store: { select: { shopDomain: true, isActive: true, installedAt: true } } },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Config not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(config);
  } catch (err) {
    console.error("Failed to get config:", err);
    return NextResponse.json(
      { error: "Failed to get config" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/shopify/config
 * Update plugin configuration.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = configUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { storeId, ...updates } = parsed.data;

    const config = await prisma.shopifyPluginConfig.update({
      where: { storeId },
      data: updates,
    });

    return NextResponse.json(config);
  } catch (err) {
    console.error("Failed to update config:", err);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}

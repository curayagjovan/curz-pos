import { NextResponse } from "next/server";
import { generateSmartSku } from "@/lib/sku-generator";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      price?: number | string;
    };

    const name = body.name?.trim();
    const price = body.price;

    if (!name) {
      return NextResponse.json(
        { message: "Product name is required" },
        { status: 400 },
      );
    }

    const sku = generateSmartSku(name, price);

    return NextResponse.json({ sku }, { status: 200 });
  } catch (error) {
    console.error("Failed to generate SKU", error);
    return NextResponse.json(
      { message: "Unable to generate SKU" },
      { status: 500 },
    );
  }
}

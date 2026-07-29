import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner, requireUser } from "@/lib/auth/require-user";

const BUCKET = "qr-codes";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const FILE_BASE_BY_PROVIDER: Record<string, string> = {
  GCASH: "gcash",
  MAYA: "maya",
};

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function publicUrl(fileName: string, version: string) {
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
  return `${data.publicUrl}?v=${encodeURIComponent(version)}`;
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { data: files, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list();

    if (error) {
      throw error;
    }

    const urls: Record<string, string | null> = { GCASH: null, MAYA: null };
    for (const [provider, base] of Object.entries(FILE_BASE_BY_PROVIDER)) {
      const file = files.find((entry) => entry.name.startsWith(`${base}.`));
      if (file) {
        urls[provider] = publicUrl(file.name, file.updated_at ?? "");
      }
    }

    return NextResponse.json(urls);
  } catch (error) {
    console.error("Failed to load QR codes", error);
    return NextResponse.json(
      { message: "Unable to load QR codes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const form = await request.formData();
    const provider = String(form.get("provider") ?? "");
    const file = form.get("file");

    const fileBase = FILE_BASE_BY_PROVIDER[provider];
    if (!fileBase || !(file instanceof File)) {
      return NextResponse.json(
        { message: "Invalid QR upload" },
        { status: 400 },
      );
    }

    const extension = EXTENSION_BY_MIME[file.type];
    if (!extension) {
      return NextResponse.json(
        { message: "Use a PNG, JPG, or WebP image" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "Image is too large (max 5MB)" },
        { status: 400 },
      );
    }

    // Replace any previous upload for this provider, including ones saved
    // with a different extension.
    const staleNames = Object.values(EXTENSION_BY_MIME)
      .filter((ext) => ext !== extension)
      .map((ext) => `${fileBase}.${ext}`);
    await supabaseAdmin.storage.from(BUCKET).remove(staleNames);

    const fileName = `${fileBase}.${extension}`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      provider,
      url: publicUrl(fileName, String(Date.now())),
    });
  } catch (error) {
    console.error("Failed to upload QR code", error);
    return NextResponse.json(
      { message: "Unable to upload QR code" },
      { status: 500 },
    );
  }
}

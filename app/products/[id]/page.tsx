"use client";

import { useParams } from "next/navigation";

export default function EditPage() {
  const params = useParams();
  const productId = params.id as string;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-6 font-semibold mb-4">Edit Page</h1>
        <p className="text-4 text-[#8e8e93]">Product ID: {productId}</p>
      </div>
    </div>
  );
}

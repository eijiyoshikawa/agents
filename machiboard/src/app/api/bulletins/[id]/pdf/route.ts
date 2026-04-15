import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBulletinHtml } from "@/lib/pdf/bulletin-template";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: bulletin } = await supabase
    .from("bulletins")
    .select("*")
    .eq("id", id)
    .single();

  if (!bulletin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, organization:organizations(name)")
    .eq("user_id", user.id)
    .eq("organization_id", bulletin.organization_id)
    .single();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const org = Array.isArray(membership.organization)
    ? membership.organization[0]
    : membership.organization;
  const dateStr = format(
    new Date(bulletin.published_at ?? bulletin.created_at),
    "yyyy年M月d日",
    { locale: ja }
  );

  const html = generateBulletinHtml({
    bulletin: {
      ...bulletin,
      image_urls: bulletin.image_urls ?? [],
      attachment_urls: bulletin.attachment_urls ?? [],
    },
    organizationName: org?.name ?? "",
    date: dateStr,
  });

  // Return HTML for client-side printing / PDF generation via browser print dialog.
  // For server-side PDF generation, integrate puppeteer or a PDF API service.
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

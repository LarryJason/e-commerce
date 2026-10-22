import { getProductImage } from "@/lib/data/products";
import { idSchema } from "@/lib/validation";

export async function GET(_request: Request, ctx: RouteContext<"/images/produits/[id]">) {
  const id = idSchema.safeParse((await ctx.params).id);
  const image = id.success ? await getProductImage(id.data) : null;
  if (!image) return new Response("Image introuvable.", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.content_type,
      // L'URL change (?v=…) à chaque remplacement : la réponse peut être mise en cache longtemps.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}

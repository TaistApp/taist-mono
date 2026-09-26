import type { AdContent } from "@/lib/ads";

// Rough Instagram feed rendering of an ad, so copy can be judged in context.
export function AdMockup({ ad, ctaLabel }: { ad: AdContent; ctaLabel: string }) {
  let domain = "TAIST.APP";
  try {
    domain = new URL(ad.link_url || "https://taist.app").host.toUpperCase();
  } catch {
    // keep the default
  }

  return (
    <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border bg-white text-[13px] text-[#262626] shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2">
        <img
          src="https://taist.app/images/taist-logo-only-cropped.png"
          alt=""
          className="h-8 w-8 rounded-full border object-contain"
        />
        <div className="leading-tight">
          <div className="font-semibold">taist.team</div>
          <div className="text-xs text-[#737373]">Sponsored</div>
        </div>
      </div>
      {ad.image_url ? (
        <img src={ad.image_url} alt="" className="aspect-square w-full bg-muted object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-muted text-sm text-red-700">
          No image yet
        </div>
      )}
      <div className="flex items-center justify-between gap-3 bg-[#f5f5f5] px-3 py-2">
        <div className="min-w-0 leading-snug">
          <div className="text-xs text-[#737373]">{domain}</div>
          <div className="truncate font-semibold">{ad.headline || "Headline"}</div>
          {ad.description && <div className="truncate text-xs text-[#737373]">{ad.description}</div>}
        </div>
        <span className="shrink-0 rounded-lg bg-[#efefef] px-3 py-1.5 text-xs font-semibold">{ctaLabel}</span>
      </div>
      <div className="whitespace-pre-line px-3 py-2">
        <span className="font-semibold">taist.team</span> {ad.primary_text || "Primary text"}
      </div>
    </div>
  );
}

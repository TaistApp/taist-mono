import { AlertTriangle, Info } from "lucide-react";
import type { NewsletterConfig } from "@/lib/newsletters";

export function NewsletterConfigAlerts({ config }: { config?: NewsletterConfig }) {
  if (!config) return null;
  return (
    <>
      {!config.mailing_address_configured && (
        <div className="mb-3 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The footer shows <strong>{config.mailing_address}</strong>. CAN-SPAM requires a full postal
            address (street address or PO box). Set <code>NEWSLETTER_MAILING_ADDRESS</code> in Railway.
          </span>
        </div>
      )}
      {!config.autosend_enabled && (
        <div className="mb-3 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Automatic previews and sends are off in this environment (<code>NEWSLETTER_AUTOSEND</code>).
            Test sends still work.
          </span>
        </div>
      )}
    </>
  );
}

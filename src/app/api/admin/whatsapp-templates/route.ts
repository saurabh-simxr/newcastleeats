import { ok, fail, withAdminAuth } from "@/lib/proxy";
import { TEMPLATE_SIDS, TEMPLATE_DEFINITIONS, type WhatsAppTemplateName } from "@/config/whatsapp-templates";

export const dynamic = "force-dynamic";

type TwilioContentApproval = {
  sid: string;
  friendly_name: string;
  date_updated: string;
  approval_requests?: {
    status?: string;
    category?: string;
    rejection_reason?: string;
    name?: string;
  } | null;
};

/**
 * GET /api/admin/whatsapp-templates
 * Cross-references our known template SIDs (src/config/whatsapp-templates.ts)
 * against Twilio's live Content API to show real approval status per template.
 */
export async function GET(req: Request) {
  return withAdminAuth(req, async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return fail("Twilio is not configured.", 500);
    }

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const contentBySid = new Map<string, TwilioContentApproval>();

      let pageUrl: string | null = "https://content.twilio.com/v2/ContentAndApprovals?PageSize=100";
      while (pageUrl) {
        const res: Response = await fetch(pageUrl, {
          headers: { Authorization: `Basic ${auth}` },
          cache: "no-store",
        });
        if (!res.ok) {
          console.error("[admin/whatsapp-templates] Twilio API error:", res.status, await res.text());
          break;
        }
        const json: { contents: TwilioContentApproval[]; meta: { next_page_url: string | null } } = await res.json();
        for (const c of json.contents) contentBySid.set(c.sid, c);
        pageUrl = json.meta?.next_page_url ?? null;
      }

      const definitionByName = new Map(TEMPLATE_DEFINITIONS.map((d) => [d.name, d]));

      const templates = (Object.keys(TEMPLATE_SIDS) as WhatsAppTemplateName[]).map((name) => {
        const sid = TEMPLATE_SIDS[name];
        const live = contentBySid.get(sid);
        const def = definitionByName.get(name);
        return {
          name,
          sid,
          trigger: def?.trigger ?? "",
          twilioType: def?.twilioType ?? "",
          status: live?.approval_requests?.status ?? (live ? "unsubmitted" : "not_found"),
          category: live?.approval_requests?.category ?? null,
          rejectionReason: live?.approval_requests?.rejection_reason || null,
          lastUpdated: live?.date_updated ?? null,
        };
      });

      return ok({ templates });
    } catch (err) {
      console.error("[admin/whatsapp-templates] Error:", err);
      return fail("Failed to fetch WhatsApp template statuses.", 500);
    }
  });
}

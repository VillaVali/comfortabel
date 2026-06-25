import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import ClientLayout from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Phone, Mail, Loader2, CheckCircle2 } from "lucide-react";

type Contact = "email" | "phone" | "none";

/**
 * Persoonlijk profiel — het persoonsgebonden deel van het Eigen Huis Dossier.
 * Dit zijn categorie C-gegevens (eigen contactdata) die de klant zelf vrij mag
 * beheren, in tegenstelling tot de adresgebonden categorie A/B-velden in het
 * WoningPaspoort die via een wijzigverzoek lopen.
 */
export default function ClientProfile() {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.passport.myProfile.useQuery();

  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] = useState<Contact>("email");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone ?? "");
      setPreferredContact((profile.preferredContact as Contact) ?? "email");
      setMarketingOptIn(Boolean(profile.marketingOptIn));
      setDirty(false);
    }
  }, [profile]);

  const update = trpc.passport.updateMyProfile.useMutation({
    onSuccess: async () => {
      await utils.passport.myProfile.invalidate();
      setDirty(false);
      toast.success("Opgeslagen", { description: "Uw contactgegevens zijn bijgewerkt." });
    },
    onError: (e) => {
      toast.error("Opslaan mislukt", { description: e.message });
    },
  });

  return (
    <ClientLayout title="Mijn profiel" backHref="/mijn">
      <div className="max-w-xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#1E3A5F]" />
              </div>
              <div>
                <h2 className="font-semibold text-[#1E3A5F]">Persoonlijke gegevens</h2>
                <p className="text-sm text-slate-500">Uw eigen contactvoorkeuren — u beheert deze zelf.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5 text-slate-600">
                <Phone className="w-4 h-4" /> Telefoonnummer
              </Label>
              <Input
                id="phone"
                value={phone}
                placeholder="06 12345678"
                onChange={(e) => { setPhone(e.target.value); setDirty(true); }}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-slate-600">
                <Mail className="w-4 h-4" /> Voorkeur voor contact
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "email", label: "E-mail" },
                  { value: "phone", label: "Telefoon" },
                  { value: "none", label: "Geen" },
                ] as { value: Contact; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setPreferredContact(opt.value); setDirty(true); }}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${
                      preferredContact === opt.value
                        ? "border-[#1E3A5F] bg-[#1E3A5F] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => { setMarketingOptIn(e.target.checked); setDirty(true); }}
                className="mt-1 w-4 h-4 accent-[#1E3A5F]"
              />
              <span className="text-sm text-slate-600">
                Ja, ik ontvang graag tips en updates van Comfortabel per e-mail.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              {!dirty && profile && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /> Opgeslagen
                </span>
              )}
              <Button
                disabled={!dirty || update.isPending}
                onClick={() => update.mutate({ phone, preferredContact, marketingOptIn })}
                className="bg-[#1E3A5F] hover:bg-[#16304d] text-white"
              >
                {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Wijzigingen opslaan"}
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-4 text-center">
          Officiële woninggegevens (adres, oppervlakte, WOZ) beheert u in het Woningpaspoort via een correctieverzoek.
        </p>
      </div>
    </ClientLayout>
  );
}

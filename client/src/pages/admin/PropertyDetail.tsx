import { useState } from "react";
import DocumentsPanel from "../../components/DocumentsPanel";
import { useParams } from "wouter";
import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";
import WoningScore, { ScoreBar } from "../../components/WoningScore";
import {
  ClipboardCheck, Plus, ArrowRight, Home, AlertTriangle, CheckCircle,
  Clock, X, FileText, CreditCard, Pencil, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  SUBSCRIPTION_LABELS, SUBSCRIPTION_COLORS, SUBSCRIPTION_PRICES,
  SUBSCRIPTION_TIERS, type SubscriptionTier,
} from "@shared/const";


// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Input({ value, onChange, type = "text", placeholder }: {
  value: any;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Select({ value, onChange, options }: {
  value: any;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
    >
      <option value="">— Selecteer —</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${checked ? "bg-[#1E3A5F]" : "bg-slate-200"}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

// ─── Paspoort Edit Modal ───────────────────────────────────────────────────────

type EditForm = Record<string, unknown> & { id: number };

const INSULATION_OPTIONS = [
  { value: "aanwezig", label: "Aanwezig" },
  { value: "deels", label: "Deels aanwezig" },
  { value: "afwezig", label: "Afwezig" },
  { value: "onbekend", label: "Onbekend" },
];

const ENERGY_LABEL_OPTIONS = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"].map(
  (v) => ({ value: v, label: v })
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProperty = Record<string, any>;

function PaspoortEditModal({
  property,
  onClose,
  onSave,
  isSaving,
}: {
  property: AnyProperty;
  onClose: () => void;
  onSave: (data: AnyProperty) => void;
  isSaving: boolean;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<EditForm>({ ...(property as unknown as EditForm) });

  const set = (key: string, value: unknown) =>
    setForm((prev: EditForm) => ({ ...prev, [key]: value }));

  const tabs = [
    "Basisidentiteit",
    "Waarde & Financieel",
    "Juridisch & Omgeving",
    "Technische Kenmerken",
    "Verduurzaming",
  ];

  const handleSave = () => {
    const { id, ...data } = form;
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Woningpaspoort bewerken</h2>
            <p className="text-xs text-slate-500 mt-0.5">{property.street} {property.houseNumber}, {property.city}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === i
                  ? "border-[#1E3A5F] text-[#1E3A5F]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Tab 0: Basisidentiteit */}
          {activeTab === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Straat">
                <Input value={form.street} onChange={(v) => set("street", v)} />
              </Field>
              <Field label="Huisnummer">
                <Input value={form.houseNumber} onChange={(v) => set("houseNumber", v)} />
              </Field>
              <Field label="Postcode">
                <Input value={form.postalCode} onChange={(v) => set("postalCode", v)} />
              </Field>
              <Field label="Stad">
                <Input value={form.city} onChange={(v) => set("city", v)} />
              </Field>
              <Field label="Woningtype">
                <Select
                  value={form.propertyType}
                  onChange={(v) => set("propertyType", v)}
                  options={[
                    { value: "tussenwoning", label: "Tussenwoning" },
                    { value: "hoekwoning", label: "Hoekwoning" },
                    { value: "vrijstaand", label: "Vrijstaand" },
                    { value: "appartement", label: "Appartement" },
                    { value: "bedrijfspand", label: "Bedrijfspand" },
                    { value: "overig", label: "Overig" },
                  ]}
                />
              </Field>
              <Field label="Bouwjaar">
                <Input type="number" value={form.buildYear} onChange={(v) => set("buildYear", Number(v) || undefined)} />
              </Field>
              <Field label="Oppervlakte (m²)">
                <Input type="number" value={form.surfaceM2} onChange={(v) => set("surfaceM2", Number(v) || undefined)} />
              </Field>
              <Field label="Aantal bewoners">
                <Input type="number" value={form.residents} onChange={(v) => set("residents", Number(v) || undefined)} />
              </Field>
              <Field label="Energielabel">
                <Select value={form.energyLabel} onChange={(v) => set("energyLabel", v)} options={ENERGY_LABEL_OPTIONS} />
              </Field>
              <Field label="BAG-gebruiksfunctie">
                <Input value={form.bestemmingCategory} onChange={(v) => set("bestemmingCategory", v)} placeholder="bijv. Wonen" />
              </Field>
              <div className="col-span-2">
                <Field label="Notities">
                  <textarea
                    value={(form.notes as string) ?? ""}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Tab 1: Waarde & Financieel */}
          {activeTab === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="WOZ-waarde (€)">
                <Input type="number" value={form.wozValue} onChange={(v) => set("wozValue", Number(v) || undefined)} placeholder="bijv. 385000" />
              </Field>
              <Field label="WOZ peiljaar">
                <Input type="number" value={form.wozYear} onChange={(v) => set("wozYear", Number(v) || undefined)} placeholder="bijv. 2024" />
              </Field>
              <Field label="Koopsom bij aankoop (€)">
                <Input type="number" value={form.purchasePrice} onChange={(v) => set("purchasePrice", Number(v) || undefined)} placeholder="bijv. 320000" />
              </Field>
              <Field label="Aankoopjaar">
                <Input type="number" value={form.purchaseYear} onChange={(v) => set("purchaseYear", Number(v) || undefined)} placeholder="bijv. 2018" />
              </Field>
              <Field label="VvE-bijdrage per maand (€)">
                <Input type="number" value={form.vveContribution} onChange={(v) => set("vveContribution", Number(v) || undefined)} placeholder="bijv. 150" />
              </Field>
              <Field label="Hypotheekverstrekker">
                <Input value={form.mortgageProvider} onChange={(v) => set("mortgageProvider", v)} placeholder="bijv. ABN AMRO" />
              </Field>
              <Field label="Erfpachtcanon per jaar (€)">
                <Input type="number" value={form.erfpachtCanon} onChange={(v) => set("erfpachtCanon", Number(v) || undefined)} placeholder="bijv. 1200" />
              </Field>
              <Field label="Vervaldatum opstalverzekering">
                <Input
                  type="date"
                  value={form.insuranceExpiry ? new Date(form.insuranceExpiry as string | number).toISOString().split("T")[0] : ""}
                  onChange={(v) => set("insuranceExpiry", v ? new Date(v) : undefined)}
                />
              </Field>
            </div>
          )}

          {/* Tab 2: Juridisch & Omgeving */}
          {activeTab === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Eigendomsvorm">
                <Select
                  value={form.ownershipType}
                  onChange={(v) => set("ownershipType", v)}
                  options={[
                    { value: "volle_eigendom", label: "Volle eigendom" },
                    { value: "erfpacht", label: "Erfpacht" },
                    { value: "appartementsrecht", label: "Appartementsrecht" },
                    { value: "opstalrecht", label: "Opstalrecht" },
                    { value: "onbekend", label: "Onbekend" },
                  ]}
                />
              </Field>
              <Field label="Kadastrale aanduiding">
                <Input value={form.kadastraleAanduiding} onChange={(v) => set("kadastraleAanduiding", v)} placeholder="bijv. Amsterdam B 1234" />
              </Field>
              <Field label="Monumentstatus">
                <Select
                  value={form.monumentType}
                  onChange={(v) => set("monumentType", v)}
                  options={[
                    { value: "geen", label: "Geen monument" },
                    { value: "rijksmonument", label: "Rijksmonument" },
                    { value: "gemeentelijk", label: "Gemeentelijk monument" },
                  ]}
                />
              </Field>
              <Field label="Bestemmingscategorie">
                <Input value={form.bestemmingCategory} onChange={(v) => set("bestemmingCategory", v)} placeholder="bijv. Wonen" />
              </Field>
              <Field label="Wijk">
                <Input value={form.wijk} onChange={(v) => set("wijk", v)} placeholder="bijv. Jordaan" />
              </Field>
              <Field label="CBS buurtcode">
                <Input value={form.buurtCode} onChange={(v) => set("buurtCode", v)} placeholder="bijv. BU03630000" />
              </Field>
              <div className="col-span-2">
                <Field label="Link naar Omgevingsloket">
                  <Input value={form.bestemmingUrl} onChange={(v) => set("bestemmingUrl", v)} placeholder="https://omgevingsloket.nl/..." />
                </Field>
              </div>
              <div className="col-span-2 space-y-3 pt-2">
                <Toggle
                  checked={!!form.hasErfpacht}
                  onChange={(v) => set("hasErfpacht", v)}
                  label="Erfpacht van toepassing"
                />
                <Toggle
                  checked={!!form.hasBeslag}
                  onChange={(v) => set("hasBeslag", v)}
                  label="Beslag of hypotheekrecht geregistreerd"
                />
                <Toggle
                  checked={!!form.isMonument}
                  onChange={(v) => set("isMonument", v)}
                  label="Beschermd monument"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Technische Kenmerken */}
          {activeTab === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Funderingstype">
                  <Select
                    value={form.foundationType}
                    onChange={(v) => set("foundationType", v)}
                    options={[
                      { value: "paalfundering", label: "Paalfundering" },
                      { value: "strookfundering", label: "Strookfundering" },
                      { value: "plaatfundering", label: "Plaatfundering" },
                      { value: "onbekend", label: "Onbekend" },
                    ]}
                  />
                </Field>
                <Field label="Daktype">
                  <Select
                    value={form.roofType}
                    onChange={(v) => set("roofType", v)}
                    options={[
                      { value: "zadeldak", label: "Zadeldak" },
                      { value: "plat_dak", label: "Plat dak" },
                      { value: "mansardedak", label: "Mansardedak" },
                      { value: "schilddak", label: "Schilddak" },
                      { value: "lessenaarsdak", label: "Lessenaarsdak" },
                      { value: "onbekend", label: "Onbekend" },
                    ]}
                  />
                </Field>
                <Field label="Dakbedekking">
                  <Select
                    value={form.roofMaterial}
                    onChange={(v) => set("roofMaterial", v)}
                    options={[
                      { value: "dakpannen", label: "Dakpannen" },
                      { value: "bitumen", label: "Bitumen" },
                      { value: "zink", label: "Zink" },
                      { value: "riet", label: "Riet" },
                      { value: "leisteen", label: "Leisteen" },
                      { value: "onbekend", label: "Onbekend" },
                    ]}
                  />
                </Field>
                <Field label="Buitenmuurtype">
                  <Select
                    value={form.wallType}
                    onChange={(v) => set("wallType", v)}
                    options={[
                      { value: "spouwmuur", label: "Spouwmuur" },
                      { value: "massief", label: "Massief" },
                      { value: "houtskelet", label: "Houtskelet" },
                      { value: "onbekend", label: "Onbekend" },
                    ]}
                  />
                </Field>
                <Field label="Verwarmingssysteem">
                  <Select
                    value={form.heatingSystem}
                    onChange={(v) => set("heatingSystem", v)}
                    options={[
                      { value: "cv_ketel", label: "CV-ketel" },
                      { value: "warmtepomp", label: "Warmtepomp" },
                      { value: "stadsverwarming", label: "Stadsverwarming" },
                      { value: "elektrisch", label: "Elektrisch" },
                      { value: "geen", label: "Geen" },
                      { value: "onbekend", label: "Onbekend" },
                    ]}
                  />
                </Field>
                <Field label="Bouwjaar verwarming">
                  <Input type="number" value={form.heatingYear} onChange={(v) => set("heatingYear", Number(v) || undefined)} placeholder="bijv. 2015" />
                </Field>
                <Field label="Warm water installatie">
                  <Select
                    value={form.hotWaterSystem}
                    onChange={(v) => set("hotWaterSystem", v)}
                    options={[
                      { value: "combiketel", label: "Combiketel" },
                      { value: "boiler", label: "Boiler" },
                      { value: "zonneboiler", label: "Zonneboiler" },
                      { value: "warmtepomp", label: "Warmtepomp" },
                      { value: "onbekend", label: "Onbekend" },
                    ]}
                  />
                </Field>
                <Field label="Beglazing">
                  <Select
                    value={form.glazingType}
                    onChange={(v) => set("glazingType", v)}
                    options={[
                      { value: "enkel", label: "Enkel glas" },
                      { value: "dubbel", label: "Dubbel glas" },
                      { value: "hr_plus", label: "HR+" },
                      { value: "hr_plus_plus", label: "HR++" },
                      { value: "triple", label: "Triple glas" },
                      { value: "gemengd", label: "Gemengd" },
                      { value: "onbekend", label: "Onbekend" },
                    ]}
                  />
                </Field>
              </div>

              {/* Isolatie */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Isolatie</p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Dakisolatie">
                    <Select value={form.roofInsulation as string} onChange={(v) => set("roofInsulation", v)} options={INSULATION_OPTIONS} />
                  </Field>
                  <Field label="Muurisolatie">
                    <Select value={form.wallInsulation as string} onChange={(v) => set("wallInsulation", v)} options={INSULATION_OPTIONS} />
                  </Field>
                  <Field label="Vloerisolatie">
                    <Select value={form.floorInsulation as string} onChange={(v) => set("floorInsulation", v)} options={INSULATION_OPTIONS} />
                  </Field>
                </div>
              </div>

              {/* Installaties toggles */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Installaties</p>
                <div className="grid grid-cols-2 gap-3">
                  <Toggle
                    checked={!!form.hasSolarPanels}
                    onChange={(v) => set("hasSolarPanels", v)}
                    label="Zonnepanelen aanwezig"
                  />
                  <Toggle
                    checked={!!form.hasEVCharger}
                    onChange={(v) => set("hasEVCharger", v)}
                    label="Laadpaal aanwezig"
                  />
                  <Toggle
                    checked={form.hasGasConnection !== false}
                    onChange={(v) => set("hasGasConnection", v)}
                    label="Aardgasaansluiting"
                  />
                </div>
                {(form.hasSolarPanels as boolean) && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="Aantal zonnepanelen">
                      <Input type="number" value={form.solarPanelCount as number} onChange={(v) => set("solarPanelCount", Number(v) || undefined)} />
                    </Field>
                    <Field label="Installatiejaar">
                      <Input type="number" value={form.solarPanelYear as number} onChange={(v) => set("solarPanelYear", Number(v) || undefined)} />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Verduurzaming */}
          {activeTab === 4 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Huidig energielabel">
                <Select value={form.energyLabel as string} onChange={(v) => set("energyLabel", v)} options={ENERGY_LABEL_OPTIONS} />
              </Field>
              <Field label="Streef-energielabel">
                <Select value={form.targetEnergyLabel as string} onChange={(v) => set("targetEnergyLabel", v)} options={ENERGY_LABEL_OPTIONS} />
              </Field>
              <Field label="Aardgasvrij doeljaar">
                <Input type="number" value={form.gasVrijDoeljaar as number} onChange={(v) => set("gasVrijDoeljaar", Number(v) || undefined)} placeholder="bijv. 2030" />
              </Field>
              <div className="col-span-2">
                <Field label="Genomen verduurzamingsmaatregelen (kommagescheiden)">
                  <textarea
                    value={(form.sustainabilityMeasures as string) ?? ""}
                    onChange={(e) => set("sustainabilityMeasures", e.target.value)}
                    rows={3}
                    placeholder="bijv. Spouwmuurisolatie, HR++ glas, Zonnepanelen"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Aangevraagde subsidies (kommagescheiden)">
                  <textarea
                    value={(form.subsidiesApplied as string) ?? ""}
                    onChange={(e) => set("subsidiesApplied", e.target.value)}
                    rows={2}
                    placeholder="bijv. ISDE, SEEH, Salderingsregeling"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7a] disabled:opacity-60"
          >
            {isSaving ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminPropertyDetail() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showPaspoortModal, setShowPaspoortModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "normaal" as "laag" | "normaal" | "hoog" | "urgent",
    estimatedCost: "",
  });

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | "">("");

  const { data: property, refetch: refetchProperty } = trpc.properties.get.useQuery({ id: propertyId });
  const { data: inspections = [], refetch: refetchInspections } = trpc.inspections.listByProperty.useQuery({ propertyId });
  const { data: issues = [], refetch: refetchIssues } = trpc.maintenance.listIssues.useQuery({ propertyId });
  const { data: planning = [] } = trpc.maintenance.listPlanning.useQuery({ propertyId });

  const setTier = trpc.subscriptions.setTier.useMutation({
    onSuccess: () => { toast.success("Abonnement bijgewerkt"); refetchProperty(); },
    onError: (e) => toast.error(e.message),
  });

  const updateProperty = trpc.properties.update.useMutation({
    onSuccess: () => {
      toast.success("Woningpaspoort opgeslagen");
      setShowPaspoortModal(false);
      refetchProperty();
    },
    onError: (e) => toast.error(e.message),
  });

  const createInspection = trpc.inspections.create.useMutation({
    onSuccess: (data) => {
      toast.success("0-meting aangemaakt");
      refetchInspections();
      window.location.href = `/admin/inspections/${data.id}`;
    },
    onError: (e) => toast.error(e.message),
  });

  const createIssue = trpc.maintenance.createIssue.useMutation({
    onSuccess: () => {
      toast.success("Onderhoudspunt aangemaakt");
      setShowIssueModal(false);
      setIssueForm({ title: "", description: "", category: "", priority: "normaal", estimatedCost: "" });
      refetchIssues();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateIssue = trpc.maintenance.updateIssue.useMutation({
    onSuccess: () => { toast.success("Bijgewerkt"); refetchIssues(); },
  });

  const latestInspection = inspections[0];

  const priorityConfig = {
    laag: { color: "text-slate-500", bg: "bg-slate-50", label: "Laag" },
    normaal: { color: "text-blue-600", bg: "bg-blue-50", label: "Normaal" },
    hoog: { color: "text-orange-600", bg: "bg-orange-50", label: "Hoog" },
    urgent: { color: "text-red-600", bg: "bg-red-50", label: "Urgent" },
  };

  const statusConfig = {
    open: { color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle, label: "Open" },
    in_behandeling: { color: "text-orange-600", bg: "bg-orange-50", icon: Clock, label: "In behandeling" },
    gepland: { color: "text-blue-600", bg: "bg-blue-50", icon: Clock, label: "Gepland" },
    afgerond: { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle, label: "Afgerond" },
  };

  if (!property) {
    return (
      <AdminLayout title="Woning">
        <div className="text-center py-16 text-slate-400">Woning niet gevonden</div>
      </AdminLayout>
    );
  }

  const ownershipLabels: Record<string, string> = {
    volle_eigendom: "Volle eigendom",
    erfpacht: "Erfpacht",
    appartementsrecht: "Appartementsrecht",
    opstalrecht: "Opstalrecht",
    onbekend: "Onbekend",
  };

  return (
    <AdminLayout title={`${property.street} ${property.houseNumber}, ${property.city}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Property info card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Home className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {property.street} {property.houseNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {property.postalCode} {property.city}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaspoortModal(true)}
                className="flex items-center gap-1.5 text-xs text-[#1E3A5F] hover:bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 font-medium"
              >
                <Pencil className="w-3.5 h-3.5" />
                Bewerken
              </button>
            </div>

            {/* Basic fields */}
            <div className="space-y-2 text-sm">
              {[
                ["Type", property.propertyType],
                ["Bouwjaar", property.buildYear],
                ["Oppervlakte", property.surfaceM2 ? `${property.surfaceM2} m²` : null],
                ["Bewoners", property.residents],
                ["Energielabel", property.energyLabel],
                ["Eigendomsvorm", property.ownershipType ? ownershipLabels[property.ownershipType] : null],
                ["Kadaster", property.kadastraleAanduiding],
                ["Wijk", property.wijk],
              ].map(([label, value]) =>
                value ? (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-800 font-medium capitalize">{String(value)}</span>
                  </div>
                ) : null
              )}
            </div>

            {/* Financial summary if available */}
            {(property.wozValue || property.purchasePrice) && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
                {property.wozValue && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">WOZ-waarde {property.wozYear ? `(${property.wozYear})` : ""}</span>
                    <span className="text-slate-800 font-medium">€{property.wozValue.toLocaleString("nl-NL")}</span>
                  </div>
                )}
                {property.purchasePrice && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Koopsom {property.purchaseYear ? `(${property.purchaseYear})` : ""}</span>
                    <span className="text-slate-800 font-medium">€{property.purchasePrice.toLocaleString("nl-NL")}</span>
                  </div>
                )}
              </div>
            )}

            {/* Technical summary if available */}
            {(property.heatingSystem || property.hasSolarPanels) && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
                {property.heatingSystem && property.heatingSystem !== "onbekend" && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Verwarming</span>
                    <span className="text-slate-800 font-medium capitalize">{property.heatingSystem.replace("_", " ")}</span>
                  </div>
                )}
                {property.hasSolarPanels && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Zonnepanelen</span>
                    <span className="text-slate-800 font-medium">{property.solarPanelCount ? `${property.solarPanelCount} stuks` : "Ja"}</span>
                  </div>
                )}
                {property.targetEnergyLabel && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Streef-label</span>
                    <span className="text-slate-800 font-medium">{property.targetEnergyLabel}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subscription Management */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <h3 className="font-medium text-slate-800 text-sm">Abonnement</h3>
            </div>
            {property.subscriptionType && (
              <div className="mb-4">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: `${SUBSCRIPTION_COLORS[property.subscriptionType as SubscriptionTier]}20`,
                    color: SUBSCRIPTION_COLORS[property.subscriptionType as SubscriptionTier],
                  }}
                >
                  {SUBSCRIPTION_LABELS[property.subscriptionType as SubscriptionTier]}
                  {property.subscriptionActive ? " • Actief" : " • Inactief"}
                </span>
                {SUBSCRIPTION_PRICES[property.subscriptionType as SubscriptionTier] > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    €{SUBSCRIPTION_PRICES[property.subscriptionType as SubscriptionTier]}/mnd
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2">Pakket wijzigen:</p>
              <div className="grid grid-cols-1 gap-1.5">
                {SUBSCRIPTION_TIERS.map((tier) => {
                  const isActive = property.subscriptionType === tier;
                  const color = SUBSCRIPTION_COLORS[tier];
                  return (
                    <button
                      key={tier}
                      onClick={() => { if (!isActive) setTier.mutate({ propertyId, tier }); }}
                      disabled={isActive || setTier.isPending}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                        isActive ? "border-transparent cursor-default" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                      }`}
                      style={isActive ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color } : {}}
                    >
                      <span>{SUBSCRIPTION_LABELS[tier]}</span>
                      <span className="text-slate-400">
                        {SUBSCRIPTION_PRICES[tier] === 0 ? "Gratis" : `€${SUBSCRIPTION_PRICES[tier]}/mnd`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Woning Score */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-slate-800 text-sm mb-4">Woning Score™</h3>
            <WoningScore
              grade={latestInspection?.woningGrade as any}
              totalScore={latestInspection?.totalScore}
              size="lg"
            />
            {latestInspection && latestInspection.status === "afgerond" && (
              <div className="mt-4 space-y-2">
                <ScoreBar score={latestInspection.scoreInstallaties} label="Installaties" />
                <ScoreBar score={latestInspection.scoreBouwkundig} label="Bouwkundig" />
                <ScoreBar score={latestInspection.scoreVeiligheid} label="Veiligheid" />
                <ScoreBar score={latestInspection.scoreVochtVentilatie} label="Vocht & Ventilatie" />
                <ScoreBar score={latestInspection.scoreEnergie} label="Energie" />
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Inspections */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Inspecties & 0-metingen</h2>
              <button
                onClick={() => createInspection.mutate({ propertyId, type: "nulmeting" })}
                disabled={createInspection.isPending}
                className="flex items-center gap-1.5 bg-[#1E3A5F] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#2a4f7a] disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5" />
                {createInspection.isPending ? "Aanmaken..." : "Nieuwe 0-meting"}
              </button>
            </div>
            {inspections.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Nog geen inspecties</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {inspections.map((insp) => (
                  <a
                    key={insp.id}
                    href={`/admin/inspections/${insp.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardCheck className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 capitalize">{insp.type}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(insp.inspectionDate).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {insp.woningGrade && (
                        <WoningScore grade={insp.woningGrade as any} size="sm" showLabel={false} />
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          insp.status === "afgerond"
                            ? "bg-emerald-50 text-emerald-700"
                            : insp.status === "in_uitvoering"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {insp.status.replace("_", " ")}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Maintenance issues */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Onderhoudspunten
                {issues.filter((i) => i.status !== "afgerond").length > 0 && (
                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                    {issues.filter((i) => i.status !== "afgerond").length} open
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowIssueModal(true)}
                className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Toevoegen
              </button>
            </div>
            {issues.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Geen open punten</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {issues.map((issue) => {
                  const pCfg = priorityConfig[issue.priority];
                  const sCfg = statusConfig[issue.status];
                  const SIcon = sCfg.icon;
                  return (
                    <div key={issue.id} className="px-5 py-3.5 flex items-start gap-3">
                      <SIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sCfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{issue.title}</p>
                        {issue.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{issue.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${pCfg.bg} ${pCfg.color}`}>
                            {pCfg.label}
                          </span>
                          {issue.estimatedCost && (
                            <span className="text-xs text-slate-400">
                              ~€{issue.estimatedCost.toLocaleString("nl-NL")}
                            </span>
                          )}
                        </div>
                      </div>
                      <select
                        value={issue.status}
                        onChange={(e) => updateIssue.mutate({ id: issue.id, status: e.target.value as any })}
                        className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 focus:outline-none flex-shrink-0"
                      >
                        <option value="open">Open</option>
                        <option value="in_behandeling">In behandeling</option>
                        <option value="gepland">Gepland</option>
                        <option value="afgerond">Afgerond</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Planning */}
          {planning.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Toekomstig onderhoud</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {planning.map((p) => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="w-10 text-center">
                      <span className="text-sm font-bold text-[#1E3A5F]">{p.plannedYear || "?"}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{p.title}</p>
                      {p.category && <p className="text-xs text-slate-500">{p.category}</p>}
                    </div>
                    {p.estimatedCost && (
                      <span className="text-sm font-medium text-slate-700">
                        €{p.estimatedCost.toLocaleString("nl-NL")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Documenten</h2>
            </div>
            <div className="p-5">
              <DocumentsPanel propertyId={propertyId} isAdmin={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Paspoort Edit Modal */}
      {showPaspoortModal && property && (
        <PaspoortEditModal
          property={property}
          onClose={() => setShowPaspoortModal(false)}
          onSave={(data) => updateProperty.mutate({ id: propertyId, ...data })}
          isSaving={updateProperty.isPending}
        />
      )}

      {/* Issue modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Onderhoudspunt toevoegen</h2>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!issueForm.title) return toast.error("Titel is verplicht");
                createIssue.mutate({
                  propertyId,
                  title: issueForm.title,
                  description: issueForm.description || undefined,
                  category: issueForm.category || undefined,
                  priority: issueForm.priority,
                  estimatedCost: issueForm.estimatedCost ? Number(issueForm.estimatedCost) : undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titel <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={issueForm.title}
                  onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving</label>
                <textarea
                  rows={2}
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categorie</label>
                  <input
                    type="text"
                    placeholder="bijv. Dak, CV, Elektra"
                    value={issueForm.category}
                    onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioriteit</label>
                  <select
                    value={issueForm.priority}
                    onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  >
                    <option value="laag">Laag</option>
                    <option value="normaal">Normaal</option>
                    <option value="hoog">Hoog</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Geschatte kosten (€)</label>
                <input
                  type="number"
                  min="0"
                  value={issueForm.estimatedCost}
                  onChange={(e) => setIssueForm({ ...issueForm, estimatedCost: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={createIssue.isPending}
                  className="flex-1 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7a] disabled:opacity-60"
                >
                  {createIssue.isPending ? "Opslaan..." : "Toevoegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

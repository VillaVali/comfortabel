import { Building2, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#1E3A5F]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Building2 className="w-8 h-8 text-[#1E3A5F]" />
        </div>
        <h1 className="text-4xl font-bold text-[#1E3A5F] mb-2">404</h1>
        <p className="text-slate-500 mb-6">Deze pagina bestaat niet.</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 text-[#1E3A5F] font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar home
        </a>
      </div>
    </div>
  );
}

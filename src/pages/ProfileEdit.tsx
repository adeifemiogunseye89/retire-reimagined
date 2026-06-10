import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, UserCog, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES, getCountry } from "@/lib/regions";

/**
 * Post-onboarding profile editor: lets the user change country, currency,
 * grade, expenses, skills, and other key context that drive global calculations.
 */
// Fields that feed the readiness score — changes here trigger background report regeneration.
const SCORE_FIELDS = [
  "age", "yearsInService", "gradeLevel", "sector",
  "currentSalary", "pensionProjection", "monthlyExpenses",
  "dependents", "country", "currency", "region",
] as const;
const scoreInputsKey = (f: Record<string, string>) =>
  SCORE_FIELDS.map((k) => (f[k] ?? "").trim()).join("|");
const ProfileEdit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialScoreInputs, setInitialScoreInputs] = useState<string>("");

  const [form, setForm] = useState({
    fullName: "",
    age: "",
    country: "NG",
    region: "",
    currency: "NGN",
    language: "en-NG",
    yearsInService: "",
    gradeLevel: "",
    sector: "",
    currentSalary: "",
    pensionProjection: "",
    monthlyExpenses: "",
    dependents: "",
    skills: "",
    businessInterests: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const p = data as any;
        const loaded = {
          fullName: p.full_name || "",
          age: p.age?.toString() || "",
          country: p.country || "NG",
          region: p.region || "",
          currency: p.currency || "NGN",
          language: p.language || "en-NG",
          yearsInService: p.years_in_service?.toString() || "",
          gradeLevel: p.grade_level || "",
          sector: p.sector || "",
          currentSalary: p.current_salary?.toString() || "",
          pensionProjection: p.pension_projection?.toString() || "",
          monthlyExpenses: p.monthly_expenses?.toString() || "",
          dependents: p.dependents?.toString() || "",
          skills: Array.isArray(p.skills) ? p.skills.join(", ") : "",
          businessInterests: Array.isArray(p.business_interests) ? p.business_interests.join(", ") : "",
        };
        setForm(loaded);
        setInitialScoreInputs(scoreInputsKey(loaded));
      }
      setLoading(false);
    })();
  }, [user]);

  const country = getCountry(form.country);
  const currencySymbol = (() => {
    try {
      return (0).toLocaleString(country.locale, { style: "currency", currency: country.currency })
        .replace(/[\d.,\s]/g, "");
    } catch {
      return country.currency;
    }
  })();

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const onCountryChange = (code: string) => {
    const c = getCountry(code);
    setForm((p) => ({ ...p, country: code, currency: c.currency, language: c.locale }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const skillsArray = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
      const interestsArray = form.businessInterests.split(",").map((s) => s.trim()).filter(Boolean);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.fullName,
          age: parseInt(form.age) || null,
          years_in_service: parseInt(form.yearsInService) || null,
          grade_level: form.gradeLevel,
          sector: form.sector,
          current_salary: parseFloat(form.currentSalary) || null,
          pension_projection: parseFloat(form.pensionProjection) || null,
          monthly_expenses: parseFloat(form.monthlyExpenses) || null,
          dependents: parseInt(form.dependents) || null,
          country: form.country,
          currency: form.currency,
          language: form.language,
          region: form.region || null,
          skills: skillsArray,
          business_interests: interestsArray,
        } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      // If any score-relevant field changed, kick off background report regeneration.
      const changed = scoreInputsKey(form) !== initialScoreInputs;
      if (changed) {
        toast({ title: "Profile updated ✅", description: "Refreshing your readiness score…" });
        supabase.functions
          .invoke("generate-report", {
            body: {
              profileData: {
                fullName: form.fullName,
                age: parseInt(form.age) || 0,
                yearsInService: parseInt(form.yearsInService) || 0,
                gradeLevel: form.gradeLevel,
                sector: form.sector,
                currentSalary: parseFloat(form.currentSalary) || 0,
                pensionProjection: parseFloat(form.pensionProjection) || 0,
                monthlyExpenses: parseFloat(form.monthlyExpenses) || 0,
                dependents: parseInt(form.dependents) || 0,
                country: form.country,
                currency: form.currency,
                region: form.region,
                skills: form.skills,
                businessInterests: form.businessInterests,
              },
            },
          })
          .catch((err) => console.error("Background report regen failed:", err));
      } else {
        toast({ title: "Profile updated ✅", description: "Your changes have been saved." });
      }
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="gradient-hero text-primary-foreground py-4">
        <div className="container max-w-2xl px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-heading font-bold flex items-center gap-2">
              <UserCog className="h-5 w-5" /> Edit Profile
            </h1>
            <p className="text-xs opacity-80">Update your region, finances, and skills</p>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl px-4 py-8 space-y-6">
        <Card className="shadow-warm">
          <CardHeader><CardTitle className="text-base">🌍 Region & Language</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Country</Label>
              <Select value={form.country} onValueChange={onCountryChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Region / State (optional)</Label>
              <Input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="e.g. Lagos, California, Bavaria" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => update("currency", e.target.value)} />
              </div>
              <div>
                <Label>Language / Locale</Label>
                <Input value={form.language} onChange={(e) => update("language", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-warm">
          <CardHeader><CardTitle className="text-base">👤 Personal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Age</Label>
                <Input type="number" value={form.age} onChange={(e) => update("age", e.target.value)} />
              </div>
              <div>
                <Label>Years in Service</Label>
                <Input type="number" value={form.yearsInService} onChange={(e) => update("yearsInService", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Grade / Job Level</Label>
              <Input value={form.gradeLevel} onChange={(e) => update("gradeLevel", e.target.value)} placeholder="e.g. GL 14, Senior Manager, Band 7" />
            </div>
            <div>
              <Label>Profession / Sector</Label>
              <Select value={form.sector} onValueChange={(v) => update("sector", v)}>
                <SelectTrigger><SelectValue placeholder="Select your profession" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Teaching">Education / Teaching</SelectItem>
                  <SelectItem value="Health">Health & Care</SelectItem>
                  <SelectItem value="Government">Government / Public Sector</SelectItem>
                  <SelectItem value="Finance">Finance & Accounting</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-warm">
          <CardHeader><CardTitle className="text-base">💰 Finances ({currencySymbol})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monthly Income</Label>
                <Input type="number" value={form.currentSalary} onChange={(e) => update("currentSalary", e.target.value)} />
              </div>
              <div>
                <Label>Expected Pension</Label>
                <Input type="number" value={form.pensionProjection} onChange={(e) => update("pensionProjection", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monthly Expenses</Label>
                <Input type="number" value={form.monthlyExpenses} onChange={(e) => update("monthlyExpenses", e.target.value)} />
              </div>
              <div>
                <Label>Dependents</Label>
                <Input type="number" value={form.dependents} onChange={(e) => update("dependents", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-warm">
          <CardHeader><CardTitle className="text-base">🎯 Skills & Interests</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Key Skills (comma-separated)</Label>
              <Input value={form.skills} onChange={(e) => update("skills", e.target.value)} />
            </div>
            <div>
              <Label>Business Interests (comma-separated)</Label>
              <Input value={form.businessInterests} onChange={(e) => update("businessInterests", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-warm">
          <CardHeader><CardTitle className="text-base">🔐 Security & Sign-in</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/profile/security")}>
              <Shield className="h-4 w-4 me-2" /> Manage linked accounts & password
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3 sticky bottom-4">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1 gradient-hero text-primary-foreground" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 me-1 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 me-1" /> Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES, getCountry, detectCountry, detectCountryByIP } from "@/lib/regions";

/**
 * Multi-step retirement & career-transition readiness assessment.
 * Globally adaptive: collects country / currency / language plus the local
 * profession & income context.
 */
const Assessment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const initialCountry = detectCountry();
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    country: initialCountry.code,
    region: "",
    currency: initialCountry.currency,
    language: initialCountry.locale,
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

  // Upgrade to IP-based detection once mounted (only if user hasn't picked a country yet)
  useEffect(() => {
    let cancelled = false;
    detectCountryByIP().then((c) => {
      if (cancelled) return;
      setFormData((prev) => prev.country === initialCountry.code
        ? { ...prev, country: c.code, currency: c.currency, language: c.locale }
        : prev);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const country = getCountry(formData.country);
  const currencySymbol = (() => {
    try {
      return (0).toLocaleString(country.locale, { style: "currency", currency: country.currency })
        .replace(/[\d.,\s]/g, "");
    } catch {
      return country.currency;
    }
  })();

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onCountryChange = (code: string) => {
    const c = getCountry(code);
    setFormData((prev) => ({ ...prev, country: code, currency: c.currency, language: c.locale }));
  };

  const steps = [
    {
      title: "Region & Language",
      icon: Globe,
      fields: (
        <div className="space-y-4">
          <div>
            <Label>Country</Label>
            <Select value={formData.country} onValueChange={onCountryChange}>
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
            <Input placeholder="e.g. Lagos, California, Bavaria" value={formData.region} onChange={(e) => updateField("region", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Currency</Label>
              <Input value={formData.currency} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Language</Label>
              <Input value={formData.language} readOnly className="bg-muted" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            🌍 We use your region to tailor inflation, pension, and opportunity insights.
          </p>
        </div>
      ),
    },
    {
      title: "Personal Information",
      icon: CheckCircle2,
      fields: (
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input placeholder="e.g. Alex Morgan" value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Age</Label>
              <Input type="number" placeholder="54" value={formData.age} onChange={(e) => updateField("age", e.target.value)} />
            </div>
            <div>
              <Label>Years in Service</Label>
              <Input type="number" placeholder="20" value={formData.yearsInService} onChange={(e) => updateField("yearsInService", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Grade / Job Level</Label>
            <Input placeholder="e.g. GL 14, Senior Manager, Band 7" value={formData.gradeLevel} onChange={(e) => updateField("gradeLevel", e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title: "Career & Finances",
      icon: CheckCircle2,
      fields: (
        <div className="space-y-4">
          <div>
            <Label>Profession / Sector</Label>
            <Select value={formData.sector} onValueChange={(v) => updateField("sector", v)}>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monthly Income ({currencySymbol})</Label>
              <Input type="number" placeholder="0" value={formData.currentSalary} onChange={(e) => updateField("currentSalary", e.target.value)} />
            </div>
            <div>
              <Label>Expected Pension ({currencySymbol})</Label>
              <Input type="number" placeholder="0" value={formData.pensionProjection} onChange={(e) => updateField("pensionProjection", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monthly Expenses ({currencySymbol})</Label>
              <Input type="number" placeholder="0" value={formData.monthlyExpenses} onChange={(e) => updateField("monthlyExpenses", e.target.value)} />
            </div>
            <div>
              <Label>Dependents</Label>
              <Input type="number" placeholder="0" value={formData.dependents} onChange={(e) => updateField("dependents", e.target.value)} />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Skills & Interests",
      icon: CheckCircle2,
      fields: (
        <div className="space-y-4">
          <div>
            <Label>Your Key Skills (comma-separated)</Label>
            <Input placeholder="e.g. Biology, Mentoring, Excel" value={formData.skills} onChange={(e) => updateField("skills", e.target.value)} />
          </div>
          <div>
            <Label>Reinvention / Business Interests (comma-separated)</Label>
            <Input placeholder="e.g. Online Tutoring, Consulting, E-Commerce" value={formData.businessInterests} onChange={(e) => updateField("businessInterests", e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Our AI will tailor opportunities to your region, profession, and goals.
          </p>
        </div>
      ),
    },
  ];

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const skillsArray = formData.skills.split(",").map((s) => s.trim()).filter(Boolean);
      const interestsArray = formData.businessInterests.split(",").map((s) => s.trim()).filter(Boolean);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          age: parseInt(formData.age) || null,
          years_in_service: parseInt(formData.yearsInService) || null,
          grade_level: formData.gradeLevel,
          sector: formData.sector,
          current_salary: parseFloat(formData.currentSalary) || null,
          pension_projection: parseFloat(formData.pensionProjection) || null,
          monthly_expenses: parseFloat(formData.monthlyExpenses) || null,
          dependents: parseInt(formData.dependents) || null,
          country: formData.country,
          currency: formData.currency,
          language: formData.language,
          region: formData.region || null,
          skills: skillsArray,
          business_interests: interestsArray,
        } as any)
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      const { error: fnError } = await supabase.functions.invoke("generate-report", {
        body: { profileData: { ...formData, country: country.name, countryCode: country.code, currency: country.currency, locale: country.locale, inflation: country.inflation } },
      });

      if (fnError) throw fnError;

      toast({ title: "Report generated! 🎉", description: "Your personalized readiness report is ready." });
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const StepIcon = steps[step].icon;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="gradient-hero text-primary-foreground py-4">
        <div className="container max-w-lg px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-heading font-bold">Readiness Assessment</h1>
            <p className="text-xs opacity-80">Step {step + 1} of {steps.length}</p>
          </div>
        </div>
      </div>

      <div className="h-1 bg-muted">
        <div
          className="h-full bg-secondary transition-all duration-300"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="container max-w-lg px-4 py-8">
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <StepIcon className="h-5 w-5 text-primary" />
              {steps[step].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {steps[step].fields}

            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1" disabled={submitting}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep(step + 1)} className="flex-1">
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="flex-1 gradient-hero text-primary-foreground" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Analyzing…</>
                  ) : (
                    <>Analyze My Readiness <ArrowRight className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Assessment;

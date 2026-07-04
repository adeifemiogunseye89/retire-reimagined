import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Globe, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES, getCountry, detectCountry, detectCountryByIP } from "@/lib/regions";

type IncomeStructure = "formal" | "informal" | "mixed";

const FORMAL_SECTORS = [
  "Teaching", "Health", "Government", "Finance", "Technology", "Consulting", "Engineering", "Other",
];
const INFORMAL_SECTORS = [
  "Trading / Retail", "Farming / Agribusiness", "Skilled Trade", "Transport / Logistics",
  "Creative / Gig", "Food / Hospitality", "Personal Services", "Other",
];

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
    incomeStructure: "formal" as IncomeStructure,
    // formal-only
    yearsInService: "",
    gradeLevel: "",
    // shared
    sector: "",
    primaryActivity: "",
    currentSalary: "",
    hasPension: "no" as "yes" | "no",
    pensionProjection: "",
    ajoSavings: "",
    retirementIncomeTarget: "",
    monthlyExpenses: "",
    dependents: "",
    skills: "",
    businessInterests: "",
  });

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

  const isInformal = formData.incomeStructure === "informal";
  const isMixed = formData.incomeStructure === "mixed";
  const showFormalFields = !isInformal;
  const showInformalFields = isInformal || isMixed;

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const onCountryChange = (code: string) => {
    const c = getCountry(code);
    setFormData((prev) => ({ ...prev, country: code, currency: c.currency, language: c.locale }));
  };

  const setIncomeStructure = (v: IncomeStructure) => {
    setFormData((prev) => ({
      ...prev,
      incomeStructure: v,
      // Reset pension defaults when switching to informal
      hasPension: v === "informal" ? "no" : prev.hasPension,
      pensionProjection: v === "informal" ? "" : prev.pensionProjection,
      gradeLevel: v === "informal" ? "" : prev.gradeLevel,
      yearsInService: v === "informal" ? "" : prev.yearsInService,
    }));
  };

  const sectorOptions = isInformal ? INFORMAL_SECTORS : FORMAL_SECTORS;

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
      title: "How you earn today",
      icon: Briefcase,
      fields: (
        <div className="space-y-4">
          <Label>Which best describes you?</Label>
          <RadioGroup
            value={formData.incomeStructure}
            onValueChange={(v) => setIncomeStructure(v as IncomeStructure)}
            className="space-y-3"
          >
            <label htmlFor="fork-formal" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="formal" id="fork-formal" className="mt-1" />
              <div>
                <div className="font-medium">Formal employment</div>
                <div className="text-xs text-muted-foreground">Salaried job, payslip, may have a workplace pension</div>
              </div>
            </label>
            <label htmlFor="fork-informal" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="informal" id="fork-informal" className="mt-1" />
              <div>
                <div className="font-medium">Informal / self-employed</div>
                <div className="text-xs text-muted-foreground">Trader, artisan, farmer, gig worker, freelancer — income varies</div>
              </div>
            </label>
            <label htmlFor="fork-mixed" className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="mixed" id="fork-mixed" className="mt-1" />
              <div>
                <div className="font-medium">Both</div>
                <div className="text-xs text-muted-foreground">Salary plus side hustle or business</div>
              </div>
            </label>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            💡 This shapes the questions we ask and the advice you'll get.
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
              <Label>Dependents</Label>
              <Input type="number" placeholder="0" value={formData.dependents} onChange={(e) => updateField("dependents", e.target.value)} />
            </div>
          </div>
          {showFormalFields && (
            <>
              <div>
                <Label>Years in Service {isMixed && <span className="text-xs text-muted-foreground">(optional)</span>}</Label>
                <Input type="number" placeholder="20" value={formData.yearsInService} onChange={(e) => updateField("yearsInService", e.target.value)} />
              </div>
              <div>
                <Label>Grade / Job Level {isMixed && <span className="text-xs text-muted-foreground">(optional)</span>}</Label>
                <Input placeholder="e.g. GL 14, Senior Manager, Band 7" value={formData.gradeLevel} onChange={(e) => updateField("gradeLevel", e.target.value)} />
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      title: isInformal ? "Your work & finances" : "Career & Finances",
      icon: CheckCircle2,
      fields: (
        <div className="space-y-4">
          <div>
            <Label>{isInformal ? "What do you do?" : "Profession / Sector"}</Label>
            <Select value={formData.sector} onValueChange={(v) => updateField("sector", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {sectorOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {showInformalFields && (
            <div>
              <Label>Describe your main activity</Label>
              <Input
                placeholder="e.g. Tailoring, Selling fabrics, Ride-hailing"
                value={formData.primaryActivity}
                onChange={(e) => updateField("primaryActivity", e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>
                {isInformal ? `Typical monthly earnings (${currencySymbol})` : `Monthly Income (${currencySymbol})`}
              </Label>
              <Input type="number" placeholder="0" value={formData.currentSalary} onChange={(e) => updateField("currentSalary", e.target.value)} />
            </div>
            <div>
              <Label>Monthly Expenses ({currencySymbol})</Label>
              <Input type="number" placeholder="0" value={formData.monthlyExpenses} onChange={(e) => updateField("monthlyExpenses", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Do you contribute to a pension or retirement scheme?</Label>
            <RadioGroup
              value={formData.hasPension}
              onValueChange={(v) => updateField("hasPension", v)}
              className="flex gap-4 pt-1"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="yes" id="pension-yes" /> Yes
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="no" id="pension-no" /> No
              </label>
            </RadioGroup>
          </div>

          {formData.hasPension === "yes" && (
            <div>
              <Label>Expected Pension ({currencySymbol}/month)</Label>
              <Input type="number" placeholder="0" value={formData.pensionProjection} onChange={(e) => updateField("pensionProjection", e.target.value)} />
            </div>
          )}

          {showInformalFields && (
            <div>
              <Label>Ajo / cooperative / thrift savings ({currencySymbol}/month, optional)</Label>
              <Input type="number" placeholder="0" value={formData.ajoSavings} onChange={(e) => updateField("ajoSavings", e.target.value)} />
            </div>
          )}

          <div>
            <Label>Retirement income you'd like ({currencySymbol}/month, optional)</Label>
            <Input type="number" placeholder="0" value={formData.retirementIncomeTarget} onChange={(e) => updateField("retirementIncomeTarget", e.target.value)} />
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
            💡 Our AI will tailor opportunities to your region, work style, and goals.
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
      const hasPensionBool = formData.hasPension === "yes";

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          age: parseInt(formData.age) || null,
          years_in_service: parseInt(formData.yearsInService) || null,
          grade_level: formData.gradeLevel || null,
          sector: formData.sector,
          current_salary: parseFloat(formData.currentSalary) || null,
          pension_projection: hasPensionBool ? (parseFloat(formData.pensionProjection) || 0) : 0,
          monthly_expenses: parseFloat(formData.monthlyExpenses) || null,
          dependents: parseInt(formData.dependents) || null,
          country: formData.country,
          currency: formData.currency,
          language: formData.language,
          region: formData.region || null,
          skills: skillsArray,
          business_interests: interestsArray,
          income_structure: formData.incomeStructure,
          primary_activity: formData.primaryActivity || null,
          has_pension: hasPensionBool,
          ajo_savings: parseFloat(formData.ajoSavings) || null,
          retirement_income_target: parseFloat(formData.retirementIncomeTarget) || null,
          assessment_completed_at: new Date().toISOString(),
        } as any)
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      const { error: fnError } = await supabase.functions.invoke("generate-report", {
        body: {
          profileData: {
            ...formData,
            hasPension: hasPensionBool,
            country: country.name,
            countryCode: country.code,
            currency: country.currency,
            locale: country.locale,
            inflation: country.inflation,
          },
        },
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
                  <ArrowLeft className="h-4 w-4 me-1" /> Back
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep(step + 1)} className="flex-1">
                  Next <ArrowRight className="h-4 w-4 ms-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="flex-1 gradient-hero text-primary-foreground" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 me-1 animate-spin" /> Analyzing…</>
                  ) : (
                    <>Analyze My Readiness <ArrowRight className="h-4 w-4 ms-1" /></>
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

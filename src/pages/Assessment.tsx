import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Globe, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES, getCountry, detectCountry, detectCountryByIP } from "@/lib/regions";

/** Get inflation rate adjusted dynamically for selected scenario */
export function getScenarioInflation(baseInflation: number, scenario: string): number {
  if (scenario === "conservative") {
    return Math.max(3, Math.round(baseInflation * 0.7));
  } else if (scenario === "pessimistic") {
    return Math.round(baseInflation * 1.3);
  }
  return baseInflation;
}

/**
 * Multi-step retirement & career-transition readiness assessment.
 * Restructured with informal sector fork, dynamic scenario adjuster,
 * and thrift savings metrics.
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
    incomeStructure: "formal", // 'formal' | 'informal'
    yearsInService: "",
    sector: "", // Free-text description ("What do you do?")
    currentSalary: "",
    pensionProjection: "",
    goodWeekIncome: "",
    slowWeekIncome: "",
    ajoSavings: "",
    retirementIncomeTarget: "",
    inflationScenario: "moderate", // 'conservative' | 'moderate' | 'pessimistic'
    monthlyExpenses: "",
    dependents: "",
    skills: "",
    businessInterests: "",
  });

  // Upgrade to IP-based detection once mounted
  useEffect(() => {
    let cancelled = false;
    detectCountryByIP().then((c) => {
      if (cancelled) return;
      setFormData((prev) => prev.country === initialCountry.code
        ? { ...prev, country: c.code, currency: c.currency, language: c.locale }
        : prev);
    });
    return () => { cancelled = true; };
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
            <Input placeholder="e.g. Lagos, California, Nairobi" value={formData.region} onChange={(e) => updateField("region", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Currency</Label>
              <Input value={formData.currency} readOnly className="bg-muted text-muted-foreground" />
            </div>
            <div>
              <Label>Language</Label>
              <Input value={formData.language} readOnly className="bg-muted text-muted-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            🌍 We use your region to tailor inflation estimates and localized resources.
          </p>
        </div>
      ),
    },
    {
      title: "Personal Details",
      icon: CheckCircle2,
      fields: (
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input placeholder="e.g. Alex Morgan" value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} />
          </div>
          <div>
            <Label>Age</Label>
            <Input type="number" placeholder="54" value={formData.age} onChange={(e) => updateField("age", e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title: "Income Structure",
      icon: CheckCircle2,
      fields: (
        <div className="space-y-4">
          <Label className="text-sm">How do you currently earn money?</Label>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => updateField("incomeStructure", "formal")}
              className={`p-4 border rounded-xl text-left transition-all ${
                formData.incomeStructure === "formal"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <p className="font-semibold text-sm">Regular salary or wage</p>
              <p className="text-xs text-muted-foreground mt-1">For civil servants, government staff, and corporate employees.</p>
            </button>
            <button
              type="button"
              onClick={() => updateField("incomeStructure", "informal")}
              className={`p-4 border rounded-xl text-left transition-all ${
                formData.incomeStructure === "informal"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <p className="font-semibold text-sm">Variable income / Self-employed</p>
              <p className="text-xs text-muted-foreground mt-1">For market traders, micro-business owners, freelancers, and gig workers.</p>
            </button>
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
            <Label>What is your occupation?</Label>
            <Input placeholder="e.g. Lagos market trader, secondary school teacher, nurse" value={formData.sector} onChange={(e) => updateField("sector", e.target.value)} />
          </div>

          {formData.incomeStructure === "formal" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Years in Service</Label>
                  <Input type="number" placeholder="20" value={formData.yearsInService} onChange={(e) => updateField("yearsInService", e.target.value)} />
                </div>
                <div>
                  <Label>Monthly Salary ({currencySymbol})</Label>
                  <Input type="number" placeholder="0" value={formData.currentSalary} onChange={(e) => updateField("currentSalary", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Expected Pension ({currencySymbol} - optional)</Label>
                <Input type="number" placeholder="0" value={formData.pensionProjection} onChange={(e) => updateField("pensionProjection", e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Good Week Income ({currencySymbol})</Label>
                  <Input type="number" placeholder="0" value={formData.goodWeekIncome} onChange={(e) => updateField("goodWeekIncome", e.target.value)} />
                </div>
                <div>
                  <Label>Slow Week Income ({currencySymbol})</Label>
                  <Input type="number" placeholder="0" value={formData.slowWeekIncome} onChange={(e) => updateField("slowWeekIncome", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Monthly Thrift / Cooperative Savings ({currencySymbol} - optional)</Label>
                <Input type="number" placeholder="e.g. Ajo, Esusu, or Tontine savings" value={formData.ajoSavings} onChange={(e) => updateField("ajoSavings", e.target.value)} />
              </div>
            </div>
          )}

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

          <div>
            <Label>Retirement Monthly Income Target ({currencySymbol})</Label>
            <Input type="number" placeholder="How much do you want to live on monthly?" value={formData.retirementIncomeTarget} onChange={(e) => updateField("retirementIncomeTarget", e.target.value)} />
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
            <Input placeholder="e.g. Selling, Mentoring, Sewing" value={formData.skills} onChange={(e) => updateField("skills", e.target.value)} />
          </div>
          <div>
            <Label>Reinvention / Business Interests (comma-separated)</Label>
            <Input placeholder="e.g. Wholesale trade, rental service, agriculture" value={formData.businessInterests} onChange={(e) => updateField("businessInterests", e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Our AI will align opportunities to your skills, goals, and market context.
          </p>
        </div>
      ),
    },
    {
      title: "Inflation Assumption",
      icon: Sparkles,
      fields: (
        <div className="space-y-4">
          <Label className="text-sm">Choose your planning inflation assumption</Label>
          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={() => updateField("inflationScenario", "conservative")}
              className={`p-3.5 border rounded-xl text-left transition-all ${
                formData.inflationScenario === "conservative"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <p className="font-semibold text-sm flex items-center justify-between">
                <span>Conservative</span>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-normal">
                  ~{getScenarioInflation(country.inflation, "conservative")}%
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Plans for lower, stable inflation assumptions.</p>
            </button>
            <button
              type="button"
              onClick={() => updateField("inflationScenario", "moderate")}
              className={`p-3.5 border rounded-xl text-left transition-all ${
                formData.inflationScenario === "moderate"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <p className="font-semibold text-sm flex items-center justify-between">
                <span>Moderate (Recommended)</span>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-normal">
                  ~{country.inflation}%
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Matches active national statistics CPI values.</p>
            </button>
            <button
              type="button"
              onClick={() => updateField("inflationScenario", "pessimistic")}
              className={`p-3.5 border rounded-xl text-left transition-all ${
                formData.inflationScenario === "pessimistic"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <p className="font-semibold text-sm flex items-center justify-between">
                <span>Pessimistic</span>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-normal">
                  ~{getScenarioInflation(country.inflation, "pessimistic")}%
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Stress-tests your goals against high inflation volatility.</p>
            </button>
          </div>
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

      // Calculations
      let calculatedSalary = parseFloat(formData.currentSalary) || 0;
      let calculatedPension = parseFloat(formData.pensionProjection) || 0;

      if (formData.incomeStructure === "informal") {
        const good = parseFloat(formData.goodWeekIncome) || 0;
        const slow = parseFloat(formData.slowWeekIncome) || 0;
        calculatedSalary = ((good + slow) / 2) * 4;
        calculatedPension = 0; // No traditional pension
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          age: parseInt(formData.age) || null,
          years_in_service: formData.incomeStructure === "formal" ? (parseInt(formData.yearsInService) || null) : null,
          sector: formData.sector,
          current_salary: calculatedSalary,
          pension_projection: calculatedPension,
          monthly_expenses: parseFloat(formData.monthlyExpenses) || null,
          dependents: parseInt(formData.dependents) || null,
          country: formData.country,
          currency: formData.currency,
          language: formData.language,
          region: formData.region || null,
          skills: skillsArray,
          business_interests: interestsArray,
          income_structure: formData.incomeStructure,
          ajo_savings: parseFloat(formData.ajoSavings) || 0,
          retirement_income_target: parseFloat(formData.retirementIncomeTarget) || 0,
          inflation_scenario: formData.inflationScenario,
          assessment_completed_at: new Date().toISOString(),
        } as any)
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Invoke generate-report edge function with scenario-adjusted inflation
      const activeInflation = getScenarioInflation(country.inflation, formData.inflationScenario);

      const { error: fnError } = await supabase.functions.invoke("generate-report", {
        body: {
          profileData: {
            ...formData,
            currentSalary: calculatedSalary.toString(),
            pensionProjection: calculatedPension.toString(),
            country: country.name,
            countryCode: country.code,
            currency: country.currency,
            locale: country.locale,
            inflation: activeInflation,
          }
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

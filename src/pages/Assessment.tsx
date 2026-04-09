import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Multi-step retirement readiness assessment form.
 * Saves profile to Supabase and triggers AI report generation.
 */
const Assessment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    yearsInService: "",
    gradeLevel: "",
    sector: "",
    currentSalary: "",
    pensionProjection: "",
    skills: "",
    businessInterests: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const steps = [
    {
      title: "Personal Information",
      fields: (
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input placeholder="e.g. Mrs. Funke Adebanjo" value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Age</Label>
              <Input type="number" placeholder="54" value={formData.age} onChange={(e) => updateField("age", e.target.value)} />
            </div>
            <div>
              <Label>Years in Service</Label>
              <Input type="number" placeholder="28" value={formData.yearsInService} onChange={(e) => updateField("yearsInService", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Grade Level</Label>
            <Input placeholder="e.g. GL 14" value={formData.gradeLevel} onChange={(e) => updateField("gradeLevel", e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title: "Employment Details",
      fields: (
        <div className="space-y-4">
          <div>
            <Label>Sector</Label>
            <Select value={formData.sector} onValueChange={(v) => updateField("sector", v)}>
              <SelectTrigger><SelectValue placeholder="Select your sector" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Teaching">Teaching</SelectItem>
                <SelectItem value="Health">Health (Nursing, Medical)</SelectItem>
                <SelectItem value="Local Government">Local Government Administration</SelectItem>
                <SelectItem value="Other">Other Public Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Current Monthly Salary (₦)</Label>
            <Input type="number" placeholder="320000" value={formData.currentSalary} onChange={(e) => updateField("currentSalary", e.target.value)} />
          </div>
          <div>
            <Label>Expected Monthly Pension (₦)</Label>
            <Input type="number" placeholder="148000" value={formData.pensionProjection} onChange={(e) => updateField("pensionProjection", e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title: "Skills & Interests",
      fields: (
        <div className="space-y-4">
          <div>
            <Label>Your Key Skills (comma-separated)</Label>
            <Input placeholder="e.g. Biology, Chemistry, Mentoring" value={formData.skills} onChange={(e) => updateField("skills", e.target.value)} />
          </div>
          <div>
            <Label>Business Interests (comma-separated)</Label>
            <Input placeholder="e.g. Online Tutoring, E-Commerce" value={formData.businessInterests} onChange={(e) => updateField("businessInterests", e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Our AI will use your skills and interests to generate personalized business ideas and a readiness report.
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

      // Update profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          age: parseInt(formData.age),
          years_in_service: parseInt(formData.yearsInService),
          grade_level: formData.gradeLevel,
          sector: formData.sector,
          current_salary: parseFloat(formData.currentSalary),
          pension_projection: parseFloat(formData.pensionProjection),
          skills: skillsArray,
          business_interests: interestsArray,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Trigger AI report generation
      const { data, error: fnError } = await supabase.functions.invoke("generate-report", {
        body: { profileData: formData },
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="gradient-hero text-primary-foreground py-4">
        <div className="container max-w-lg px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-heading font-bold">Retirement Assessment</h1>
            <p className="text-xs opacity-80">Step {step + 1} of {steps.length}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full gradient-gold transition-all duration-300"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="container max-w-lg px-4 py-8">
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
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
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating…</>
                  ) : (
                    <>Generate My AI Report <ArrowRight className="h-4 w-4 ml-1" /></>
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

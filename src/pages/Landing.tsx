import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Brain, TrendingUp, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Landing page for Reignite – the hero page that public/private servants see first.
 * Clean, empowering, Lagos-inspired design.
 */
const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "AI Readiness Assessment",
      description: "Get your personalized retirement readiness score with AI-powered analysis of your profile.",
    },
    {
      icon: TrendingUp,
      title: "Business Ideas Tailored to You",
      description: "Receive 3 data-backed business ideas based on your skills, sector, and local market trends.",
    },
    {
      icon: Sparkles,
      title: "Instant Business Plans",
      description: "Generate professional pitch decks and business plans with one click using AI.",
    },
    {
      icon: Users,
      title: "Productivity Hub",
      description: "Teachers: create lessons, quizzes, and launch your AI micro-school. Earn while you teach.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="gradient-hero text-primary-foreground">
        <div className="container max-w-5xl py-12 md:py-24 px-4">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-12">
            <h1 className="text-xl font-heading font-bold tracking-tight">🔥 Reignite</h1>
            <Button
              variant="secondary"
              size="sm"
              className="shadow-gold"
              onClick={() => navigate("/dashboard")}
            >
              Sign In
            </Button>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto space-y-6"
          >
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold leading-tight">
              Retirement isn't the end.
              <br />
              <span className="opacity-90">It's your second career.</span>
            </h2>
            <p className="text-base md:text-lg opacity-85 max-w-xl mx-auto">
              Reignite helps Nigerian public servants — teachers, nurses, LGA staff — turn retirement
              into a productive, income-generating second chapter with AI-powered planning.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                size="lg"
                variant="secondary"
                className="shadow-gold text-base font-heading font-semibold"
                onClick={() => navigate("/assessment")}
              >
                Start Free Assessment <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate("/dashboard")}
              >
                View Demo Dashboard
              </Button>
            </div>
          </motion.div>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-2 mt-8 opacity-70 text-sm">
            <Shield className="h-4 w-4" />
            <span>NDPR compliant • Your data is secure & private</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container max-w-5xl py-16 px-4">
        <div className="text-center mb-10">
          <h3 className="text-2xl font-heading font-bold">Everything you need to reignite</h3>
          <p className="text-sm text-muted-foreground mt-2">AI does the heavy lifting. You focus on building your future.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
              className="p-6 rounded-xl border bg-card shadow-warm space-y-3"
            >
              <div className="w-10 h-10 rounded-lg bg-green-light flex items-center justify-center">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-heading font-semibold">{f.title}</h4>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-muted">
        <div className="container max-w-3xl py-12 px-4 text-center space-y-4">
          <h3 className="text-xl font-heading font-bold">Ready to plan your second career?</h3>
          <p className="text-sm text-muted-foreground">
            Join 500+ public servants already using Reignite to secure their financial future.
          </p>
          <Button
            size="lg"
            className="gradient-hero text-primary-foreground font-heading font-semibold"
            onClick={() => navigate("/assessment")}
          >
            Take the Assessment Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>🔥 Reignite © 2026 • Built for Nigerian public servants</span>
          <div className="flex gap-4">
            <span>Privacy Policy</span>
            <span>Contact LASPEC</span>
            <span>Resources</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

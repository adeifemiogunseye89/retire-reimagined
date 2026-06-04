import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Shield, Brain, TrendingUp, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Landing page — public hero. Fully i18n-driven.
 */
const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    { icon: Brain,      title: t("landing.features.assessment.title"), description: t("landing.features.assessment.desc") },
    { icon: TrendingUp, title: t("landing.features.ideas.title"),      description: t("landing.features.ideas.desc") },
    { icon: Sparkles,   title: t("landing.features.plans.title"),      description: t("landing.features.plans.desc") },
    { icon: Users,      title: t("landing.features.hub.title"),        description: t("landing.features.hub.desc") },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="gradient-hero text-primary-foreground">
        <div className="container max-w-5xl py-12 md:py-24 px-4">
          <nav className="flex items-center gap-3 mb-12">
            <h1 className="text-xl font-heading font-bold tracking-tight me-auto">🔥 Reignite</h1>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              {t("auth.signIn")}
            </Button>
            <Button variant="secondary" size="sm" className="shadow-gold" onClick={() => navigate("/auth?mode=signup")}>
              {t("auth.signUp")}
            </Button>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto space-y-6"
          >
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold leading-tight">
              {t("landing.hero.titleA")}
              <br />
              <span className="opacity-90">{t("landing.hero.titleB")}</span>
            </h2>
            <p className="text-base md:text-lg opacity-85 max-w-xl mx-auto">
              {t("landing.hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                size="lg"
                variant="secondary"
                className="shadow-gold text-base font-heading font-semibold"
                onClick={() => navigate("/assessment")}
              >
                {t("landing.cta.start")} <ArrowRight className="ms-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-base font-heading font-semibold text-primary-foreground hover:bg-primary-foreground/10"
                onClick={scrollToFeatures}
              >
                {t("landing.cta.seeHow")}
              </Button>
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-2 mt-8 opacity-70 text-sm">
            <Shield className="h-4 w-4" />
            <span>{t("landing.trust")}</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="container max-w-5xl py-16 px-4 scroll-mt-16">
        <div className="text-center mb-10">
          <h3 className="text-2xl font-heading font-bold">{t("landing.featuresHeading")}</h3>
          <p className="text-sm text-muted-foreground mt-2">{t("landing.featuresSubheading")}</p>
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
      </section>

      {/* CTA */}
      <div className="bg-muted">
        <div className="container max-w-3xl py-12 px-4 text-center space-y-4">
          <h3 className="text-xl font-heading font-bold">{t("landing.bottomCta.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("landing.bottomCta.subtitle")}</p>
          <Button
            size="lg"
            variant="secondary"
            className="shadow-gold text-base font-heading font-semibold"
            onClick={() => navigate("/assessment")}
          >
            {t("landing.cta.start")} <ArrowRight className="ms-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <footer className="border-t py-6">
        <div className="container max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t("landing.footer.copyright")}</span>
          <div className="flex gap-4">
            <span>{t("landing.footer.privacy")}</span>
            <span>{t("landing.footer.contact")}</span>
            <span>{t("landing.footer.resources")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

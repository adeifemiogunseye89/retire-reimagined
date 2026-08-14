// Static tips & explainers content. `country: null` means the tip is universal.
export type TipCategory = "savings" | "pension" | "informal_economy" | "investing";

export interface Tip {
  id: string;
  title: string;
  category: TipCategory;
  /** ISO country code (e.g. "NG") or null when the tip applies everywhere. */
  country: string | null;
  body: string;
}

export const TIPS: Tip[] = [
  {
    id: "ng-what-is-pfa",
    title: "What is a PFA and why does it matter?",
    category: "pension",
    country: "NG",
    body:
      "A Pension Fund Administrator (PFA) is the licensed company that holds and invests your pension contributions under Nigeria's Contributory Pension Scheme. Your money sits in a Retirement Savings Account (RSA) tied to a personal PIN that stays with you even when you change employers. You can check your balance directly with your PFA, and you may transfer to another PFA once a year if the service or returns disappoint you.",
  },
  {
    id: "ng-rsa-statement",
    title: "How to read your RSA statement",
    category: "pension",
    country: "NG",
    body:
      "Your RSA statement lists employer contributions, your own contributions, and investment returns separately. Compare the contribution dates against your payslips — missing months usually mean your employer has not remitted. Raise gaps with your HR and your PFA early, because unremitted contributions get harder to recover over time.",
  },
  {
    id: "ng-ajo-esusu",
    title: "Where ajo and esusu fit into retirement planning",
    category: "informal_economy",
    country: "NG",
    body:
      "Ajo (or esusu) is excellent for discipline and short-term lump sums, but it does not grow your money — you usually collect roughly what you paid in. Treat your ajo payout as a feeder: when it lands, move part of it into something that earns returns, like a pension or an interest-bearing account. Keeping every naira in rotating savings means inflation quietly shrinks your retirement pot.",
  },
  {
    id: "ng-micro-pension",
    title: "Micro pension for traders and artisans",
    category: "pension",
    country: "NG",
    body:
      "If you are self-employed or work in the informal economy, the Micro Pension Plan lets you contribute any amount, any time, with no employer needed. A portion stays available for withdrawal while the rest is locked for retirement, so it fits irregular income. You register with a PFA using your BVN and can contribute by transfer or USSD.",
  },
  {
    id: "ng-informal-income",
    title: "Planning retirement on irregular income",
    category: "informal_economy",
    country: "NG",
    body:
      "When income swings month to month, fixed savings targets break down. Instead, save a percentage of every inflow — even 10% of a small week counts — and top up in strong months. Track your best three months and your worst three months so your retirement plan is built on a realistic average, not your best season.",
  },
  {
    id: "ng-family-obligations",
    title: "Budgeting for family obligations",
    category: "savings",
    country: "NG",
    body:
      "Black tax and extended family support are real line items, not surprises. Give them a named monthly cap in your budget so they stop eating into your retirement savings unpredictably. Being clear about the cap with relatives is uncomfortable once, but it protects decades of your own security.",
  },
  {
    id: "why-inflation-erodes",
    title: "Why inflation erodes your savings",
    category: "savings",
    country: null,
    body:
      "Money kept in cash loses buying power every year prices rise. At 15% inflation, what costs 100 today costs about 200 in five years, so idle savings effectively halve. To retire comfortably, your savings need to earn returns that at least keep pace with inflation.",
  },
  {
    id: "compound-interest",
    title: "How compound interest works for you",
    category: "investing",
    country: null,
    body:
      "Compounding means your returns start earning returns of their own. A steady monthly contribution over twenty years usually grows far more from compounding than from the amount you actually deposited. The lever that matters most is time, so starting small today beats starting big in five years.",
  },
  {
    id: "emergency-fund",
    title: "Building an emergency fund first",
    category: "savings",
    country: null,
    body:
      "Aim for three to six months of essential expenses in an account you can reach quickly. This fund is what stops a hospital bill or a job loss from forcing you to raid long-term retirement savings. Build it before you chase higher-return investments, and refill it whenever you use it.",
  },
  {
    id: "diversify",
    title: "Why you should not put everything in one place",
    category: "investing",
    country: null,
    body:
      "Spreading money across different types of assets means one bad year in one place does not wipe out your plan. A simple mix of low-risk savings, a pension or retirement fund, and one growth asset is enough for most people. Avoid anything promising guaranteed high returns — that combination does not exist.",
  },
];

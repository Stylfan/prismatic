import type { CaseStatus, DecisionEffect, GoalStatus } from "@/db/schema";

/**
 * The example programme's risks and steering-group material, written as
 * any organisation replacing its core system could have written them. No
 * person, supplier or organisation is named.
 */

export type DemoRisk = {
  title: string;
  consequence: string;
  mitigation: string;
  changeNote: string;
  probability: number;
  impact: number;
  closed?: boolean;
};

export const DEMO_RISKS: DemoRisk[] = [
  {
    title: "den valgte udviklingspartner ikke kan levere de kompetencer, der er aftalt",
    consequence:
      "fremdriften påvirkes, fordi viden er opbygget hos partnerens folk, og det tager tid at finde en ny partner.",
    mitigation:
      "Partneren blev valgt på det stærkeste team i evalueringen, og erfaringerne er indtil videre gode.",
    changeNote: "Ingen ændring.",
    probability: 2,
    impact: 7,
  },
  {
    title: "opgavens omfang er estimeret for optimistisk, og budgettet overskrides",
    consequence: "der skal findes yderligere økonomi.",
    mitigation:
      "Styregruppen og teamet følger udviklingen tæt og vælger løbende den bedste balance mellem tid, pris og funktionalitet.",
    changeNote: "Re-estimering med hele teamet er planlagt i dette kvartal.",
    probability: 5,
    impact: 7,
  },
  {
    title: "vi ikke kan tiltrække de nødvendige udviklere så hurtigt som planlagt",
    consequence: "teamet kan ikke skaleres så hurtigt, som forecastet antager.",
    mitigation: "Freelancere og flere rekrutteringsspor ud over partneren.",
    changeNote: "Øget: rekrutteringen tager længere tid end håbet, og en ledende udvikler stopper.",
    probability: 7,
    impact: 8,
  },
];

export const DEMO_GOALS: Array<{
  title: string;
  stretch?: boolean;
  status: GoalStatus;
  sub?: string[];
}> = [
  {
    title: "Vi har en udrullet, kørende udgave af produktet med testdata for et simpelt domæne",
    status: "open",
    sub: ["Vi kan gemme en ændring fra applikationen i databasen"],
  },
  {
    title: "Vi kan vise og håndtere konflikter, når to brugere retter de samme data",
    status: "open",
  },
  {
    title: "Branchekoder er bundet op på brugerfladen og kan opdateres",
    stretch: true,
    status: "open",
  },
];

export type DemoCase = {
  title: string;
  problem: string;
  background: string;
  keyPoints: string;
  nextSteps: string;
  status: CaseStatus;
};

export const DEMO_CASES: DemoCase[] = [
  {
    title: "Skal kunder under 18 år kunne oprettes?",
    problem:
      "Det gamle system tillader kunder under 18 år, men det sker sjældent og håndteres manuelt uden en beskrevet proces. Det nye system skal enten understøtte det fuldt ud med samtykke fra forældre og særlige regler for kontakt, eller lade det være. Valget påvirker både datamodellen, oprettelsesflowet og kundeservice.",
    background:
      "Der er ingen kunder under 18 år i dag, og der har kun været en håndfuld de seneste fem år. De få sager har krævet manuelt arbejde hos kundeservice og en juridisk vurdering hver gang. Forretningen har ikke planer om at målrette tilbud til unge de næste par år.",
    keyPoints:
      "Uden muligheden bliver løsningen enklere at bygge, teste og drive, og der er færre krav til samtykke og databeskyttelse. Muligheden kan bygges senere, hvis behovet opstår, for omkring 40 point. Med muligheden fra start skal reglerne for alder og samtykke afklares nu, hvilket forsinker kundeforholdene i M1.",
    nextSteps:
      "Styregruppen beslutter på dette møde, om kunder under 18 år skal kunne oprettes i første version. Hvis ja, afklarer den juridiske funktion reglerne for alder og samtykke inden næste kvartal, og M1 planlægges om. Hvis nej, sætter teamet en spærring i oprettelsen og beskriver, hvordan sjældne undtagelser håndteres.",
    status: "open",
  },
];

export const DEMO_DECISIONS: Array<{
  title: string;
  when: string;
  decision: string;
  effect: DecisionEffect;
}> = [
  {
    title: "Personnummer på alle kunder",
    when: "Marts",
    decision: "Alle personer ud over leads skal have personnummer i det nye system.",
    effect: "simplifying",
  },
  {
    title: "Abonnement på magasinet",
    when: "Marts",
    decision: "Håndtering af abonnement på magasinet er med i scope.",
    effect: "complicating",
  },
];

export const DEMO_STATUS_TEXT =
  "Vi har nået milepælen om en teknisk funktionel applikation, der kan vise katalogdata, og har lagt de grundlæggende tekniske forudsætninger: pipeline, validering og styring af, hvem der må se hvad. Det visuelle udtryk og de grundlæggende interaktionsmønstre er ikke nået så langt som håbet og fortsætter i dette kvartal. En ny udvikler er startet, og to mere ventes i gang i vinter.";

export const DEMO_CHANGE_TEXT =
  "Vi antog i starten af året, at teamet i dette kvartal ville være dobbelt så stort. Det er det endnu ikke, så en del af efterårets arbejde er rykket til vinter, og vinteren er tæt på fuld. Det opdaterede forecast flytter fakturering lidt senere. En re-estimering med hele teamet er planlagt i dette kvartal, og roadmappet opdateres bagefter.";

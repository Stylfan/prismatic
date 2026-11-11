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
    title: "der træffes teknologivalg, der viser sig uhensigtsmæssige",
    consequence: "løsningen kunne være bygget billigere eller hurtigere.",
    mitigation: "Der bygges på udbredt standardteknologi til systemer af denne kompleksitet.",
    changeNote: "Ingen ændring.",
    probability: 2,
    impact: 5,
  },
  {
    title: "beslutninger i ledelse og styregruppe trækker ud",
    consequence:
      "afklaringer med økonomiske konsekvenser bliver ikke truffet eller bliver udfordret bagefter, og udviklingen forsinkes.",
    mitigation: "Styregruppen er bredt sammensat, så det, der bringes op, kan besluttes.",
    changeNote: "Ingen ændring.",
    probability: 2,
    impact: 6,
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
    title: "det gamle system skal videreudvikles, fordi forretningen ikke kan vente på det nye",
    consequence:
      "der bruges penge og kræfter på et system, der skal udfases, og overgangen bliver sværere.",
    mitigation:
      "Det mest kritiske bygges først, og ændringer i det gamle system holdes på et minimum.",
    changeNote: "Ingen ændring.",
    probability: 6,
    impact: 5,
  },
  {
    title: "det nye system ikke er klar, før driftsaftalen på det gamle system udløber",
    consequence: "aftalen skal forlænges til en ukendt, formentlig højere pris.",
    mitigation:
      "Funktionalitet prioriteres, så det mindst kritiske er det, der eventuelt mangler, når der skiftes.",
    changeNote: "Sandsynligheden er hævet efter det opdaterede forecast.",
    probability: 6,
    impact: 8,
  },
  {
    title: "høje krav fra afdelingerne og et begrænset lokalt mandat gør beslutninger langsomme",
    consequence: "lange afklaringsforløb og ombygning af funktionalitet undervejs.",
    mitigation:
      "Projektgruppen har mandat til at træffe beslutninger på tværs; kun de store eskaleres.",
    changeNote: "Ingen ændring.",
    probability: 4,
    impact: 5,
  },
  {
    title: "migrering af data fra det gamle system er mere omfattende end forventet",
    consequence: "opgaven tager længere tid; i værste fald må dele flyttes manuelt.",
    mitigation: "Data migreres løbende, så problemer opdages så tidligt som muligt.",
    changeNote: "Ingen ændring.",
    probability: 5,
    impact: 6,
  },
  {
    title:
      "vi for sent opdager, at nødvendig funktionalitet mangler for at overtage fra det gamle system",
    consequence:
      "overgangen bliver dyrere og længere, eller der skiftes til en mangelfuld løsning.",
    mitigation: "Løsningerne valideres med brugerne så tidligt og så ofte som muligt.",
    changeNote: "Ingen ændring.",
    probability: 3,
    impact: 7,
  },
  {
    title: "der ikke er ressourcer nok til databeskyttelse og informationssikkerhed i udviklingen",
    consequence: "der bygges løsninger, der ikke overholder reglerne, eller som er sårbare.",
    mitigation:
      "En dedikeret databeskyttelsesansvarlig er tæt på teamet, og løsningen sikkerhedstestes af en tredjepart.",
    changeNote: "En sikkerhedskonsulent er ansat og har taget over efter en fratrædelse.",
    probability: 4,
    impact: 8,
  },
  {
    title: "nøglepersoner stopper, og viden forsvinder",
    consequence: "krav overses og opdages sent, og domæneviden går tabt.",
    mitigation:
      "Systematisk overdragelse, dokumentation i et fælles arkiv og arbejde i teams frem for enkeltpersoner.",
    changeNote: "To nøglepersoner er stoppet siden sidst; en ny teamleder er udpeget.",
    probability: 6,
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
  {
    title: "ukritisk brug af AI-værktøjer forringer kvaliteten og øger byrden på test og review",
    consequence: "teknisk gæld, mere fejlretning og overbelastede seniorudviklere.",
    mitigation: "AI-værktøjer vurderes grundigt og bruges selektivt, fx til test og designforslag.",
    changeNote: "Ny.",
    probability: 4,
    impact: 5,
  },
  {
    title: "forbrugsbaserede AI-licenser gør projektøkonomien uforudsigelig",
    consequence: "budgetoverskridelser og en lang binding til leverandørernes priser.",
    mitigation: "Forbruget følges månedligt og har et loft.",
    changeNote: "Ny.",
    probability: 3,
    impact: 4,
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
      "Oprettelse af kunder under 18 år er sjælden og håndteres i dag manuelt uden en beskrevet proces.",
    background:
      "Der er ingen kunder under 18 år i dag, og der har kun været en håndfuld de seneste år.",
    keyPoints:
      "Det er enklere teknisk og administrativt, hvis man ikke kan oprettes før 18 år. Muligheden kan bygges senere.",
    nextSteps:
      "Styregruppen beslutter, om det skal være muligt, og i så fald hvem der afklarer regler for alder og samtykke.",
    status: "open",
  },
  {
    title: "Skal særrabatten ved deltid videreføres?",
    problem:
      "En særregel giver kunder på deltid en lille rabat, men kræver oplysninger, der skal indhentes og vedligeholdes.",
    background: "Omkring 450 kunder får i dag rabatten automatisk.",
    keyPoints:
      "Uden særreglen er der mindre logik at bygge og vedligeholde, og prismodellen bliver mere gennemsigtig.",
    nextSteps:
      "Styregruppen beslutter, om reglen skal med. Hvis ikke, planlægges en kontrolleret overgang for de berørte kunder.",
    status: "open",
  },
  {
    title: "Må persondata fra produktion bruges som testdata?",
    problem:
      "Testmiljøet indeholder personhenførbare data, og det er ikke afklaret, om de må bruges i udviklingen.",
    background:
      "Teamet har brug for data, der afspejler de reelle forhold, for at kunne bygge løsningen rigtigt.",
    keyPoints:
      "Et alternativ med maskerede data vil tage tid og kan forsinke projektet; at fortsætte kræver, at risiciene accepteres.",
    nextSteps: "Styregruppen beslutter retningen sammen med den databeskyttelsesansvarlige.",
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
    title: "Tilgængelighed",
    when: "Februar",
    decision: "Almindelig HTML og de lavthængende frugter; ingen særskilt indsats.",
    effect: "simplifying",
  },
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
  { title: "Kunder under 18 år", when: "August", decision: "Afventer.", effect: "pending" },
  { title: "Særrabat ved deltid", when: "August", decision: "Afventer.", effect: "pending" },
];

export const DEMO_STATUS_TEXT =
  "Vi har nået milepælen om en teknisk funktionel applikation, der kan vise katalogdata, og har lagt de grundlæggende tekniske forudsætninger: pipeline, validering og styring af, hvem der må se hvad. Det visuelle udtryk og de grundlæggende interaktionsmønstre er ikke nået så langt som håbet og fortsætter i dette kvartal. En ny udvikler er startet, og to mere ventes i gang i vinter.";

export const DEMO_CHANGE_TEXT =
  "Vi antog i starten af året, at teamet i dette kvartal ville være dobbelt så stort. Det er det endnu ikke, så en del af efterårets arbejde er rykket til vinter, og vinteren er tæt på fuld. Det opdaterede forecast flytter fakturering lidt senere. En re-estimering med hele teamet er planlagt i dette kvartal, og roadmappet opdateres bagefter.";
